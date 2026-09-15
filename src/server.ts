import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import os from "node:os";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerCallbacks {
  onUserMessage: (text: string) => void | Promise<void>;
  onAbort: () => void | Promise<void>;
  getInitialState: () => {
    model?: string;
    isIdle: boolean;
    history: any[];
    sessionFile?: string;
  };
}

export interface AnywhereServer {
  port: number;
  token: string;
  localUrl: string;
  lanUrl: string | null;
  broadcast: (data: any) => void;
  close: () => Promise<void>;
}

export function getLanIp(): string | null {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const iface = interfaces[name];
    if (!iface) continue;
    for (const info of iface) {
      if (info.family === "IPv4" && !info.internal && info.address.startsWith("192.168.") || info.address.startsWith("10.") || info.address.startsWith("172.")) {
        return info.address;
      }
    }
  }
  return null;
}

export function startServer(port: number = 0, token: string, callbacks: ServerCallbacks): Promise<AnywhereServer> {
  return new Promise((resolve, reject) => {
    // 静态资源根目录：兼容 dev (src/public) 与 build (dist/public)
    let publicDir = path.join(__dirname, "public");
    if (!fs.existsSync(publicDir)) {
      publicDir = path.join(__dirname, "../src/public");
    }

    const server = http.createServer((req, res) => {
      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const reqPath = parsedUrl.pathname;

      // 仅允许带 token 访问或静态前端页面
      const reqToken = parsedUrl.searchParams.get("token");

      if (reqPath === "/" || reqPath === "/index.html") {
        const filePath = path.join(publicDir, "index.html");
        if (fs.existsSync(filePath)) {
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-cache",
          });
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      // 静态资源兜底
      const safePath = path.normalize(reqPath).replace(/^(\.\.[\/\\])+/, "");
      const filePath = path.join(publicDir, safePath);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath);
        const mimeTypes: Record<string, string> = {
          ".html": "text/html",
          ".js": "application/javascript",
          ".css": "text/css",
          ".json": "application/json",
          ".png": "image/png",
          ".svg": "image/svg+xml",
        };
        res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
        fs.createReadStream(filePath).pipe(res);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    const wss = new WebSocketServer({ noServer: true });
    const clients = new Set<WebSocket>();

    server.on("upgrade", (req, socket, head) => {
      const parsedUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const reqToken = parsedUrl.searchParams.get("token");

      if (reqToken !== token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req);
      });
    });

    wss.on("connection", (ws: WebSocket) => {
      clients.add(ws);

      // 发送首屏初始化状态
      try {
        const initState = callbacks.getInitialState();
        ws.send(JSON.stringify({
          type: "init",
          ...initState,
        }));
      } catch (err) {
        console.error("[pi-anywhere] Error sending init state:", err);
      }

      ws.on("message", async (data: Buffer | string) => {
        try {
          const payload = JSON.parse(data.toString());
          if (payload.type === "send_message" && typeof payload.text === "string") {
            await callbacks.onUserMessage(payload.text);
          } else if (payload.type === "abort") {
            await callbacks.onAbort();
          } else if (payload.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
          }
        } catch (e) {
          console.error("[pi-anywhere] Malformed client message:", e);
        }
      });

      ws.on("close", () => {
        clients.delete(ws);
      });

      ws.on("error", () => {
        clients.delete(ws);
      });
    });

    server.listen(port, "0.0.0.0", () => {
      const actualPort = (server.address() as any).port;
      const lanIp = getLanIp();
      const localUrl = `http://127.0.0.1:${actualPort}/?token=${token}`;
      const lanUrl = lanIp ? `http://${lanIp}:${actualPort}/?token=${token}` : null;

      const broadcast = (data: any) => {
        const msg = JSON.stringify(data);
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(msg);
          }
        }
      };

      const close = async () => {
        for (const ws of clients) {
          try {
            ws.close();
          } catch {}
        }
        clients.clear();
        await new Promise<void>((r) => server.close(() => r()));
      };

      resolve({
        port: actualPort,
        token,
        localUrl,
        lanUrl,
        broadcast,
        close,
      });
    });

    server.on("error", reject);
  });
}

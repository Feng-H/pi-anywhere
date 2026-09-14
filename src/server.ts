import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import { TerminalManager } from "./terminal.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerOptions {
  port: number;
  pin: string;
  terminalManager: TerminalManager;
}

export function createServer(options: ServerOptions) {
  const { port, pin, terminalManager } = options;

  const server = http.createServer((req, res) => {
    // Serve Web Terminal static files
    let filePath = path.join(__dirname, "public", "index.html");
    if (!fs.existsSync(filePath)) {
      // Dev mode fallback
      filePath = path.join(__dirname, "../src/public/index.html");
    }

    if (req.url === "/" || req.url?.startsWith("/?")) {
      fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("500 Internal Server Error");
          return;
        }
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(data);
      });
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("404 Not Found");
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    if (url.pathname === "/ws") {
      const clientToken = url.searchParams.get("token");
      if (clientToken !== pin) {
        // Unauthorized
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    // Start terminal if not already started
    terminalManager.start();

    // Replay buffer on reconnect
    const history = terminalManager.getHistory();
    if (history) {
      ws.send(history);
    }

    const dataListener = (chunk: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(chunk);
      }
    };

    terminalManager.onData(dataListener);

    ws.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "data") {
          terminalManager.write(msg.data);
        } else if (msg.type === "resize") {
          terminalManager.resize(msg.cols, msg.rows);
        }
      } catch {
        // Plain string fallback
        terminalManager.write(raw.toString());
      }
    });

    ws.on("close", () => {
      terminalManager.removeDataListener(dataListener);
    });
  });

  return {
    server,
    listen: () =>
      new Promise<number>((resolve) => {
        server.listen(port, "127.0.0.1", () => {
          const addr = server.address();
          const actualPort = typeof addr === "object" && addr ? addr.port : port;
          resolve(actualPort);
        });
      }),
  };
}

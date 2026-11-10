import { spawn, ChildProcess } from "node:child_process";
import { bin } from "cloudflared";

export interface TunnelHooks {
  /** 隧道意外退出并成功自动重连后回调（URL 已变化，手机需重新扫码） */
  onAutoRestart?: (newUrl: string, restartCount: number) => void;
  /** 自动重连也失败时回调（公网地址失效，局域网地址不受影响） */
  onGiveUp?: () => void;
}

export interface TunnelResult {
  url: string;
  stop: () => void;
}

/**
 * 提高受限网络（如国内运营商掐 UDP）下的连通性：
 * - 主路径强制 http2 + IPv4（TCP 443，穿墙能力远强于默认 QUIC/UDP 7844）
 * - 失败时回退默认 QUIC 协议
 * - 必须等到 "Registered tunnel connection"（边缘连接注册成功）才返回，
 *   避免"URL 已分配但未注册"时扫码得到 Cloudflare Error 1033
 * - 隧道进程意外退出时自动重连（快速隧道域名会变，重连后回调通知刷新二维码）
 */
const HTTP2_ARGS = ["--protocol", "http2", "--edge-ip-version", "4"];
const MAX_RESTARTS = 3;
const ATTEMPT_TIMEOUT_MS = 30_000;

function attempt(localPort: number, extraArgs: string[]): Promise<{ proc: ChildProcess; url: string }> {
  return new Promise((resolve, reject) => {
    const args = ["tunnel", "--url", `http://127.0.0.1:${localPort}`, "--no-autoupdate", ...extraArgs];
    const proc = spawn(bin, args, { stdio: ["ignore", "pipe", "pipe"] });

    let url: string | null = null;
    let registered = false;
    let done = false;

    const finish = (err?: Error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (err) {
        try { proc.kill(); } catch {}
        reject(err);
      } else {
        resolve({ proc, url: url! });
      }
    };

    const timer = setTimeout(() => {
      if (url && registered) return finish();
      finish(new Error(
        url
          ? "tunnel URL assigned but edge connection never registered (network may be blocking Cloudflare)"
          : "Timeout waiting for Cloudflare Tunnel to establish (30s)",
      ));
    }, ATTEMPT_TIMEOUT_MS);

    const handleOutput = (data: Buffer) => {
      const text = data.toString();
      // 匹配形如 https://word-word-word-word.trycloudflare.com 的临时域名（排除 api.trycloudflare.com）
      const matches = text.match(/https:\/\/(?!api\.)[a-z0-9-]+\.trycloudflare\.com/g);
      if (matches) url = matches[0];
      if (/Registered tunnel connection/.test(text)) registered = true;
      if (url && registered) finish();
    };

    proc.stdout?.on("data", handleOutput);
    proc.stderr?.on("data", handleOutput);
    proc.on("error", (err) => finish(err));
    proc.on("exit", (code) => {
      if (!done) finish(new Error(`cloudflared exited early with code ${code}`));
    });
  });
}

export async function startTunnel(localPort: number, hooks: TunnelHooks = {}): Promise<TunnelResult> {
  let lastArgs = HTTP2_ARGS;
  let current: { proc: ChildProcess; url: string };

  try {
    current = await attempt(localPort, HTTP2_ARGS);
  } catch (http2Err: any) {
    console.warn(`[pi-anywhere] http2 隧道建立失败（${http2Err?.message || http2Err}），回退默认 QUIC 协议重试...`);
    current = await attempt(localPort, []);
    lastArgs = [];
  }

  let stopped = false;
  let restarts = 0;
  let proc = current.proc;

  const attach = (p: ChildProcess) => {
    p.on("exit", async () => {
      if (stopped) return;
      restarts++;
      if (restarts > MAX_RESTARTS) {
        hooks.onGiveUp?.();
        return;
      }
      console.warn(`[pi-anywhere] 检测到公网隧道进程意外退出，正在自动重连 (${restarts}/${MAX_RESTARTS})...`);
      try {
        const r = await attempt(localPort, lastArgs);
        if (stopped) {
          // 重连期间用户已执行 /anywhere stop，立即回收新进程
          try { r.proc.kill(); } catch {}
          return;
        }
        proc = r.proc;
        attach(proc);
        hooks.onAutoRestart?.(r.url, restarts);
      } catch {
        hooks.onGiveUp?.();
      }
    });
  };
  attach(proc);

  return {
    url: current.url,
    stop: () => {
      stopped = true;
      try { proc.kill("SIGTERM"); } catch {}
    },
  };
}

import { Tunnel } from "cloudflared";

export interface TunnelResult {
  url: string;
  stop: () => void;
}

export function startTunnel(localPort: number): Promise<TunnelResult> {
  return new Promise((resolve, reject) => {
    const localUrl = `http://127.0.0.1:${localPort}`;
    const tunnel = Tunnel.quick(localUrl);

    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        tunnel.stop();
        reject(new Error("Timeout waiting for Cloudflare Tunnel to establish (15s)"));
      }
    }, 15000);

    tunnel.once("url", (url: string) => {
      resolved = true;
      clearTimeout(timeout);
      resolve({
        url,
        stop: () => tunnel.stop(),
      });
    });

    tunnel.once("error", (err: Error) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(err);
      }
    });

    tunnel.on("exit", (code: number | null) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Cloudflare tunnel exited prematurely with code ${code}`));
      }
    });
  });
}

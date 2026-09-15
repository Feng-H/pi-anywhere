import { spawn } from "node:child_process";
import { bin } from "cloudflared";
export function startTunnel(localPort) {
    return new Promise((resolve, reject) => {
        const localUrl = `http://127.0.0.1:${localPort}`;
        const proc = spawn(bin, ["tunnel", "--url", localUrl], {
            stdio: ["ignore", "pipe", "pipe"],
        });
        let resolved = false;
        const timeout = setTimeout(() => {
            if (!resolved) {
                proc.kill();
                reject(new Error("Timeout waiting for Cloudflare Tunnel to establish (25s)"));
            }
        }, 25000);
        const handleOutput = (data) => {
            const text = data.toString();
            // 匹配真正形如 https://word-word-word-word.trycloudflare.com 的临时域名
            // 必须排除 api.trycloudflare.com
            const matches = text.match(/https:\/\/([a-z0-9-]+)\.trycloudflare\.com/g);
            if (matches) {
                for (const matchUrl of matches) {
                    if (!matchUrl.includes("api.trycloudflare.com")) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve({
                            url: matchUrl,
                            stop: () => {
                                try {
                                    proc.kill("SIGTERM");
                                }
                                catch { }
                            },
                        });
                        return;
                    }
                }
            }
        };
        proc.stdout?.on("data", handleOutput);
        proc.stderr?.on("data", handleOutput);
        proc.on("error", (err) => {
            if (!resolved) {
                clearTimeout(timeout);
                reject(err);
            }
        });
        proc.on("exit", (code) => {
            if (!resolved) {
                clearTimeout(timeout);
                reject(new Error(`Cloudflare tunnel process exited early with code ${code}`));
            }
        });
    });
}

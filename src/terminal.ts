import { spawn, IPty } from "node-pty";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export interface TerminalManagerOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  cols?: number;
  rows?: number;
  /** tmux session name: attach-or-create this session so desktop & phone share the same agent */
  tmuxSession?: string;
}

/**
 * Resolve a bare command name to an absolute executable path by searching PATH
 * manually. posix_spawnp's own PATH lookup can fail in some environments
 * (aliases, restricted env), so we do the resolution ourselves and pass an
 * absolute path to node-pty.
 */
export function resolveCommand(cmd: string): string | null {
  if (cmd.includes("/")) {
    return path.resolve(cmd);
  }
  const sep = os.platform() === "win32" ? ";" : ":";
  const pathDirs = (process.env.PATH || "").split(sep);
  for (const dir of pathDirs) {
    if (!dir) continue;
    const candidate = path.join(dir, cmd);
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch {
      // keep searching
    }
  }
  return null;
}

/**
 * Self-heal: node-pty ships a `spawn-helper` binary that must be executable.
 * Some npm configurations block install scripts, leaving spawn-helper at mode
 * 644, which makes every pty.spawn fail with "posix_spawnp failed". Fix it
 * automatically at startup.
 */
export function ensurePtyHelperExecutable(): void {
  try {
    const ptyPkgRoot = path.dirname(require.resolve("node-pty/package.json"));
    const helper = path.join(
      ptyPkgRoot,
      "prebuilds",
      `${process.platform}-${process.arch}`,
      "spawn-helper"
    );
    if (fs.existsSync(helper)) {
      try {
        fs.accessSync(helper, fs.constants.X_OK);
      } catch {
        fs.chmodSync(helper, 0o755);
      }
    }
  } catch {
    // best-effort only
  }
}

export class TerminalManager {
  private ptyProcess: IPty | null = null;
  private outputBuffer: string[] = [];
  private listeners: ((data: string) => void)[] = [];
  private command: string;
  private args: string[];
  public mode: "tmux" | "direct" = "direct";

  constructor(private options: TerminalManagerOptions = {}) {
    this.command = options.command || "pi";
    this.args = options.args ?? ["-c"];
  }

  public start(): IPty {
    if (this.ptyProcess) {
      return this.ptyProcess;
    }

    ensurePtyHelperExecutable();

    const cols = this.options.cols || 80;
    const rows = this.options.rows || 24;
    const cwd = this.options.cwd || process.cwd();
    const env = {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
    };

    // Preferred mode: attach-or-create a tmux session. Desktop terminal and
    // the phone browser then share the SAME agent session — continue the
    // ongoing conversation from anywhere.
    let file: string | null = null;
    let args: string[] = [];

    if (this.options.tmuxSession) {
      const tmux = resolveCommand("tmux");
      if (tmux) {
        file = tmux;
        args = ["new", "-A", "-s", this.options.tmuxSession];
        const agentCmd = resolveCommand(this.command);
        if (agentCmd) {
          // Command is only used when the session is first created;
          // on later attaches tmux ignores it and attaches to the running agent.
          args.push(agentCmd, ...this.args);
        }
        this.mode = "tmux";
      }
    }

    // Fallback: spawn the agent directly.
    if (!file) {
      file = resolveCommand(this.command);
      args = [...this.args];
      this.mode = "direct";
    }

    try {
      if (!file) {
        throw new Error(`command "${this.command}" not found in PATH`);
      }
      this.ptyProcess = spawn(file, args, {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env,
      });
    } catch (err) {
      // Never crash the whole server: fall back to the user's login shell and
      // print a clear message so the remote user knows what happened.
      const shell = process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "/bin/bash");
      const msg =
        `\r\n\x1b[31m[pi-anywhere] Failed to start "${file}": ${(err as Error).message}\x1b[0m\r\n` +
        `\x1b[33m[pi-anywhere] Falling back to ${shell}.\x1b[0m\r\n`;
      this.outputBuffer.push(msg);
      for (const listener of this.listeners) {
        listener(msg);
      }
      this.ptyProcess = spawn(shell, [], {
        name: "xterm-256color",
        cols,
        rows,
        cwd,
        env,
      });
    }

    this.ptyProcess.onData((data: string) => {
      this.outputBuffer.push(data);
      if (this.outputBuffer.length > 500) {
        this.outputBuffer.shift();
      }
      for (const listener of this.listeners) {
        listener(data);
      }
    });

    this.ptyProcess.onExit(({ exitCode, signal }) => {
      // Auto-restart the agent if it exits, so the web terminal stays usable.
      const msg = `\r\n\x1b[33m[Process exited (code ${exitCode}, signal ${signal}). Restarting in 1s...]\x1b[0m\r\n`;
      for (const listener of this.listeners) {
        listener(msg);
      }
      this.ptyProcess = null;
      setTimeout(() => {
        if (this.listeners.length > 0) {
          this.start();
        }
      }, 1000);
    });

    return this.ptyProcess;
  }

  public write(data: string) {
    if (this.ptyProcess) {
      this.ptyProcess.write(data);
    }
  }

  public resize(cols: number, rows: number) {
    if (this.ptyProcess) {
      try {
        this.ptyProcess.resize(cols, rows);
      } catch {
        // ignore resize race condition
      }
    }
  }

  public onData(callback: (data: string) => void) {
    this.listeners.push(callback);
  }

  public removeDataListener(callback: (data: string) => void) {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  public getHistory(): string {
    return this.outputBuffer.join("");
  }

  public kill() {
    if (this.ptyProcess) {
      this.ptyProcess.kill();
      this.ptyProcess = null;
    }
    this.listeners = [];
  }
}

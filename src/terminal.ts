import { spawn, IPty } from "node-pty";
import os from "node:os";

export interface TerminalManagerOptions {
  command?: string;
  args?: string[];
  cwd?: string;
  cols?: number;
  rows?: number;
}

export class TerminalManager {
  private ptyProcess: IPty | null = null;
  private outputBuffer: string[] = [];
  private maxBufferSize = 50000;
  private listeners: ((data: string) => void)[] = [];

  constructor(private options: TerminalManagerOptions = {}) {}

  public start(): IPty {
    if (this.ptyProcess) {
      return this.ptyProcess;
    }

    const shell = process.env.SHELL || (os.platform() === "win32" ? "powershell.exe" : "bash");
    const cmd = this.options.command || "pi";
    const args = this.options.args || ["-c"];

    // Spawn the requested command or fall back to bash running the command
    this.ptyProcess = spawn(cmd, args, {
      name: "xterm-256color",
      cols: this.options.cols || 80,
      rows: this.options.rows || 24,
      cwd: this.options.cwd || process.cwd(),
      env: {
        ...process.env,
        TERM: "xterm-256color",
        COLORTERM: "truecolor",
      },
    });

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
      const msg = `\r\n\x1b[33m[Process exited with code ${exitCode}, signal ${signal}]\x1b[0m\r\n`;
      for (const listener of this.listeners) {
        listener(msg);
      }
      this.ptyProcess = null;
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
      } catch (err) {
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
  }
}

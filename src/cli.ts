#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
import qrcode from "qrcode-terminal";
import crypto from "node:crypto";
import { TerminalManager } from "./terminal.js";
import { createServer } from "./server.js";
import { startTunnel, TunnelResult } from "./tunnel.js";

const program = new Command();

program
  .name("pi-anywhere")
  .description("Instant remote web access for Pi Agent behind NAT / firewalls via Cloudflare Tunnel")
  .version("0.1.0")
  .option("-p, --port <number>", "Local port to bind", "0")
  .option("--pin <string>", "Custom security PIN / password")
  .option("--no-tunnel", "Do not create Cloudflare Tunnel (local network only)")
  .option("--cmd <command>", "Command to run", "pi")
  .option("--args <args...>", "Arguments for the command", ["-c"])
  .allowUnknownOption(true)
  .action(async (options) => {
    // Generate 6-digit random PIN if not specified
    const pin = options.pin || crypto.randomInt(100000, 999999).toString();
    const port = parseInt(options.port, 10) || 0;

    console.log(chalk.bold.cyan("\n🚀 Starting Pi Anywhere...\n"));

    const terminalManager = new TerminalManager({
      command: options.cmd,
      args: options.args,
    });

    const { server, listen } = createServer({
      port,
      pin,
      terminalManager,
    });

    const actualPort = await listen();
    console.log(chalk.gray(`✓ Local web server listening on http://127.0.0.1:${actualPort}`));

    let publicUrl = `http://127.0.0.1:${actualPort}`;
    let tunnelInstance: TunnelResult | null = null;

    if (options.tunnel) {
      process.stdout.write(chalk.yellow("⏳ Creating secure Cloudflare Tunnel (No public IP needed)... "));
      try {
        tunnelInstance = await startTunnel(actualPort);
        publicUrl = tunnelInstance.url;
        process.stdout.write(chalk.green("Done!\n\n"));
      } catch (err: any) {
        process.stdout.write(chalk.red("Failed!\n"));
        console.warn(chalk.yellow(`⚠ Tunnel setup failed: ${err.message}`));
        console.warn(chalk.gray("Falling back to local access only.\n"));
      }
    }

    const accessUrlWithToken = `${publicUrl}/?token=${pin}`;

    console.log(chalk.bold.green("┌────────────────────────────────────────────────────────────┐"));
    console.log(chalk.bold.green("│                  🌐 Pi Anywhere is Online                  │"));
    console.log(chalk.bold.green("└────────────────────────────────────────────────────────────┘\n"));

    console.log(chalk.bold("  🔗 访问网址 (Web URL): ") + chalk.underline.cyan(accessUrlWithToken));
    console.log(chalk.bold("  🔑 安全 PIN 码:        ") + chalk.bold.yellow(pin));
    console.log(chalk.bold("  💻 挂载的命令:         ") + chalk.magenta(`${options.cmd} ${options.args.join(" ")}`));
    console.log();

    console.log(chalk.bold("  📱 手机扫码直达 (Scan to Connect):"));
    qrcode.generate(accessUrlWithToken, { small: true }, (qr) => {
      console.log(qr);
    });

    console.log(chalk.gray("提示: 按 Ctrl+C 随时关闭服务并断开连接。\n"));

    const shutdown = () => {
      console.log(chalk.yellow("\n🛑 Shutting down Pi Anywhere..."));
      if (tunnelInstance) {
        tunnelInstance.stop();
      }
      terminalManager.kill();
      server.close(() => {
        process.exit(0);
      });
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  });

program.parse(process.argv);

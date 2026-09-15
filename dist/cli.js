#!/usr/bin/env node
import { Command } from "commander";
import chalk from "chalk";
const program = new Command();
program
    .name("pi-anywhere")
    .description("Remote mobile Web Chat interface for Pi Coding Agent via Cloudflare Tunnel")
    .version("0.2.0")
    .action(() => {
    console.log("\n" + chalk.green.bold("📱 Pi-Anywhere 2.0 (Native Pi Extension)"));
    console.log(chalk.dim("───────────────────────────────────────────────────"));
    console.log(chalk.white("pi-anywhere 是 Pi Agent 的官方推荐远程接入扩展。"));
    console.log(chalk.cyan("使用姿势："));
    console.log(chalk.yellow("  1. 在 Pi 会话中直接输入：") + chalk.white.bold("/anywhere"));
    console.log(chalk.white("     终端将打印二维码与临时公网安全访问 URL。"));
    console.log(chalk.yellow("  2. 用手机扫码或浏览器打开："));
    console.log(chalk.white("     立即享受全功能、丝滑流式同步、带 Markdown 渲染与工具折叠的移动端 Web 工作台！"));
    console.log(chalk.dim("───────────────────────────────────────────────────\n"));
});
program.parse(process.argv);

# pi-anywhere 🚀

[![npm version](https://img.shields.io/npm/v/pi-anywhere.svg?color=blue)](https://www.npmjs.com/package/pi-anywhere)
[![npm downloads](https://img.shields.io/npm/dt/pi-anywhere.svg?color=green)](https://www.npmjs.com/package/pi-anywhere)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![pi-package](https://img.shields.io/badge/pi-package-00b57a)](https://pi.dev/packages)

**[English](#why-pi-anywhere-20) | [简体中文](#中文说明)**

> **Native remote mobile Web Chat for the [pi](https://pi.dev) coding agent, via Cloudflare Tunnel.**

## Why Pi-Anywhere 2.0?

Traditional remote-terminal solutions (SSH / web terminals) are painful on a phone: tiny fonts, unreachable keys, keyboard covering the screen, garbled ANSI codes.

**Pi-Anywhere 2.0 is a native pi extension** — your phone becomes a remote *Chat UI* for the **same pi instance** running on your computer:

- 🚫 **No node-pty, no tmux, no xterm.js** — zero native compilation, zero system-tool dependencies. Pure Node.js/TypeScript.
- 📱 **Mobile-first Chat interface** — touch-optimized: Markdown rendering, code blocks, auto-growing input box.
- ⚡ **True real-time mirroring** — type on the computer, the phone streams it live; type on the phone, the computer-side agent starts working instantly; one tap "⏹ Stop" aborts the current run.
- 🤖 **Switch models from your phone** — tap the model tag in the header to open a bottom-sheet model picker (grouped by provider); selection syncs back to the desktop pi session, and desktop-side switches mirror to the phone too.
- 🛠️ **Collapsible tool-call panels** — `bash` / `edit` / `read` executions render as neat collapsed cards; tap to expand details.
- 🌐 **Dual-channel access** — a public Cloudflare Quick Tunnel URL (works on cellular) plus a LAN URL (lowest latency on the same Wi-Fi).

## Install

Install via **npm** (recommended):

```bash
pi install npm:pi-anywhere
```

Or install directly from **GitHub**:

```bash
pi install git:github.com/Feng-H/pi-anywhere
```

## Usage

Inside any pi session:

```text
/anywhere          # start — prints QR code + public/LAN/local URLs
/anywhere status   # re-print the URLs
/anywhere stop     # shut down server + tunnel
```

Scan the QR code with your phone, and a mobile Web Chat opens with your **current session history** (Markdown + tool panels rendered). Everything you do on either side streams to the other in real time. The service and tunnel are destroyed automatically when pi exits.

## Security

- Random one-time token per start — all URLs embed `?token=...`; WebSocket upgrade rejects mismatches.
- Lifecycle-bound: nothing survives pi's shutdown. No lingering background processes.

## How it works

Extension-API event streams drive the Web UI:

| pi event | Web Chat behavior |
|---|---|
| `message_start/update/end` | bubbles with live typewriter streaming |
| `tool_call` / `tool_result` | collapsible tool panels |
| `agent_start` / `agent_settled` | status dot + send/abort button toggle |
| `model_select` | header model tag updates in real-time |

Uplink channels: `pi.sendUserMessage()` (phone messages, including `/commands`), `ctx.abort()` (the ⏹ button), and `pi.setModel()` (bottom-sheet model picker).

---

## 中文说明

> **基于 Cloudflare Tunnel 的 pi 原生移动端远程 Web Chat。**

### 为什么需要 Pi-Anywhere 2.0？

市面上传统的远程终端方案（SSH / Web Terminal）在手机屏幕上体验极其痛苦：字体小、按键难点、键盘遮挡屏幕、ANSI 转义码混乱。

**Pi-Anywhere 2.0 采用原生扩展架构**——手机是电脑上**同一个 pi 实例**的远程 Chat 界面：

- 🚫 **彻底抛弃 node-pty & tmux & xterm.js**：无 C++ 编译依赖、无系统工具限制，轻量即插即用；
- 📱 **原生级移动端 Chat 界面**：专为触屏优化，Markdown 排版、代码高亮、弹性自适应大输入框；
- ⚡ **真正的实时同屏流式互动**：电脑敲字手机秒同步；手机发送指令电脑端立即干活；手机端一键"⏹ 停止"实时打断任务；
- 🤖 **手机端直接切换模型**：点击顶栏模型标签，底部弹出模型选择器（按 provider 分组）；手机选中的模型同步应用到电脑端 pi 会话，电脑端切换也会实时镜像到手机；
- 🛠️ **工具调用智能折叠**：Agent 执行 `bash` / `edit` / `read` 时自动折叠显示，点开才展开详情，不刷屏；
- 🌐 **双通道秒级接入**：Cloudflare 临时公网穿透 URL（蜂窝网络可用）+ 局域网直连 URL（同 Wi-Fi 超低延迟）。

### 安装方式

通过 **npm 官方镜像** 安装（推荐）：

```bash
pi install npm:pi-anywhere
```

或者直接从 **GitHub** 安装：

```bash
pi install git:github.com/Feng-H/pi-anywhere
```

- npm 官方包页面：[https://www.npmjs.com/package/pi-anywhere](https://www.npmjs.com/package/pi-anywhere)

### 使用

在任意 pi 会话中：

```text
/anywhere          # 启动 —— 打印二维码与公网/局域网/本地 URL
/anywhere status   # 重新查看 URL
/anywhere stop     # 关闭服务与隧道
```

手机扫码即打开移动端 Web Chat,**当前会话历史**自动加载（Markdown + 工具面板渲染）。两端任何操作都实时同步到另一端。pi 退出时服务与隧道自动销毁。

### 安全性

- 每次启动生成随机一次性 token，所有 URL 内嵌 `?token=...`，WebSocket 升级校验不匹配直接拒绝；
- 生命周期绑定：pi 关闭即全部销毁，不留后台进程。

### 工作原理

Extension API 事件流直接驱动 Web UI：`message_start/update/end` → 气泡与打字机流式；`tool_call/result` → 折叠工具面板；`agent_start/settled` → 状态灯与发送/打断按钮切换；`model_select` → 顶栏模型标签实时同屏同步。上行三条通道：`pi.sendUserMessage()`（手机消息，含 `/命令`）、`ctx.abort()`（⏹ 打断）以及 `pi.setModel()`（手机端抽屉切模型）。

## License

MIT

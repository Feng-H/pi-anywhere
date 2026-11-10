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
- 🧠 **Thinking level control** — a 🧠 tag (reasoning models only) opens a six-level picker; changes sync both ways with the desktop session.
- 🖼️ **Send images** — attach up to 4 photos/screenshots (auto-downscaled to ≤1568px) alongside your message; images in history are rendered too (pi ≥ 1.x).
- 📊 **Context usage bar + one-tap compact** — live `tokens / window · %` under the header (amber ≥60%, red ≥80%) with a compact button that triggers `ctx.compact()`.
- 🛠️ **Collapsible tool-call panels** — `bash` / `edit` / `read` executions render as neat collapsed cards; tap to expand details.
- 🌿 **Branch switching from your phone** — a 🔀 button opens the session tree (indented, latest 100 entries); tap any entry to switch branches. ✨ starts a new session; the old one stays reachable via the tree.
- 🔄 **Survives session switches** — `/new`, `/resume`, `/fork`, `/reload` in the terminal auto-restart the service (same port + token), so LAN phones reconnect automatically; a fresh public QR is printed.
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
/anywhere restart  # stop and start again
/anywhere stop     # shut down server + tunnel
```

Scan the QR code with your phone, and a mobile Web Chat opens with your **current session history** (Markdown + tool panels rendered). Everything you do on either side streams to the other in real time. The service and tunnel are destroyed automatically when pi exits.

Notes:

- **Compatibility**: works with both pi 0.8x and pi 1.x (tested against 1.5.1).
- Messages sent from the phone while the agent is running are **queued** and delivered when the current run finishes (pi ≥ 1.2 behavior).
- Session switches (`/new`, `/resume`, `/fork`) auto-restart the service: LAN phones reconnect automatically (same port/token); the public URL changes and a new QR is printed. Phones connected via the old public URL need to re-scan; `/anywhere stop` disables auto-restart.
- The tunnel prefers **http2 over TCP 443** (more reliable than QUIC on restricted networks), waits until the edge connection is registered before printing the QR code, and **auto-reconnects** if the tunnel process dies (a new URL is printed — re-scan). If you ever see Cloudflare *Error 1033*, it means the tunnel was unreachable at that moment; use the LAN URL or re-run `/anywhere`.

## Security

- Random one-time token per start — all URLs embed `?token=...`; WebSocket upgrade rejects mismatches.
- Lifecycle-bound: nothing survives pi's shutdown. No lingering background processes.

## How it works

Extension-API event streams drive the Web UI:

| pi event | Web Chat behavior |
|---|---|
| `message_start/update/end` | bubbles with live typewriter streaming |
| `tool_call` / `tool_result` / `tool_execution_end` | collapsible tool panels (blocked/aborted calls included) |
| `agent_start` / `agent_settled` | status dot + send/abort button toggle + abort notice |
| `model_select` / `thinking_level_select` | header model & thinking tags update in real-time |
| `session_info_changed` | browser tab title shows the session name |
| `ui_prompt_start/end` | "waiting for terminal" status hint |

Uplink channels: `pi.sendUserMessage()` (phone messages, images, `/commands`), `ctx.abort()` (the ⏹ button), `pi.setModel()` (bottom-sheet model picker), `pi.setThinkingLevel()` (thinking picker), and `ctx.compact()` (context bar).

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
- 🧠 **思考等级切换**：🧠 标签（仅推理模型显示）六档可选，与终端双向同步；
- 🖼️ **图片上传**：📎 按钮选图/拍照（最多 4 张，自动缩放），随消息一并发给 agent，历史图片同样回放（pi ≥ 1.x）；
- 📊 **上下文用量条 + 一键压缩**：顶栏下方实时显示 token 用量与百分比，一键触发会话压缩；
- 🛠️ **工具调用智能折叠**：Agent 执行 `bash` / `edit` / `read` 时自动折叠显示，点开才展开详情，不刷屏；
- 🌿 **手机端分支切换**：🔀 按钮打开会话树，点选任意条目切到该分支；✨ 新建会话，旧会话保留可随时切回；
- 🔄 **会话切换保活**：终端 /new /resume /fork 后服务自动恢复，局域网手机自动重连，公网重打新二维码；
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
/anywhere restart  # 停止并重启
/anywhere stop     # 关闭服务与隧道
```

手机扫码即打开移动端 Web Chat,**当前会话历史**自动加载（Markdown + 工具面板渲染）。两端任何操作都实时同步到另一端。pi 退出时服务与隧道自动销毁。

说明：

- **兼容性**：同时支持 pi 0.8x 与 pi 1.x（已对照 1.5.1 测试）；
- agent 运行中从手机发送的消息会**自动排队**，当前任务结束后送达（pi ≥ 1.2 行为）；
- 终端切换会话（/new /resume /fork）后服务**自动恢复**：局域网手机自动重连（同端口/token），公网 URL 会变并重打新二维码；/anywhere stop 后不再自动恢复。
- 隧道优先 **http2（TCP 443）**（比 QUIC 在受限网络下更稳），并等待边缘连接注册成功后才打印二维码；隧道进程意外退出会**自动重连**并重新打印新二维码（域名会变，需重扫）。若手机端出现 Cloudflare *Error 1033*，说明当时隧道不可达：改用局域网地址或重新执行 `/anywhere`。

### 安全性

- 每次启动生成随机一次性 token，所有 URL 内嵌 `?token=...`，WebSocket 升级校验不匹配直接拒绝；
- 生命周期绑定：pi 关闭即全部销毁，不留后台进程。

### 工作原理

Extension API 事件流直接驱动 Web UI：`message_start/update/end` → 气泡与打字机流式；`tool_call/result/execution_end` → 折叠工具面板（含被拦截/中止调用的兜底）；`agent_start/settled` → 状态灯与发送/打断按钮切换、中止提示；`model_select` / `thinking_level_select` → 顶栏模型与思考等级标签实时同步；`session_info_changed` → 标签页标题显示会话名；`ui_prompt_start/end` → "等待终端确认"提示。上行通道：`pi.sendUserMessage()`（手机消息、图片、`/命令`）、`ctx.abort()`（⏹ 打断）、`pi.setModel()`（手机端抽屉切模型）、`pi.setThinkingLevel()`（思考等级）、`ctx.compact()`（一键压缩）。

## License

MIT

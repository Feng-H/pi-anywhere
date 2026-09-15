# pi-anywhere 🚀

> **Native remote mobile Web Chat for Pi Coding Agent via Cloudflare Tunnel.**  
> 告别黑乎乎的虚拟终端与键盘折磨！零配置、免公网 IP，在 Pi 中一条 `/anywhere` 命令，手机扫码即可接入纯净、优雅、原生流式同步的移动端 Web 工作台！

---

## 🌟 为什么需要 Pi-Anywhere 2.0？

市面上传统的远程终端方案（SSH / Web Terminal）在手机屏幕上体验极其痛苦：字体小、按键难点、键盘遮挡屏幕、ANSI 转义码混乱。

**Pi-Anywhere 2.0 采用原生扩展架构**：
- 🚫 **彻底抛弃 node-pty & tmux**：无 C++ 原生编译依赖，无系统工具限制，轻量即插即用。
- 📱 **原生级移动端 Chat 界面**：专为触屏优化，支持 Markdown 排版、代码高亮、一键复制、弹性自适应大输入框。
- ⚡ **真正的实时同屏流式互动**：
  - 电脑敲字，手机秒同步；
  - 手机发送指令，电脑端立即触发 Agent 工作；
  - 手机端一键“⏹ 停止”，实时打断任务。
- 🛠️ **工具调用智能折叠**：Agent 执行 `bash`、`edit`、`read` 时自动折叠显示执行状态，不破坏阅读体验，点开即可查阅详情。
- 🌐 **双通道秒级接入**：同时生成 Cloudflare 临时公网穿透 URL（外网 5G 随时随地）与局域网内网直连（同一 Wi-Fi 超低延迟）。

---

## 🚀 安装与使用

### 1. 安装扩展到 Pi

**方式 A：从 GitHub 安装（推荐，无需 npm 账号）：**

```bash
pi install git:github.com/Feng-H/pi-anywhere
```

**方式 B：从 npm 安装：**

```bash
pi install npm:pi-anywhere
```

**方式 C：本地路径安装：**

```bash
pi install /path/to/pi-anywhere
```

### 2. 随时随地唤起

在任何正在运行的 Pi 会话中，输入：

```text
/anywhere
```

终端将打印精美的 ASCII 二维码和安全访问链接：

```text
═══════════════════════════════════════════════════════
  🚀 Pi-Anywhere 移动端远程控制已就绪！
═══════════════════════════════════════════════════════

  [二维码]

 📱 手机扫码或浏览器访问：
   🌐 公网直达 (全国畅连): https://random-subdomain.trycloudflare.com/?token=abc123
   🏠 局域网直连 (同WiFi更低延迟): http://192.168.1.100:54321/?token=abc123
   💻 本地地址: http://127.0.0.1:54321/?token=abc123
═══════════════════════════════════════════════════════
```

拿出手机相机扫码，立即在浏览器中打开专属的 Pi 移动端工作台！

---

## 🎮 控制命令

在 Pi 终端内支持以下命令：

- `/anywhere` - 启动远程 Web 服务并打印二维码与链接。
- `/anywhere status` 或 `/anywhere url` - 重新查看当前二维码与公网链接。
- `/anywhere stop` - 关闭 Web 服务并释放隧道。

---

## 🔒 安全性

- **随机一次性 Token 鉴权**：每次服务启动都会生成专属安全 Token，防止公网未授权访问。
- **自动生命周期管理**：Pi 会话退出时，隧道与本地服务自动销毁，不留僵尸后台进程。

---

## 📄 License

MIT © Feng-H

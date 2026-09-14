# pi-anywhere 🚀

> **Instant remote web access for Pi Agent behind NAT / firewalls via Cloudflare Quick Tunnel.**  
> 零配置、免公网 IP、免买云服务器，一条命令让你的手机、平板或异地浏览器直接连接内网的 Pi Agent！

---

## ✨ Features 特性

- 🌐 **免公网 IP / 零配置穿透**：基于 Cloudflare Quick Tunnel，自动打通防火墙并分配安全的 HTTPS 域名。
- 📱 **移动端专属优化**：
  - 终端自适应屏幕，内置适配手机/平板的虚拟按键栏（`Esc`、`Tab`、`Ctrl`、`↑`、`↓`）。
  - **一键快捷指令**：内置快捷按钮一键触发 `/tree`、`/resume` 等 Pi 关键命令。
- 🔒 **安全防爆破**：每次启动自动生成随机 6 位一次性 PIN 码或自定义访问密码。
- 📲 **扫码直达**：终端自动渲染 ASCII 二维码，手机相机一扫即连。
- 🔄 **会话防掉线（Keep-Alive）**：手机切后台或锁屏断开，本地 Pi 任务持续在后台运行，重新打开网页自动同步屏幕。

---

## 🚀 Quick Start 快速使用

在任何安装了 Pi 的电脑上运行：

```bash
# 无需全局安装，直接通过 npx 启动
npx pi-anywhere
```

启动后终端将输出公网访问地址、安全 PIN 码与直达二维码：

```text
┌────────────────────────────────────────────────────────────┐
│                  🌐 Pi Anywhere is Online                  │
└────────────────────────────────────────────────────────────┘

  🔗 访问网址 (Web URL): https://sunset-alpine-whisper.trycloudflare.com/?token=829401
  🔑 安全 PIN 码:        829401
  💻 挂载的命令:         pi -c

  📱 手机扫码直达 (Scan to Connect):
  [二维码]
```

掏出手机扫码，或在任何外部浏览器打开链接，即可立刻开始与 Pi Agent 远程对话！

---

## 🛠️ CLI Options 参数说明

```bash
Usage: pi-anywhere [options]

Options:
  -V, --version        输出版本号
  -p, --port <number>  本地绑定的 HTTP 端口 (默认: 随机空闲端口)
  --pin <string>       自定义安全 PIN 码 / 密码
  --no-tunnel          仅在局域网内运行，不开启 Cloudflare 外网穿透
  --cmd <command>      指定启动的程序 (默认: "pi")
  --args <args...>     传递给命令的参数 (默认: ["-c"])
  -h, --help           显示帮助信息
```

### 示例

1. **固定密码启动：**
   ```bash
   npx pi-anywhere --pin mysecret123
   ```

2. **仅在局域网内使用（同一 Wi-Fi 下访问）：**
   ```bash
   npx pi-anywhere --no-tunnel --port 8080
   ```

3. **进入历史会话选择器：**
   ```bash
   npx pi-anywhere --args "-r"
   ```

---

## 📄 License

MIT © Feng-H

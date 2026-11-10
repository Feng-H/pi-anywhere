# Changelog

## [0.5.1] - 2026-11-11

### Fixed

- 手机上传的图片在本机（终端）对话里完全不可见：pi 的 TUI 只渲染用户消息的 text block，image block 本就不显示，且 `sendUserMessage` 路径在图片无需 resize 时不会追加任何注记。现在发图时自动在 text block 附加 `📎 [pi-anywhere] 已从手机附加 N 张图片（mime…）` 占位注记（与 pi 原生 resize hints 风格一致），终端与模型上下文均可感知图片存在。

## [0.5.0] - 2026-11-11

### Added

- **手机端图片上传**：📎 按钮选图/拍照（最多 4 张），自动缩放至最长边 1568px（JPEG 0.85）后经 `pi.sendUserMessage([{type:"text"},{type:"image"}])` 发给 agent；历史消息中的图片同样回放。仅 pi ≥ 1.x 支持。
- **思考等级切换**：顶栏新增 🧠 标签（仅推理模型显示），六档可选，与终端 `thinking_level_select` 双向同步；实际生效值以 pi clamp 后广播为准。
- **上下文用量条 + 一键压缩**：顶栏下方实时显示 `tokens/窗口 · 百分比`（≥60% 变黄、≥80% 变红），点"压缩"触发 `ctx.compact()`，完成后推送系统提示并刷新用量。
- **会话名同步**：`session_info_changed` → 手机端浏览器标签页标题实时显示会话名。
- **"等待终端确认"状态**：`ui_prompt_start/end` → 状态灯变琥珀色提示"等待终端确认"（如其他扩展在终端弹选择框）。
- **工具调用兜底**：被 block/aborted 或参数非法的调用（不发 `tool_result`）改由 `tool_execution_end` 兜底广播，手机端不再卡在"执行中"。
- **中止提示**：`agent_settled.aborted` → 手机端显示 "⏹ 任务已中止"。
- `message_update` 服务端节流（120ms，尾部冲刷），长回复时隧道流量大幅下降。

## [0.4.2] - 2026-11-10

### Fixed

- 修复扫码后 Cloudflare **Error 1033**（边缘节点找不到活跃隧道）：
  - 必须等到 `Registered tunnel connection`（边缘连接注册成功）才返回二维码，杜绝"URL 已分配但未注册"即扫码；
  - 隧道主路径强制 `--protocol http2 --edge-ip-version 4`（TCP 443，在 UDP/QUIC 被限制的网络下连通性远好于默认 QUIC），失败时回退默认协议重试；
  - 增加 `--no-autoupdate`，避免 cloudflared 自更新重启导致连接闪断；
  - 隧道进程意外退出时自动重连（最多 3 次），重连后重新打印新二维码，多次失败则提示改用局域网地址。

## [0.4.1] - 2026-11-10

### Fixed

- 修复重复执行 `/anywhere`（或启动后）时 `ui.notify` toast 覆盖在二维码上导致扫不了码的问题：所有二维码附近的 toast 提示改为 `console.log`（与二维码输出严格有序）；已运行时改为在横幅标题内标注“服务已在运行”。

## [0.4.0] - 2026-11-10

### Fixed

- **兼容 pi 1.x**：`tool_result` 事件字段适配。pi 1.x 起 `tool_result` 携带 `content: (Text|Image)[]` 与顶层 `isError`（旧版为 `result.content`），此前手机端工具结果显示为空。现在两种事件形态均可解析，图片结果以 `[图片结果]` 占位。
- **兼容 pi ≥ 1.2**：agent 运行中从手机发送消息不再被拒绝。pi 1.2 起流式期间调用 `sendUserMessage` 必须指定 `deliverAs`，现在会自动以 `followUp` 模式排队，空闲时仍即时发送。
- 修复 `getLanIp()` 运算符优先级问题：`&&`/`||` 未加括号导致虚拟网卡（utun 等）的内网地址可能被误选为局域网 IP；`172.x` 段现在正确限定为 `172.16-31.x`。
- CLI `--version` 不再写死，改为读取 `package.json`。

### Changed

- 开发依赖升级至 `@earendil-works/pi-coding-agent` / `pi-ai` `^1.5.1`，与 pi 1.x 类型对齐。
- 新增 CHANGELOG.md（pi ≥ 1.5 会在扩展更新后自动展示）。

## [0.3.2] - 2026-09-20

- README 徽章统一为四枚规范。

## [0.3.1] - 2026-09-20

- 补充 npm 元数据（author/repository/bugs/homepage）。

## [0.3.0] - 2026-09-20

- 手机端 Web UI 模型切换（上/下行同步，`model_select` 事件联动）。

## [0.2.x] - 2026-09

- Trusted Publishing (OIDC) 自动发布链路。
- npm 安装说明与徽章。

## [0.1.0] - 2026-09

- 首个版本：Cloudflare Tunnel + Web Chat + 二维码接入、流式同步、工具折叠、会话历史回放、中止控制。

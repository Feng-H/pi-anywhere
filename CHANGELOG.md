# Changelog

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

# pi-anywhere 工作承接

## 当前状态
- **v0.5.1 已完成并推送**（master + tag v0.5.1，commit 4a462b3；0.4.0~0.5.0 均未发布 npm，最新待发即 0.5.1）：
  - v0.4.0：pi 1.x 兼容（tool_result content、sendUserMessage deliverAs、getLanIp、devDeps ^1.5.1、CHANGELOG）
  - v0.4.1：二维码被 ui.notify toast 覆盖修复
  - v0.4.2：Error 1033 修复（注册门控、http2 优先、自动重连）
  - v0.5.0：图片上传（≤4张/自动缩放1568px）、思考等级切换（🧠标签双向同步）、上下文用量条+一键压缩、会话名同步标签页标题、"等待终端确认"状态、tool_execution_end 兜底、中止提示、message_update 120ms 节流
  - v0.5.1：手机发图在本机对话不可见修复（pi TUI 只渲染 text block；发图时在 text block 附加 `📎 [pi-anywhere] 已从手机附加 N 张图片` 占位注记，终端与模型上下文均可感知）
- 验证：tsc 对 1.5.1 全绿；WS 图片透传 + 占位注记构造冒烟通过；npm pack 干净。
- **待用户在真实终端（TTY）执行发布**：
  `cd /Users/apple/pidev/pi-anywhere && npm publish --access public --registry=https://registry.npmjs.com/`
- 发布后实测清单：pi update → /anywhere → ①📎 发图后本机对话出现 📎 占位注记、agent 能读图 ②🧠 切思考等级与终端同步 ③用量条随回复增长、压缩按钮可用 ④agent 运行中手机发消息排队 ⑤长回复流式顺滑

## 待办（v0.6.0 候选）
- [ ] `session_shutdown`(reason≠quit) 后新 session 自动重启服务（跨 /new /resume /fork 保活，需持久化意图标记）
- [ ] /anywhere restart 子命令（拆分重启语义）
- [ ] 手机端查看会话树 / 分支切换（ctx.navigateTree / fork）
- [ ] 手机端 /tree /new /resume 等命令映射按钮（部分依赖上一条）
- [ ] 多设备连接时工具结果等广播的增量优化（diff/压缩）
- [ ] 可选：图片占位注记在手机端气泡中去重显示（当前手机端会重复显示注记+缩略图，无害但可优化）

## 关键决策记录
- 二维码附近禁止 ui.notify（toast 覆盖码面），状态提示一律 console.log —— 代码注释已固化
- 隧道就绪判定 = URL + Registered tunnel connection；协议顺序 http2+IPv4 → QUIC —— tunnel.ts 已固化
- tool_result 兼容 1.x（content 数组）与 0.85（result.content）；wire format `result` 保持字符串
- 图片上行仅在 pi ≥ 1.x 可用（0.85 sendUserMessage 无内容数组），前端无版本判断——README 已注明 pi ≥ 1.x
- pi TUI 用户消息只渲染 text block（image block 不可见）→ pi-anywhere 发图必须自带占位注记进 text block；pi 原生只在 resize 时追加 hints，扩展层不能依赖
- thinking level 切换后以 pi.getThinkingLevel() 实际值（可能被 clamp）广播，前端幂等渲染
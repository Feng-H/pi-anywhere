# pi-anywhere 工作承接

## 当前状态
- **v0.5.0（阶段二）已完成并推送**（master + tag v0.5.0，commit 68c79c7）。0.4.0~0.4.2 均未发布 npm，最新待发即 0.5.0：
  - v0.4.0：pi 1.x 兼容（tool_result content、sendUserMessage deliverAs、getLanIp、devDeps ^1.5.1、CHANGELOG）
  - v0.4.1：二维码被 ui.notify toast 覆盖修复
  - v0.4.2：Error 1033 修复（注册门控、http2 优先、自动重连）
  - v0.5.0：图片上传（≤4张/自动缩放1568px）、思考等级切换（🧠标签双向同步）、上下文用量条+一键压缩、会话名同步标签页标题、"等待终端确认"状态、tool_execution_end 兜底、中止提示、message_update 120ms 节流
- 验证：tsc 对 1.5.1 全绿；E2E WS 冒烟（init 新字段/图片上行/thinking/compact 路由/新事件注册）全过；npm pack 干净。
- **待用户在真实终端（TTY）执行发布**：
  `cd /Users/apple/pidev/pi-anywhere && npm publish --access public --registry=https://registry.npmjs.com/`
- 发布后实测清单：pi update → /anywhere → ①📎 发图（拍照+相册）看 agent 能读图 ②🧠 切思考等级与终端同步 ③用量条随回复增长、压缩按钮可用 ④agent 运行中手机发消息排队 ⑤长回复流式顺滑

## 待办（v0.6.0 候选）
- [ ] `session_shutdown`(reason≠quit) 后新 session 自动重启服务（跨 /new /resume /fork 保活，需持久化意图标记）
- [ ] /anywhere restart 子命令（拆分重启语义）
- [ ] 手机端查看会话树 / 分支切换（ctx.navigateTree / fork）
- [ ] 手机端 /tree /new /resume 等命令映射按钮（部分依赖上一条）
- [ ] 多设备连接时工具结果等广播的增量优化（diff/压缩）

## 关键决策记录
- 二维码附近禁止 ui.notify（toast 覆盖码面），状态提示一律 console.log —— 代码注释已固化
- 隧道就绪判定 = URL + Registered tunnel connection；协议顺序 http2+IPv4 → QUIC —— tunnel.ts 已固化
- tool_result 兼容 1.x（content 数组）与 0.85（result.content）；wire format `result` 保持字符串
- 图片上行仅在 pi ≥ 1.x 可用（0.85 sendUserMessage 无内容数组），前端无版本判断——README 已注明 pi ≥ 1.x
- thinking level 切换后以 pi.getThinkingLevel() 实际值（可能被 clamp）广播，前端幂等渲染
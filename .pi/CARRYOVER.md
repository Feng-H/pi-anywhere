# pi-anywhere 工作承接

## 当前状态
- **v0.4.1 已完成并推送**（master + tag v0.4.1，commit 743c485；v0.4.0 tag 存在但未发布 npm）：
  - v0.4.0：pi 1.x 兼容修复（tool_result content 形态、sendUserMessage deliverAs 排队、getLanIp 优先级、CLI 版本同步、devDeps 升 ^1.5.1、CHANGELOG.md、README 兼容性说明）
  - v0.4.1：修复 ui.notify toast 覆盖二维码导致扫不了码（二维码附近 toast 全改 console.log；已运行改为横幅内标注"服务已在运行"）
- tsc 对 pi 1.5.1 类型全绿；npm pack 产物干净。
- **待用户在真实终端（TTY）执行发布**：
  `cd /Users/apple/pidev/pi-anywhere && npm publish --access public --registry=https://registry.npmjs.com/`
  （AI 不代发，见 AGENTS.md 分工铁律）
- 发布后建议实测：pi update → /anywhere 连续两次验证二维码可扫、pi 1.x 下手机端工具结果卡片正常、agent 运行中手机连发消息排队送达

## 待办（v0.5.0 候选，用户确认 v0.4.1 稳定后启动）
- [ ] 手机端图片上传：WS 消息 + 前端 file input → `pi.sendUserMessage([{type:"text"},{type:"image",data,mimeType}])`（pi 1.x 已支持）
- [ ] thinking level 手机端切换：`pi.get/setThinkingLevel()` + `thinking_level_select` 事件双向同步
- [ ] 顶部 context 用量条：`ctx.getContextUsage()`；一键压缩按钮：`ctx.compact({customInstructions})`
- [ ] `tool_execution_end` 兜底捕获被 block/aborted 的调用（这些不发 tool_result 事件）
- [ ] `session_info_changed` 事件同步会话名到手机端
- [ ] 可选：`ui_prompt_start/end` → 手机端提示"Pi 正在等待终端确认"
- [ ] 可选优化：message_update 增量/节流广播（长回复隧道流量放大）

## 关键决策记录
- 二维码附近禁止 ui.notify（toast 浮层会覆盖码面），状态提示一律 console.log 保证顺序 —— 已在代码注释中固化
- `session_shutdown` 在 pi 1.x 会因 /new /resume /fork reload 触发 → 仅 README 说明（重跑 /anywhere），自动重启留待 v0.5 评估
- tool_result 兼容层同时支持 1.x（content 数组）与 0.85（result.content），wire format `result` 保持字符串，前端无需改动
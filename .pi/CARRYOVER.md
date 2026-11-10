# pi-anywhere 工作承接

## 当前状态
- **v0.6.0 已完成并推送**（master + tag v0.6.0，commit 7afc48c；0.4.0~0.5.1 均未发布 npm，最新待发即 0.6.0）：
  - v0.4.x：pi 1.x 兼容、二维码 toast 覆盖修复、Error 1033 修复
  - v0.5.x：图片上传+占位注记、思考等级切换、上下文用量条+压缩、会话名同步、tool_execution_end 兜底、message_update 节流
  - v0.6.0：会话切换保活（globalThis 标记 + 同端口/token 复用，局域网自动重连、公网重打码）、手机端会话树切换（/anywhere-nav 派发）、✨ 新会话（/anywhere-new）、/anywhere restart、手机端图片注记去重
- 验证：tsc 全绿；WS 新协议（get_tree/navigate_tree/new_session）、标记生命周期（quit 清除/切换保留）、命令注册冒烟全过；npm pack 干净。
- **待用户在真实终端（TTY）执行发布**：
  `cd /Users/apple/pidev/pi-anywhere && npm publish --access public --registry=https://registry.npmjs.com/`
- 发布后实测清单：①终端 /new 后手机（局域网）自动重连、公网出新码 ②🔀 切分支后手机历史刷新 ③✨ 新会话可用且旧会话可切回 ④/anywhere restart 正常 ⑤手机图片气泡无重复注记

## 待办（v0.7.0 候选）
- [ ] 多设备连接时工具结果等广播的增量优化（diff/压缩）
- [ ] 手机端 tree sheet 支持加载更多（当前只送最近 100 条，大会话早期分支不可达）
- [ ] 可选：公网 URL 变化时通知已连接的局域网客户端（前端收到后提示"公网地址已更新，可重新扫码"）
- [ ] 可选：/anywhere-log（手机端查看终端日志）之类增强
- [ ] 可选：anywhere-new / anywhere-nav 在终端命令面板可见，若 pi 未来支持 hidden 命令则隐藏

## 关键决策记录
- 二维码附近禁止 ui.notify（toast 覆盖码面），状态提示一律 console.log —— 代码注释已固化
- 隧道就绪判定 = URL + Registered tunnel connection；协议顺序 http2+IPv4 → QUIC —— tunnel.ts 已固化
- tool_result 兼容 1.x（content 数组）与 0.85（result.content）；wire format `result` 保持字符串
- 图片上行仅 pi ≥ 1.x；发图必须在 text block 附加占位注记（pi TUI 只渲染 text block）——已固化
- thinking level 切换后以 pi.getThinkingLevel() 实际值（可能被 clamp）广播，前端幂等渲染
- 会话切换保活 = globalThis.__piAnywhereMarker{pid,cwd,port,token}：同进程同目录才自动恢复；quit/stop 清除；session_shutdown(非quit) 保留
- 手机端会话操作（newSession/navigateTree）只能经辅助命令派发（事件 ctx 无这些方法，旧命令 ctx 会话替换后失效）；每次派发拿新鲜命令 ctx
import crypto from "node:crypto";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import { startServer } from "./server.js";
import { startTunnel } from "./tunnel.js";
import { parseSessionEntriesToMessages, extractTextFromMessage, extractImagesFromMessage } from "./session-sync.js";
let server = null;
let tunnel = null;
let publicUrl = null;
let authToken = crypto.randomBytes(6).toString("hex");
let currentContext = null;
// message_update 节流：避免长回复流式时每次 token 都全量广播（隧道流量放大）
const UPDATE_THROTTLE_MS = 120;
let lastUpdateSentAt = 0;
let pendingUpdateTimer = null;
let pendingUpdateId = null;
let pendingUpdateText = "";
// 已通过 tool_result 事件广播过结果的调用 id（tool_execution_end 兕底去重用）
const broadcastedToolResults = new Set();
function broadcastAssistantUpdateThrottled(id, text) {
    const now = Date.now();
    if (now - lastUpdateSentAt >= UPDATE_THROTTLE_MS) {
        lastUpdateSentAt = now;
        server?.broadcast({ type: "message_update", id, text });
        return;
    }
    pendingUpdateId = id;
    pendingUpdateText = text;
    if (!pendingUpdateTimer) {
        pendingUpdateTimer = setTimeout(() => {
            pendingUpdateTimer = null;
            lastUpdateSentAt = Date.now();
            server?.broadcast({ type: "message_update", id: pendingUpdateId, text: pendingUpdateText });
        }, UPDATE_THROTTLE_MS);
    }
}
function flushAssistantUpdate() {
    if (pendingUpdateTimer) {
        clearTimeout(pendingUpdateTimer);
        pendingUpdateTimer = null;
    }
}
function toolContentToText(content) {
    const blocks = Array.isArray(content) ? content : [];
    return blocks
        .map((b) => {
        if (typeof b === "string")
            return b;
        if (b?.type === "text")
            return b.text;
        if (b?.type === "image")
            return "[图片结果]";
        return "";
    })
        .filter(Boolean)
        .join("\n");
}
function broadcastContextUsage() {
    if (!currentContext)
        return;
    try {
        const usage = currentContext.getContextUsage();
        if (usage) {
            server?.broadcast({
                type: "context_usage",
                tokens: usage.tokens,
                contextWindow: usage.contextWindow,
                percent: usage.percent,
            });
        }
    }
    catch { }
}
export default function (pi) {
    // 保存活跃 context
    pi.on("session_start", (_event, ctx) => {
        currentContext = ctx;
    });
    // 退出时释放资源
    pi.on("session_shutdown", async () => {
        await stopAnywhere();
    });
    // 状态与生命周期事件
    pi.on("agent_start", () => {
        server?.broadcast({ type: "status", status: "thinking" });
    });
    pi.on("agent_settled", (event) => {
        server?.broadcast({ type: "status", status: "idle" });
        if (event.aborted) {
            server?.broadcast({
                type: "message_append",
                message: {
                    id: `aborted-${Date.now()}`,
                    role: "system",
                    text: "⏹ 任务已中止",
                    timestamp: Date.now(),
                },
            });
        }
        broadcastedToolResults.clear();
        broadcastContextUsage();
    });
    // 终端侧等待扩展 UI 交互（其他扩展的 select/confirm 弹窗等）时提示手机端
    pi.on("ui_prompt_start", () => {
        server?.broadcast({ type: "status", status: "waiting_terminal" });
    });
    pi.on("ui_prompt_end", () => {
        const idle = currentContext ? currentContext.isIdle() : true;
        server?.broadcast({ type: "status", status: idle ? "idle" : "thinking" });
    });
    // 终端侧切换模型时（如 /models 命令），同步到所有手机客户端
    pi.on("model_select", (event) => {
        server?.broadcast({
            type: "model_update",
            model: `${event.model.provider}/${event.model.id}`,
            modelId: event.model.id,
            provider: event.model.provider,
            reasoning: !!event.model.reasoning,
        });
        broadcastContextUsage(); // contextWindow 可能随模型变化
    });
    // thinking level 双向同步
    pi.on("thinking_level_select", (event) => {
        server?.broadcast({ type: "thinking_level_update", level: event.level });
    });
    // 会话名同步（/name 命令等）
    pi.on("session_info_changed", (event) => {
        server?.broadcast({ type: "session_name", name: event.name });
    });
    pi.on("message_start", (event) => {
        if (event.message.role === "user") {
            const text = extractTextFromMessage(event.message);
            const images = extractImagesFromMessage(event.message);
            server?.broadcast({
                type: "message_append",
                message: {
                    id: event.message.id || String(Date.now()),
                    role: "user",
                    text,
                    images: images.length > 0 ? images : undefined,
                    timestamp: Date.now(),
                },
            });
        }
        else if (event.message.role === "assistant") {
            server?.broadcast({
                type: "message_append",
                message: {
                    id: event.message.id || String(Date.now()),
                    role: "assistant",
                    text: "",
                    timestamp: Date.now(),
                },
            });
        }
    });
    pi.on("message_update", (event) => {
        if (event.message.role === "assistant") {
            broadcastAssistantUpdateThrottled(event.message.id, extractTextFromMessage(event.message));
        }
    });
    pi.on("message_end", (event) => {
        if (event.message.role === "assistant") {
            flushAssistantUpdate();
            const text = extractTextFromMessage(event.message);
            server?.broadcast({
                type: "message_end",
                id: event.message.id,
                text,
            });
            broadcastContextUsage();
        }
    });
    pi.on("tool_call", (event) => {
        server?.broadcast({
            type: "tool_call",
            toolCallId: event.toolCallId || String(Date.now()),
            toolName: event.toolName,
            input: event.input,
        });
    });
    pi.on("tool_result", (event) => {
        // pi >= 1.x: content 为 (TextContent | ImageContent)[]，isError 为顶层字段
        // pi 0.85 (legacy): result.content / result.isError
        const anyEvent = event;
        broadcastedToolResults.add(anyEvent.toolCallId);
        const blocks = Array.isArray(anyEvent.content)
            ? anyEvent.content
            : Array.isArray(anyEvent.result?.content)
                ? anyEvent.result.content
                : [];
        const isError = typeof anyEvent.isError === "boolean"
            ? anyEvent.isError
            : !!anyEvent.result?.isError;
        server?.broadcast({
            type: "tool_result",
            toolCallId: anyEvent.toolCallId,
            toolName: event.toolName,
            result: toolContentToText(blocks),
            isError,
        });
    });
    // 兕底：被 block/aborted 或参数非法的调用不发 tool_result 事件，但会发 tool_execution_end
    pi.on("tool_execution_end", (event) => {
        if (broadcastedToolResults.has(event.toolCallId))
            return;
        broadcastedToolResults.add(event.toolCallId);
        const text = toolContentToText(event.result?.content)
            || (event.isError ? "调用未执行（被拦截或中止）" : "");
        server?.broadcast({
            type: "tool_result",
            toolCallId: event.toolCallId,
            toolName: event.toolName,
            result: text || "调用未执行",
            isError: !!event.isError,
        });
    });
    // 压缩完成：通知手机端并刷新上下文用量
    pi.on("session_compact", () => {
        server?.broadcast({
            type: "message_append",
            message: {
                id: `compact-${Date.now()}`,
                role: "system",
                text: "📦 会话已压缩，历史已浓缩为摘要",
                timestamp: Date.now(),
            },
        });
        // 刚压缩完 tokens 可能为 null（下一次 LLM 响应后才有估算），仍推送一次刷新 UI
        broadcastContextUsage();
    });
    // 注册 /anywhere 命令
    pi.registerCommand("anywhere", {
        description: "启动或管理 Pi 移动端远程 Web 访问 (Cloudflare Tunnel + Web Chat)",
        handler: async (args, ctx) => {
            currentContext = ctx;
            const cmd = args.trim().toLowerCase();
            if (cmd === "stop") {
                if (!server && !tunnel) {
                    ctx.ui.notify("pi-anywhere 当前未运行", "info");
                    return;
                }
                await stopAnywhere();
                ctx.ui.notify("pi-anywhere 服务与隧道已停止", "info");
                return;
            }
            if (cmd === "url" || cmd === "status") {
                if (!server || !publicUrl) {
                    ctx.ui.notify("pi-anywhere 未启动，使用 /anywhere 启动", "warning");
                    return;
                }
                printAccessInfo(publicUrl, server.lanUrl, server.localUrl);
                return;
            }
            // 默认 start
            if (server && publicUrl) {
                // 不用 ui.notify：toast 会覆盖在二维码上导致扫不了码，改为横幅内标注
                printAccessInfo(publicUrl, server.lanUrl, server.localUrl, "服务已在运行 · 下为现有连接 URL");
                return;
            }
            console.log(chalk.dim("[pi-anywhere] 正在启动服务与公网隧道..."));
            try {
                await startAnywhere(pi, ctx);
            }
            catch (err) {
                ctx.ui.notify(`启动失败: ${err.message}`, "error");
                await stopAnywhere();
            }
        },
    });
}
async function startAnywhere(pi, ctx) {
    if (server) {
        await stopAnywhere();
    }
    authToken = crypto.randomBytes(6).toString("hex");
    // 1. 启动 Web/WS Server
    server = await startServer(0, authToken, {
        onUserMessage: async (text, images) => {
            // pi >= 1.x 支持内容数组：文本 + 图片（base64 无前缀）
            let content = text;
            if (images && images.length > 0) {
                // 终端 TUI 只渲染用户消息的 text block（image block 不可见），
                // 附加占位注记让本机对话里能看到图片存在（与 pi 原生 resize hints 风格一致）
                const note = `📎 [pi-anywhere] 已从手机附加 ${images.length} 张图片（${[...new Set(images.map((i) => i.mimeType))].join(", ")}）`;
                content = [
                    { type: "text", text: text ? `${text}\n\n${note}` : note },
                    ...images.map((img) => ({ type: "image", data: img.data, mimeType: img.mimeType })),
                ];
            }
            // pi >= 1.2: agent 运行中必须指定 deliverAs，否则消息被拒绝
            const idle = currentContext ? currentContext.isIdle() : true;
            const options = {
                expandPromptTemplates: true,
            };
            if (!idle) {
                options.deliverAs = "followUp";
            }
            pi.sendUserMessage(content, options);
        },
        onAbort: async () => {
            if (currentContext && !currentContext.isIdle()) {
                currentContext.abort();
            }
        },
        onSwitchModel: async (provider, modelId) => {
            try {
                if (!currentContext) {
                    return { ok: false, error: "无活跃会话" };
                }
                if (!currentContext.isIdle()) {
                    return { ok: false, error: "Pi 正在思考中，请等待当前任务完成后再切换模型" };
                }
                const model = currentContext.modelRegistry.find(provider, modelId);
                if (!model) {
                    return { ok: false, error: `未找到模型 ${provider}/${modelId}` };
                }
                if (!currentContext.modelRegistry.hasConfiguredAuth(model)) {
                    return { ok: false, error: `模型 ${provider}/${modelId} 未配置认证信息` };
                }
                const success = await pi.setModel(model);
                if (!success) {
                    return { ok: false, error: `切换失败：${provider}/${modelId} 认证不可用` };
                }
                console.log(`[pi-anywhere] Model switched via mobile: ${provider}/${modelId}`);
                return { ok: true };
            }
            catch (err) {
                return { ok: false, error: err?.message || String(err) };
            }
        },
        onSwitchThinkingLevel: async (level) => {
            try {
                if (!currentContext) {
                    return { ok: false, error: "无活跃会话" };
                }
                if (!currentContext.isIdle()) {
                    return { ok: false, error: "Pi 正在思考中，请等待当前任务完成后再切换" };
                }
                pi.setThinkingLevel(level);
                // 可能被 clamp，以实际生效值为准广播
                const actual = pi.getThinkingLevel();
                server?.broadcast({ type: "thinking_level_update", level: actual });
                console.log(`[pi-anywhere] Thinking level switched via mobile: ${actual}`);
                return { ok: true };
            }
            catch (err) {
                return { ok: false, error: err?.message || String(err) };
            }
        },
        onCompact: async () => {
            if (!currentContext) {
                return { ok: false, error: "无活跃会话" };
            }
            if (!currentContext.isIdle()) {
                return { ok: false, error: "Pi 正在思考中，请等待当前任务完成后再压缩" };
            }
            try {
                currentContext.compact({
                    onError: (err) => console.error("[pi-anywhere] compact failed:", err?.message || err),
                });
                console.log("[pi-anywhere] Compaction triggered via mobile");
                return { ok: true };
            }
            catch (err) {
                return { ok: false, error: err?.message || String(err) };
            }
        },
        getInitialState: () => {
            const isIdle = currentContext ? currentContext.isIdle() : true;
            const model = currentContext?.model ? `${currentContext.model.provider}/${currentContext.model.id}` : undefined;
            const modelReasoning = !!currentContext?.model?.reasoning;
            const sessionFile = currentContext?.sessionManager.getSessionFile();
            let sessionName;
            try {
                sessionName = currentContext?.sessionManager.getSessionName?.() || undefined;
            }
            catch { }
            let thinkingLevel;
            try {
                thinkingLevel = currentContext?.thinkingLevel || pi.getThinkingLevel();
            }
            catch { }
            let contextUsage;
            try {
                contextUsage = currentContext?.getContextUsage?.();
            }
            catch { }
            const models = getSelectableModels();
            let history = [];
            try {
                const entries = currentContext?.sessionManager.buildContextEntries() || [];
                history = parseSessionEntriesToMessages(entries);
            }
            catch (e) {
                console.error("[pi-anywhere] Failed to parse history:", e);
            }
            return {
                isIdle,
                model,
                modelReasoning,
                sessionFile,
                sessionName,
                thinkingLevel,
                contextUsage,
                models,
                history,
            };
        },
    });
    // 2. 启动 Cloudflare Tunnel（http2 优先 + 边缘注册确认 + 意外退出自动重连）
    tunnel = await startTunnel(server.port, {
        onAutoRestart: (newUrl, restartCount) => {
            // 隧道重连后临时域名会变，重新打印横幅与二维码供手机重扫
            // （不用 ui.notify，避免 toast 覆盖二维码）
            publicUrl = `${newUrl}/?token=${authToken}`;
            printAccessInfo(publicUrl, server.lanUrl, server.localUrl, `隧道已自动重连 (${restartCount}) · 请重新扫码`);
        },
        onGiveUp: () => {
            console.error(chalk.red.bold("[pi-anywhere] 公网隧道多次重连失败，公网地址已失效。"));
            console.error(chalk.yellow("  局域网地址仍可正常使用；重新执行 /anywhere 可再次尝试建立公网隧道。"));
        },
    });
    publicUrl = `${tunnel.url}/?token=${authToken}`;
    // 3. 打印展示访问信息与二维码。注意：不要在二维码附近再调 ui.notify，
    //    toast 会覆盖在二维码上导致扫不了码；状态提示全部用 console.log 保证顺序。
    printAccessInfo(publicUrl, server.lanUrl, server.localUrl);
}
async function stopAnywhere() {
    if (tunnel) {
        try {
            tunnel.stop();
        }
        catch { }
        tunnel = null;
    }
    if (server) {
        try {
            await server.close();
        }
        catch { }
        server = null;
    }
    publicUrl = null;
}
/**
 * 获取可切换的模型列表：优先返回会话 scoped 模型（--models / enabledModels），
 * 未配置 scoping 时返回全部可用模型。仅保留已认证可用的模型。
 */
function getSelectableModels() {
    if (!currentContext)
        return [];
    try {
        const scoped = currentContext.scopedModels || [];
        const models = scoped.length > 0 ? scoped.map((s) => s.model) : currentContext.modelRegistry.getAvailable();
        const seen = new Set();
        return models
            .filter((m) => {
            try {
                return currentContext.modelRegistry.hasConfiguredAuth(m);
            }
            catch {
                return false;
            }
        })
            .filter((m) => {
            const key = `${m.provider}/${m.id}`;
            if (seen.has(key))
                return false;
            seen.add(key);
            return true;
        })
            .map((m) => ({
            provider: m.provider,
            id: m.id,
            name: m.name || m.id,
            reasoning: !!m.reasoning,
        }));
    }
    catch (e) {
        console.error("[pi-anywhere] Failed to list models:", e);
        return [];
    }
}
function printAccessInfo(fullPublicUrl, lanUrl, localUrl, subtitle = "移动端远程控制已就绪！") {
    console.log("\n" + chalk.green.bold("═══════════════════════════════════════════════════════"));
    console.log(chalk.green.bold("  🚀 Pi-Anywhere " + subtitle));
    console.log(chalk.green.bold("═══════════════════════════════════════════════════════"));
    // 二维码
    qrcode.generate(fullPublicUrl, { small: true }, (qr) => {
        console.log(qr);
    });
    console.log(chalk.cyan.bold(" 📱 手机扫码或浏览器访问："));
    console.log(chalk.yellow.bold(`   🌐 公网直达 (全国畅连): `) + chalk.underline.white(fullPublicUrl));
    if (lanUrl) {
        console.log(chalk.yellow.bold(`   🏠 局域网直连 (同WiFi更低延迟): `) + chalk.underline.white(lanUrl));
    }
    console.log(chalk.dim(`   💻 本地地址: ${localUrl}`));
    console.log(chalk.dim("   提示：在 Pi 终端输入 /anywhere stop 随时关闭连接"));
    console.log(chalk.green.bold("═══════════════════════════════════════════════════════\n"));
}

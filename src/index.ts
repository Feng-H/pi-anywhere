import crypto from "node:crypto";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { startServer, type AnywhereServer } from "./server.js";
import { startTunnel, type TunnelResult } from "./tunnel.js";
import { parseSessionEntriesToMessages, extractTextFromMessage } from "./session-sync.js";

let server: AnywhereServer | null = null;
let tunnel: TunnelResult | null = null;
let publicUrl: string | null = null;
let authToken: string = crypto.randomBytes(6).toString("hex");
let currentContext: ExtensionContext | null = null;

export default function (pi: ExtensionAPI) {
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

  pi.on("agent_settled", () => {
    server?.broadcast({ type: "status", status: "idle" });
  });

  // 终端侧切换模型时（如 /models 命令），同步到所有手机客户端
  pi.on("model_select", (event) => {
    server?.broadcast({
      type: "model_update",
      model: `${event.model.provider}/${event.model.id}`,
      modelId: event.model.id,
      provider: event.model.provider,
    });
  });

  pi.on("message_start", (event) => {
    if (event.message.role === "user") {
      const text = extractTextFromMessage(event.message);
      server?.broadcast({
        type: "message_append",
        message: {
          id: (event.message as any).id || String(Date.now()),
          role: "user",
          text,
          timestamp: Date.now(),
        },
      });
    } else if (event.message.role === "assistant") {
      server?.broadcast({
        type: "message_append",
        message: {
          id: (event.message as any).id || String(Date.now()),
          role: "assistant",
          text: "",
          timestamp: Date.now(),
        },
      });
    }
  });

  pi.on("message_update", (event) => {
    if (event.message.role === "assistant") {
      const text = extractTextFromMessage(event.message);
      server?.broadcast({
        type: "message_update",
        id: (event.message as any).id,
        text,
      });
    }
  });

  pi.on("message_end", (event) => {
    if (event.message.role === "assistant") {
      const text = extractTextFromMessage(event.message);
      server?.broadcast({
        type: "message_end",
        id: (event.message as any).id,
        text,
      });
    }
  });

  pi.on("tool_call", (event) => {
    server?.broadcast({
      type: "tool_call",
      toolCallId: (event as any).toolCallId || String(Date.now()),
      toolName: event.toolName,
      input: event.input,
    });
  });

  pi.on("tool_result", (event) => {
    server?.broadcast({
      type: "tool_result",
      toolCallId: (event as any).toolCallId,
      toolName: event.toolName,
      result: (event as any).result,
      isError: (event as any).isError,
    });
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
        ctx.ui.notify("pi-anywhere 已经在运行中", "info");
        printAccessInfo(publicUrl, server.lanUrl, server.localUrl);
        return;
      }

      ctx.ui.notify("正在启动 pi-anywhere 服务与公网隧道...", "info");

      try {
        await startAnywhere(pi, ctx);
      } catch (err: any) {
        ctx.ui.notify(`启动失败: ${err.message}`, "error");
        await stopAnywhere();
      }
    },
  });
}

async function startAnywhere(pi: ExtensionAPI, ctx: ExtensionContext) {
  if (server) {
    await stopAnywhere();
  }

  authToken = crypto.randomBytes(6).toString("hex");

  // 1. 启动 Web/WS Server
  server = await startServer(0, authToken, {
    onUserMessage: async (text: string) => {
      pi.sendUserMessage(text, { expandPromptTemplates: true });
    },
    onAbort: async () => {
      if (currentContext && !currentContext.isIdle()) {
        currentContext.abort();
      }
    },
    onSwitchModel: async (provider: string, modelId: string) => {
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
      } catch (err: any) {
        return { ok: false, error: err?.message || String(err) };
      }
    },
    getInitialState: () => {
      const isIdle = currentContext ? currentContext.isIdle() : true;
      const model = currentContext?.model ? `${currentContext.model.provider}/${currentContext.model.id}` : undefined;
      const sessionFile = currentContext?.sessionManager.getSessionFile();
      const models = getSelectableModels();
      let history: any[] = [];
      try {
        const entries = currentContext?.sessionManager.buildContextEntries() || [];
        history = parseSessionEntriesToMessages(entries);
      } catch (e) {
        console.error("[pi-anywhere] Failed to parse history:", e);
      }

      return {
        isIdle,
        model,
        sessionFile,
        models,
        history,
      };
    },
  });

  // 2. 启动 Cloudflare Tunnel
  tunnel = await startTunnel(server.port);
  publicUrl = `${tunnel.url}/?token=${authToken}`;

  // 3. 打印展示访问信息与二维码
  printAccessInfo(publicUrl, server.lanUrl, server.localUrl);
  ctx.ui.notify("pi-anywhere 启动成功！手机扫码即可接入", "info");
}

async function stopAnywhere() {
  if (tunnel) {
    try {
      tunnel.stop();
    } catch {}
    tunnel = null;
  }
  if (server) {
    try {
      await server.close();
    } catch {}
    server = null;
  }
  publicUrl = null;
}

/**
 * 获取可切换的模型列表：优先返回会话 scoped 模型（--models / enabledModels），
 * 未配置 scoping 时返回全部可用模型。仅保留已认证可用的模型。
 */
function getSelectableModels() {
  if (!currentContext) return [];
  try {
    const scoped = currentContext.scopedModels || [];
    const models = scoped.length > 0 ? scoped.map((s) => s.model) : currentContext.modelRegistry.getAvailable();
    const seen = new Set<string>();
    return models
      .filter((m) => {
        try {
          return currentContext!.modelRegistry.hasConfiguredAuth(m);
        } catch {
          return false;
        }
      })
      .filter((m) => {
        const key = `${m.provider}/${m.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((m) => ({
        provider: m.provider,
        id: m.id,
        name: m.name || m.id,
        reasoning: !!m.reasoning,
      }));
  } catch (e) {
    console.error("[pi-anywhere] Failed to list models:", e);
    return [];
  }
}

function printAccessInfo(fullPublicUrl: string, lanUrl: string | null, localUrl: string) {
  console.log("\n" + chalk.green.bold("═══════════════════════════════════════════════════════"));
  console.log(chalk.green.bold("  🚀 Pi-Anywhere 移动端远程控制已就绪！"));
  console.log(chalk.green.bold("═══════════════════════════════════════════════════════"));

  // 二维码
  qrcode.generate(fullPublicUrl, { small: true }, (qr: string) => {
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

export interface ChatToolCall {
  id: string;
  name: string;
  args?: any;
  result?: any;
  isError?: boolean;
  status: "running" | "done" | "error";
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  toolCalls?: ChatToolCall[];
  timestamp?: number | string;
}

export function parseSessionEntriesToMessages(entries: any[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  const toolCallMap = new Map<string, ChatToolCall>();

  for (const entry of entries) {
    if (!entry) continue;

    if (entry.type === "compaction") {
      messages.push({
        id: entry.id,
        role: "system",
        text: `📦 会话已压缩 (保留摘要: ${entry.summary || "历史已浓缩"})`,
        timestamp: entry.timestamp,
      });
      continue;
    }

    if (entry.type === "branch_summary") {
      messages.push({
        id: entry.id,
        role: "system",
        text: `🌿 分支摘要: ${entry.summary}`,
        timestamp: entry.timestamp,
      });
      continue;
    }

    if (entry.type === "message" && entry.message) {
      const msg = entry.message;
      const role = msg.role;

      if (role === "user") {
        let text = "";
        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          text = msg.content
            .filter((c: any) => c && c.type === "text")
            .map((c: any) => c.text)
            .join("\n");
        }
        messages.push({
          id: entry.id || String(Date.now()),
          role: "user",
          text,
          timestamp: entry.timestamp,
        });
      } else if (role === "assistant") {
        let text = "";
        const toolCalls: ChatToolCall[] = [];

        if (typeof msg.content === "string") {
          text = msg.content;
        } else if (Array.isArray(msg.content)) {
          for (const block of msg.content) {
            if (!block) continue;
            if (block.type === "text") {
              text += (text ? "\n" : "") + block.text;
            } else if (block.type === "toolCall") {
              const tc: ChatToolCall = {
                id: block.id,
                name: block.name,
                args: block.arguments,
                status: "done",
              };
              toolCalls.push(tc);
              toolCallMap.set(block.id, tc);
            }
          }
        }

        messages.push({
          id: entry.id || String(Date.now()),
          role: "assistant",
          text,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          timestamp: entry.timestamp,
        });
      } else if (role === "toolResult") {
        // 将结果关联到前面的 toolCall
        const toolCallId = msg.toolCallId;
        let resultText = "";
        if (typeof msg.content === "string") {
          resultText = msg.content;
        } else if (Array.isArray(msg.content)) {
          resultText = msg.content
            .map((c: any) => (typeof c === "string" ? c : c.text || JSON.stringify(c)))
            .join("\n");
        }

        if (toolCallId && toolCallMap.has(toolCallId)) {
          const tc = toolCallMap.get(toolCallId)!;
          tc.result = resultText;
          tc.isError = !!msg.isError;
          tc.status = msg.isError ? "error" : "done";
        }
      }
    }
  }

  return messages;
}

export function extractTextFromMessage(message: any): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c: any) => c && c.type === "text")
      .map((c: any) => c.text)
      .join("\n");
  }
  return "";
}

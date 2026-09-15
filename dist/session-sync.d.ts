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
export declare function parseSessionEntriesToMessages(entries: any[]): ChatMessage[];
export declare function extractTextFromMessage(message: any): string;

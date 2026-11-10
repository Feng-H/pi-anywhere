export interface ChatToolCall {
    id: string;
    name: string;
    args?: any;
    result?: any;
    isError?: boolean;
    status: "running" | "done" | "error";
}
export interface ChatImage {
    data: string;
    mimeType: string;
}
export interface ChatMessage {
    id: string;
    role: "user" | "assistant" | "system";
    text: string;
    images?: ChatImage[];
    toolCalls?: ChatToolCall[];
    timestamp?: number | string;
}
export declare function parseSessionEntriesToMessages(entries: any[]): ChatMessage[];
export declare function extractTextFromMessage(message: any): string;
/** 提取消息中的图片块（base64 data + mimeType），供手机端渲染 */
export declare function extractImagesFromMessage(message: any): ChatImage[];

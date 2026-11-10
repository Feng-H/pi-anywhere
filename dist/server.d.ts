export interface RemoteModelInfo {
    provider: string;
    id: string;
    name: string;
    reasoning: boolean;
}
export interface RemoteImage {
    data: string;
    mimeType: string;
}
export interface RemoteContextUsage {
    tokens: number | null;
    contextWindow: number;
    percent: number | null;
}
export interface ServerCallbacks {
    onUserMessage: (text: string, images?: RemoteImage[]) => void | Promise<void>;
    onAbort: () => void | Promise<void>;
    onSwitchModel: (provider: string, modelId: string) => Promise<{
        ok: boolean;
        error?: string;
    }>;
    onSwitchThinkingLevel?: (level: string) => Promise<{
        ok: boolean;
        error?: string;
    }>;
    onCompact?: () => Promise<{
        ok: boolean;
        error?: string;
    }>;
    onNavigateTree?: (entryId: string) => Promise<{
        ok: boolean;
        error?: string;
        switching?: boolean;
    }>;
    onNewSession?: () => Promise<{
        ok: boolean;
        error?: string;
        switching?: boolean;
    }>;
    getTree?: () => any[];
    getInitialState: () => {
        model?: string;
        isIdle: boolean;
        history: any[];
        sessionFile?: string;
        sessionName?: string;
        models?: RemoteModelInfo[];
        modelReasoning?: boolean;
        thinkingLevel?: string;
        contextUsage?: RemoteContextUsage;
    };
}
export interface AnywhereServer {
    port: number;
    token: string;
    localUrl: string;
    lanUrl: string | null;
    broadcast: (data: any) => void;
    close: () => Promise<void>;
}
export declare function getLanIp(): string | null;
export declare function startServer(port: number | undefined, token: string, callbacks: ServerCallbacks): Promise<AnywhereServer>;

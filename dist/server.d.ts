export interface RemoteModelInfo {
    provider: string;
    id: string;
    name: string;
    reasoning: boolean;
}
export interface ServerCallbacks {
    onUserMessage: (text: string) => void | Promise<void>;
    onAbort: () => void | Promise<void>;
    onSwitchModel: (provider: string, modelId: string) => Promise<{
        ok: boolean;
        error?: string;
    }>;
    getInitialState: () => {
        model?: string;
        isIdle: boolean;
        history: any[];
        sessionFile?: string;
        models?: RemoteModelInfo[];
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

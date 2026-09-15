export interface ServerCallbacks {
    onUserMessage: (text: string) => void | Promise<void>;
    onAbort: () => void | Promise<void>;
    getInitialState: () => {
        model?: string;
        isIdle: boolean;
        history: any[];
        sessionFile?: string;
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

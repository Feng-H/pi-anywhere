export interface TunnelHooks {
    /** 隧道意外退出并成功自动重连后回调（URL 已变化，手机需重新扫码） */
    onAutoRestart?: (newUrl: string, restartCount: number) => void;
    /** 自动重连也失败时回调（公网地址失效，局域网地址不受影响） */
    onGiveUp?: () => void;
}
export interface TunnelResult {
    url: string;
    stop: () => void;
}
export declare function startTunnel(localPort: number, hooks?: TunnelHooks): Promise<TunnelResult>;

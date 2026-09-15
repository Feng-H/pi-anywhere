export interface TunnelResult {
    url: string;
    stop: () => void;
}
export declare function startTunnel(localPort: number): Promise<TunnelResult>;

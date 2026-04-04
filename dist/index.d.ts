import EventEmitter from 'node:events';
export declare class XPCConnection extends EventEmitter {
    _connectionId: number;
    _isValid: boolean;
    connect(name: string, flags?: bigint): string | null;
    send(message: any, done?: (err?: any, message?: any) => void): any;
    isValid(): boolean;
    _handleError(error: any): void;
    _cancel(): void;
    cancel(): void;
}
export declare function shutdown(): void;
declare const _default: {
    XPCConnection: typeof XPCConnection;
    shutdown: typeof shutdown;
};
export default _default;

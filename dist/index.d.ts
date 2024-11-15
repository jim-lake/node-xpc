declare const addon: any;
declare const EventEmitter: any;
declare let g_connectCount: number;
declare let g_callbackId: number;
declare const g_emitMap: Map<number, XPCConnection>;
declare const g_callbackMap: Map<number, (err?: any, obj?: any) => void>;
declare class XPCConnection extends EventEmitter {
  _connectionId: number;
  _isValid: boolean;
  connect(name: string, flags?: bigint): string | null;
  send(message: any, done?: (err?: any, message?: any) => void): any;
  isValid(): boolean;
  _handleError(error: any): void;
  cancel(): void;
}
declare function _callback(
  connection_id: number,
  callback_id: number,
  result: any
): void;
declare function _maybeCleanup(): void;

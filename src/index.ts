const addon = require('../build/Release/node_xpc.node');
const EventEmitter = require('node:events');

let g_connectCount = 0;
let g_callbackId = 1;

const g_emitMap = new Map<number, XPCConnection>();
const g_callbackMap = new Map<number, (err?: any, obj?: any) => void>();

class XPCConnection extends EventEmitter {
  _connectionId = 0;
  _isValid = true;
  connect(name: string, flags?: bigint): string | null {
    if (g_connectCount === 0) {
      addon.setup(_callback);
    }
    let ret = addon.connect(name, flags ?? 0n);
    if (typeof ret === 'number') {
      g_connectCount++;
      this._connectionId = ret;
      g_emitMap.set(ret, this);
      ret = null;
    } else {
      _maybeCleanup();
    }
    return ret;
  }
  send(message: any, done?: (err?: any, message?: any) => void) {
    if (!this._connectionId) {
      throw new Error('Not connected');
    }
    let callback_id = 0;
    if (done) {
      callback_id = g_callbackId++;
      g_callbackMap.set(callback_id, done);
    }
    return addon.send(this._connectionId, message, callback_id);
  }
  isValid() {
    return this._isValid;
  }
  _handleError(error: any) {
    if (error === 'XPC_ERROR_CONNECTION_INVALID') {
      this._isValid = false;
      this.emit('connection_invalid');
    }
  }
  cancel() {
    if (this._connectionId) {
      addon.cancel(this._connectionId);
      this._isValid = false;
      this._connectionId = 0;
      this.emit('cancel');
      g_connectCount--;
      _maybeCleanup();
    }
  }
}

function _callback(connection_id: number, callback_id: number, result: any) {
  const obj = g_emitMap.get(connection_id);
  const callback = g_callbackMap.get(callback_id);
  if (obj && result.error) {
    obj._handleError(result.error);
  }

  if (callback) {
    if (result?.error) {
      callback(result?.error, result);
    } else {
      callback(null, result);
    }
  } else if (obj) {
    if (result?.error) {
      obj.emit('error', result?.error, result);
    } else {
      obj.emit('event', result);
    }
  } else {
    console.error(
      'node-xpc: message from unknown connection:',
      connection_id,
      callback_id,
      result
    );
  }
}
function _maybeCleanup() {
  if (g_connectCount === 0) {
    addon.setup(null);
  }
}
exports.XPCConnection = XPCConnection;

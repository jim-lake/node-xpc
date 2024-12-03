const addon = require('../build/Release/node_xpc.node');
const EventEmitter = require('node:events');
let g_connectCount = 0;
let g_callbackId = 1;
let g_isSetup = false;
const g_emitMap = new Map();
const g_callbackMap = new Map();
class XPCConnection extends EventEmitter {
  constructor() {
    super(...arguments);
    this._connectionId = 0;
    this._isValid = true;
  }
  connect(name, flags) {
    if (!g_isSetup) {
      g_isSetup = true;
      addon.setup(_callback);
    }
    let ret = addon.connect(name, flags ?? 0n);
    if (typeof ret === 'number') {
      g_connectCount++;
      this._connectionId = ret;
      g_emitMap.set(ret, this);
      ret = null;
    }
    return ret;
  }
  send(message, done) {
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
  _handleError(error) {
    if (error === 'XPC_ERROR_CONNECTION_INVALID') {
      this._cancel();
      this.emit('connection_invalid');
    }
  }
  _cancel() {
    if (this._connectionId) {
      addon.cancel(this._connectionId);
      this._isValid = false;
      this._connectionId = 0;
      g_connectCount--;
    }
  }
  cancel() {
    this._cancel();
    this.emit('cancel');
  }
}
function shutdown() {
  if (g_connectCount === 0) {
    g_isSetup = false;
    addon.setup(null);
  }
}
function _callback(connection_id, callback_id, result) {
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
exports.XPCConnection = XPCConnection;
exports.shutdown = shutdown;
//# sourceMappingURL=index.js.map

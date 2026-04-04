"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.XPCConnection = void 0;
exports.shutdown = shutdown;
const node_events_1 = __importDefault(require("node:events"));
const node_xpc_node_1 = __importDefault(require("../build/Release/node_xpc.node"));
let g_connectCount = 0;
let g_callbackId = 1;
let g_isSetup = false;
const g_emitMap = new Map();
const g_callbackMap = new Map();
class XPCConnection extends node_events_1.default {
    constructor() {
        super(...arguments);
        this._connectionId = 0;
        this._isValid = true;
    }
    connect(name, flags) {
        if (!g_isSetup) {
            g_isSetup = true;
            node_xpc_node_1.default.setup(_callback);
        }
        let ret = node_xpc_node_1.default.connect(name, flags ?? 0n);
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
        return node_xpc_node_1.default.send(this._connectionId, message, callback_id);
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
            node_xpc_node_1.default.cancel(this._connectionId);
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
exports.XPCConnection = XPCConnection;
function shutdown() {
    if (g_connectCount === 0) {
        g_isSetup = false;
        node_xpc_node_1.default.setup(null);
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
        }
        else {
            callback(null, result);
        }
    }
    else if (obj) {
        if (result?.error) {
            obj.emit('error', result?.error, result);
        }
        else {
            obj.emit('event', result);
        }
    }
    else {
        console.error('node-xpc: message from unknown connection:', connection_id, callback_id, result);
    }
}
exports.default = { XPCConnection, shutdown };

#include "xpc_bridge.h"

using namespace Napi;

static ThreadSafeFunction g_tsfn = NULL;
static uint32_t g_connectionId = 1;

struct CallbackParams {
  uint32_t connection_id;
  uint32_t callback_id;
  xpc_object_t obj;
};
static auto napiCallback = [](Env env, Function cb, CallbackParams *params) {
  const auto value = xpcToValue(env, params->obj);
  cb.Call({Number::New(env, params->connection_id),
           Number::New(env, params->callback_id), value});
  if (params->obj != NULL) {
    xpc_release(params->obj);
  }
  delete params;
};
static void _callback(const uint32_t connection_id, const uint32_t callback_id,
                      xpc_object_t obj) {
  if (g_tsfn != NULL) {
    const auto params = new CallbackParams();
    params->connection_id = connection_id;
    params->callback_id = callback_id;
    params->obj = obj;
    if (g_tsfn.BlockingCall(params, napiCallback) == napi_closing) {
      g_tsfn.Release();
      g_tsfn = NULL;
    }
  } else {
    printf("node-xpc: No threadsafefunction available!\n");
  }
}
Value Setup(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() < 1) {
    ret = String::New(env, "Expected 1 argument");
  } else if (info[0].IsNull()) {
    if (g_tsfn != NULL) {
      g_tsfn.Abort();
      g_tsfn.Release();
      g_tsfn = NULL;
    }
  } else if (info[0].IsFunction()) {
    const auto cb = info[0].As<Function>();
    if (g_tsfn != NULL) {
      g_tsfn.Abort();
      g_tsfn.Release();
      g_tsfn = NULL;
    }
    g_tsfn = ThreadSafeFunction::New(env, cb, "XPC Callback", 0, 1);
  } else {
    ret = String::New(env, "Expected function or null arg 0");
  }
  return ret;
}
Value Connect(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() < 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsString()) {
    ret = String::New(env, "Expected string arg 0");
  } else if (!info[1].IsBigInt()) {
    ret = String::New(env, "Expected BigInt arg 1");
  } else {
    const uint32_t connection_id = g_connectionId++;
    bool ignore;
    const auto result =
        bridge_connect(connection_id, info[0].As<String>().Utf8Value(),
                       info[1].As<BigInt>().Uint64Value(&ignore));
    if (result.empty()) {
      ret = Number::New(env, connection_id);
    } else {
      ret = String::New(env, result);
    }
  }
  return ret;
}
Value Send(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() < 2) {
    ret = String::New(env, "Expected 2 arguments");
  } else if (!info[0].IsNumber()) {
    ret = String::New(env, "Expected number arg 0");
  } else {
    const uint32_t connection_id = info[0].As<Number>().Uint32Value();
    uint32_t callback_id = 0;
    if (info.Length() > 2 && info[2].IsNumber()) {
      callback_id = info[2].As<Number>().Uint32Value();
    }
    const auto result = bridge_send(connection_id, info[1], callback_id);
    if (!result.empty()) {
      ret = String::New(env, result);
    }
  }
  return ret;
}
Value Cancel(const Napi::CallbackInfo &info) {
  const Napi::Env env = info.Env();
  Value ret = env.Null();

  if (info.Length() < 1) {
    ret = String::New(env, "Expected 1 argument");
  } else if (!info[0].IsNumber()) {
    ret = String::New(env, "Expected number arg 0");
  } else {
    const uint32_t connection_id = info[0].As<Number>().Uint32Value();
    const auto result = bridge_cancel(connection_id);
    if (!result.empty()) {
      ret = String::New(env, result);
    }
  }
  return ret;
}
Object Init(Napi::Env env, Object exports) {
  bridge_setup(_callback);
  exports.Set("setup", Function::New(env, Setup));
  exports.Set("connect", Function::New(env, Connect));
  exports.Set("send", Function::New(env, Send));
  exports.Set("cancel", Function::New(env, Cancel));
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, Init)

#include "xpc_bridge.h"
#include <dispatch/dispatch.h>
#include <map>

using namespace Napi;

static Callback g_callback = NULL;
static dispatch_queue_t g_queue = NULL;
static auto g_map = new std::map<uint32_t, xpc_connection_t>();

void bridge_setup(Callback func) {
  g_callback = func;
  if (g_queue == NULL) {
    g_queue =
        dispatch_queue_create("com.node.xpc-queue", DISPATCH_QUEUE_SERIAL);
  }
}
std::string bridge_connect(const uint32_t connection_id, const std::string name,
                           uint64_t flags) {
  std::string ret = "";
  const auto conn =
      xpc_connection_create_mach_service(name.c_str(), g_queue, flags);
  if (conn == NULL) {
    ret = "create_failed";
  } else {
    g_map->insert({connection_id, conn});
    xpc_connection_set_event_handler(conn, ^(xpc_object_t obj) {
      xpc_retain(obj);
      g_callback(connection_id, 0, obj);
    });
    xpc_connection_resume(conn);
  }
  return ret;
}
std::string bridge_cancel(const uint32_t connection_id) {
  std::string ret = "";
  const auto iter = g_map->find(connection_id);
  if (iter == g_map->end()) {
    ret = "connection_not_found";
  } else {
    xpc_connection_cancel(iter->second);
    g_map->erase(connection_id);
  }
  return ret;
}
std::string bridge_send(const uint32_t connection_id, Napi::Value value,
                        uint32_t callback_id) {
  std::string ret = "";
  const auto iter = g_map->find(connection_id);
  if (iter == g_map->end()) {
    ret = "connection_not_found";
  } else {
    xpc_object_t obj = valueToXpc(value);
    if (callback_id > 0) {
      xpc_connection_send_message_with_reply(
          iter->second, obj, g_queue, ^(xpc_object_t _Nonnull reply) {
            xpc_retain(reply);
            g_callback(connection_id, callback_id, reply);
          });
    } else {
      xpc_connection_send_message(iter->second, obj);
    }
    if (obj != NULL) {
      xpc_release(obj);
    }
  }
  return ret;
}
Napi::Value xpcToValue(Napi::Env env, const xpc_object_t obj) {
  Value ret = env.Undefined();
  xpc_type_t type = xpc_get_type(obj);

  if (type == XPC_TYPE_ERROR) {
    const auto out = Object::New(env);
    if (obj == XPC_ERROR_CONNECTION_INTERRUPTED) {
      out.Set("error", String::New(env, "XPC_ERROR_CONNECTION_INTERRUPTED"));
    } else if (obj == XPC_ERROR_CONNECTION_INVALID) {
      out.Set("error", String::New(env, "XPC_ERROR_CONNECTION_INVALID"));
    } else if (obj == XPC_ERROR_TERMINATION_IMMINENT) {
      out.Set("error", String::New(env, "XPC_ERROR_TERMINATION_IMMINENT"));
    } else {
      out.Set("error", String::New(env, xpc_dictionary_get_string(
                                            obj, XPC_ERROR_KEY_DESCRIPTION)));
    }
    ret = out;
  } else if (type == XPC_TYPE_INT64) {
    ret = BigInt::New(env, xpc_int64_get_value(obj));
  } else if (type == XPC_TYPE_UINT64) {
    ret = BigInt::New(env, xpc_uint64_get_value(obj));
  } else if (type == XPC_TYPE_STRING) {
    ret = String::New(env, xpc_string_get_string_ptr(obj));
  } else if (type == XPC_TYPE_DICTIONARY) {
    auto out = Object::New(env);
    xpc_dictionary_apply(obj, ^bool(const char *key, xpc_object_t value) {
      out.Set(key, xpcToValue(env, value));
      return true;
    });
    ret = out;
  } else if (type == XPC_TYPE_ARRAY) {
    auto out = Array::New(env);
    xpc_array_apply(obj, ^bool(size_t index, xpc_object_t value) {
      out.Set(index, xpcToValue(env, value));
      return true;
    });
    ret = out;
  } else if (type == XPC_TYPE_DATA) {
    ret = Buffer<uint8_t>::Copy(env, (uint8_t *)xpc_data_get_bytes_ptr(obj),
                                xpc_data_get_length(obj));
  } else if (type == XPC_TYPE_UUID) {
    ret = Buffer<uint8_t>::Copy(env, (uint8_t *)xpc_uuid_get_bytes(obj),
                                sizeof(uuid_t));
  } else {
    printf("node-xpc: Could not convert to value!, %s\n",
           xpc_copy_description(obj));
  }
  return ret;
}
xpc_object_t valueToXpc(Napi::Value value) {
  xpc_object_t ret = NULL;
  if (value.IsString()) {
    ret = xpc_string_create(value.As<String>().Utf8Value().c_str());
  } else if (value.IsBigInt()) {
    bool ignore;
    ret = xpc_uint64_create(value.As<BigInt>().Uint64Value(&ignore));
  } else if (value.IsNumber()) {
    ret = xpc_int64_create(value.As<Number>().Int64Value());
  } else if (value.IsBuffer()) {
    const auto buf = value.As<Buffer<uint8_t>>();
    ret = xpc_data_create(buf.Data(), buf.Length());
  } else if (value.IsNull()) {
    ret = NULL;
  } else if (value.IsArray()) {
    ret = xpc_array_create(NULL, 0);
    const auto array = value.As<Array>();
    const auto len = array.Length();
    for (uint32_t i = 0; i < len; i++) {
      xpc_object_t element = valueToXpc(array.Get(i));
      xpc_array_append_value(ret, element);
      if (element != NULL) {
        xpc_release(element);
      }
    }
  } else if (value.IsObject()) {
    ret = xpc_dictionary_create(NULL, NULL, 0);
    const auto obj = value.As<Object>();
    const auto keys = obj.GetPropertyNames();
    const auto len = keys.Length();
    for (uint32_t i = 0; i < len; i++) {
      const auto key = keys.Get(i);
      if (key.IsString()) {
        xpc_object_t element = valueToXpc(obj.Get(key));
        xpc_dictionary_set_value(ret, key.As<String>().Utf8Value().c_str(),
                                 element);
        if (element != NULL) {
          xpc_release(element);
        }
      }
    }
  } else {
    printf("node-xpc: failed valueToXpc: type: %d, string: %s\n", value.Type(),
           value.ToString().Utf8Value().c_str());
  }
  return ret;
}

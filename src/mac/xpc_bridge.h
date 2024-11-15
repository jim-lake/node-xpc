#include <napi.h>
#include <string>
#include <xpc/xpc.h>

typedef void (*Callback)(const uint32_t connection_id,
                         const uint32_t callback_id, xpc_object_t obj);

extern void bridge_setup(Callback func);
extern std::string bridge_connect(const uint32_t connection_id,
                                  const std::string name, const uint64_t flags);
extern std::string bridge_send(const uint32_t connection_id, Napi::Value value,
                               uint32_t callback_id);
extern std::string bridge_cancel(const uint32_t connection_id);

extern Napi::Value xpcToValue(Napi::Env env, const xpc_object_t obj);
extern xpc_object_t valueToXpc(Napi::Value value);

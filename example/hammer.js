const xpc = require('../dist/index');

console.log('start');

let g_conn = null;

function getConnection(name, flags) {
  if (g_conn && !g_conn.isValid()) {
    g_conn = null;
  }

  if (!g_conn) {
    g_conn = new xpc.XPCConnection();
    g_conn.on('error', function (error) {
      if (error === 'XPC_ERROR_CONNECTION_INVALID') {
        g_conn = null;
      }
      console.log('error:', error);
    });
    g_conn.on('event', function (event) {
      console.log('event:', event);
    });
    g_conn.connect(name, flags);
  }
  return g_conn;
}

setInterval(() => {
  const conn = getConnection('com.ares.test.server2', 0n);

  console.log('send');
  conn.send({
    f: 33n,
    root: Buffer.from('1234', 'hex'),
    proxynum: 1n,
    replysig: `v12@?0B8`,
    sequence: 1n,
  });
  console.log('send done');

  console.log('send with done');
  conn.send(
    {
      f: 33n,
      root: Buffer.from('1234', 'hex'),
      proxynum: 1n,
      replysig: `v12@?0B8`,
      sequence: 1n,
    },
    (err, result) => {
      console.log('done:', err, result);
    }
  );
  console.log('send with done done');
}, 1000);

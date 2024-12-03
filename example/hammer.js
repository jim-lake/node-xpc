const xpc = require('../dist/index');

const interval = parseInt(process.argv.pop()) || 1000;
console.log('start: interval:', interval);

let g_conn = null;
let g_count = 0;

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

  console.log('send:', g_count++);
  conn.send({
    f: 33n,
    root: Buffer.from('1234', 'hex'),
    proxynum: 1n,
    replysig: `v12@?0B8`,
    sequence: 1n,
  });
  //console.log('send done');

  //console.log('send with done');
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
  //console.log('send with done done');
}, interval);

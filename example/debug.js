const { XPCConnection } = require('../dist/index');

const VALUE_NULL = Buffer.from('e0', 'hex');

//const SERVICE_NAME = 'com.ares.test.server';
//const SERVICE_FLAGS = 0n;
const SERVICE_NAME = 'com.ares.client.extension.xpc';
const SERVICE_FLAGS = 2n;

let g_conn = null;

function _getConnect() {
  if (g_conn && !g_conn.isValid()) {
    g_conn.cancel();
    g_conn = null;
  }

  let ret = g_conn;
  if (!ret) {
    g_conn = new XPCConnection();
    g_conn.on('error', function (message) {
      console.error('error:', message);
    });
    g_conn.on('event', function (event) {
      console.log('event:', event);
    });
    g_conn.connect(SERVICE_NAME, SERVICE_FLAGS);
  }
  console.log('setup done');
  return g_conn;
}

ping(pingLater);
function ping(done) {
  const conn = _getConnect();
  console.log('ping');
  const message4 = {
    f: 33n,
    root: Buffer.from(
      '62706c6973743137a033000000000000007b697352756e6e696e673a007c76323440303a38403f313600a03300000000000000e0',
      'hex'
    ),
    proxynum: 1n,
    replysig: `v12@?0B8`,
    sequence: 1n,
  };
  conn.send(message4, (err, message) => {
    if (err) {
      console.log('reply: error:', err, message);
    } else if (message.root) {
      console.log(message.root.toString('hex'));
    } else {
      console.log('reply: message:', message);
    }
    done();
  });
}
function pingLater() {
  console.log('pingLater');
  setTimeout(ping.bind(null, pingLater), 1000);
}

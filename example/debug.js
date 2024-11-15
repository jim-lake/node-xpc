const { XPCConnection } = require('../dist/index');

console.log('start');
const conn = new XPCConnection();

conn.on('error', function (message, reply_num) {
  console.log('error:', message, reply_num);
});

conn.on('event', function (event, reply_num) {
  console.log('event:', event, reply_num);
});

console.log('connect');
conn.connect('com.ares.test.server2', 0n);
console.log('connect done');

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

conn.cancel();

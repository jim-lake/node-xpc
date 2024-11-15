const xpc = require('../dist/index');

console.log('start');
const conn1 = new xpc.XPCConnection();
conn1.on('error', function (message, reply_num) {
  console.log('error:', message, reply_num);
});
conn1.on('event', function (event, reply_num) {
  console.log('event:', event, reply_num);
});

console.log('connect');
conn1.connect('com.ares.test.server2', 0n);
console.log('connect done');

console.log('send');
conn1.send({
  f: 33n,
  root: Buffer.from('1234', 'hex'),
  proxynum: 1n,
  replysig: `v12@?0B8`,
  sequence: 1n,
});
console.log('send done');

console.log('start2');
const conn2 = new xpc.XPCConnection();
conn2.on('error', function (message, reply_num) {
  console.log('error2:', message, reply_num);
});
conn2.on('event', function (event, reply_num) {
  console.log('even2t:', event, reply_num);
});

console.log('connect2');
conn2.connect('com.ares.test.server2', 0n);
console.log('connect2 done');

console.log('send2');
conn2.send({
  f: 33n,
  root: Buffer.from('1234', 'hex'),
  proxynum: 1n,
  replysig: `v12@?0B8`,
  sequence: 1n,
});
console.log('send2 done');

conn1.cancel();
conn2.cancel();

const net = require('node:net');

const connect = net.Socket.prototype.connect;
const localHosts = new Set(['127.0.0.1', '::1', 'localhost']);
const fixturePorts = new Set([process.env.PORT, process.env.DB_PORT].filter(Boolean));
net.Socket.prototype.connect = function (...args) {
  const input = Array.isArray(args[0]) ? args[0][0] : args[0];
  const host = typeof input === 'object' ? input.host : args[1];
  const port = typeof input === 'object' ? input.port : input;
  if (localHosts.has(host) && fixturePorts.has(String(port))) return connect.apply(this, args);

  const error = Object.assign(new Error('Playwright fixture permits only its app and database'), {
    code: 'ECONNREFUSED',
  });
  queueMicrotask(() => this.destroy(error));
  return this;
};

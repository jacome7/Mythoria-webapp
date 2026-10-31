// Jest stub for CSS modules: `styles.foo` resolves to 'foo'.
module.exports = new Proxy(
  {},
  { get: (_target, key) => (key === '__esModule' ? false : String(key)) },
);

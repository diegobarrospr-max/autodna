// Stub for native-only modules when bundling for web.
// react-native-screens, expo-secure-store, and similar libraries import
// native internals that have no meaningful web implementation. The metro
// resolver in metro.config.js redirects those imports here on platform=web.

module.exports = new Proxy(
  {},
  {
    get() {
      return () => null;
    },
  },
);

module.exports.default = module.exports;

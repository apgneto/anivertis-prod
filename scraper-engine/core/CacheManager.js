// core/CacheManager.js
const NodeCache = require('node-cache');

// Cache com TTL de 24 horas (86400 segundos)
const cache = new NodeCache({ 
  stdTTL: 86400,
  checkperiod: 3600 
});

class CacheManager {
  static get(key) {
    return cache.get(key);
  }

  static set(key, value, ttl = 86400) {
    return cache.set(key, value, ttl);
  }

  static del(key) {
    return cache.del(key);
  }

  static flush() {
    return cache.flushAll();
  }

  static stats() {
    return cache.getStats();
  }
}

module.exports = CacheManager;
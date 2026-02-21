// collectors/SourceRunner.js
const ScraperFactory = require('../core/ScraperFactory');
const RetryManager = require('../core/RetryManager');
const CacheManager = require('../core/CacheManager');

class SourceRunner {
  constructor(source) {
    this.source = source;
  }

  async run() {
    const cacheKey = `source:${this.source.id}:${new Date().toISOString().split('T')[0]}`;
    
    // 1. Verificar cache
    const cached = CacheManager.get(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${this.source.nome}`);
      return cached;
    }

    // 2. Executar com retry
    try {
      const scraper = ScraperFactory.create(this.source);
      
      const result = await RetryManager.execute(
        () => scraper.execute(),
        3,
        2000
      );

      // 3. Salvar no cache
      CacheManager.set(cacheKey, {
        sourceId: this.source.id,
        sourceName: this.source.nome,
        data: result,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      throw new Error(`SourceRunner [${this.source.nome}]: ${error.message}`);
    }
  }
}

module.exports = SourceRunner;
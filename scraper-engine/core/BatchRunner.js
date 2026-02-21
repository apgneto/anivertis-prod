const ScraperFactory = require('./ScraperFactory');

class BatchRunner {
  constructor(sources) {
    this.sources = sources;
    this.results = {
      success: [],
      failed: [],
      total: sources.length,
      startTime: null,
      endTime: null
    };
  }

  async runAll() {
    this.results.startTime = new Date();
    console.log('\n🚀 INICIANDO COLETA ANIVERTIS...\n');

    const tier1 = this.sources.filter(s => s.layer === 1);
    const tier2 = this.sources.filter(s => s.layer === 2);
    const tier3 = this.sources.filter(s => s.layer === 3 || !s.layer);

    console.log(`🔴 TIER 1 - FONTES OFICIAIS (${tier1.length})`);
    await this.runBatch(tier1);

    console.log(`\n🟡 TIER 2 - FONTES SETORIAIS (${tier2.length})`);
    await this.runBatch(tier2);

    console.log(`\n🔵 TIER 3 - NOTÍCIAS E PORTAIS (${tier3.length})`);
    await this.runBatch(tier3);

    this.results.endTime = new Date();
    return this.results;
  }

  async runBatch(batch) {
    const promises = batch.map(async (source) => {
      try {
        const scraper = ScraperFactory.create(source);
        const data = await scraper.execute();
        
        const articles = Array.isArray(data) ? data : [data];
        this.results.success.push({ source, articles });
        console.log(`✅ ${source.nome}: ${articles.length} artigos`);
      } catch (error) {
        this.results.failed.push({ source, error: error.message });
        console.log(`❌ ${source.nome}: ${error.message}`);
      }
    });
    await Promise.all(promises);
  }
}

module.exports = BatchRunner;
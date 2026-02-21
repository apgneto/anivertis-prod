// collectors/BatchRunner.js
const SourceRunner = require('./SourceRunner');

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
    
    console.log('\n🚀 INICIANDO COLETA DE 65 FONTES...\n');

    // Separar por prioridade
    const tier1 = this.sources.filter(s => s.id <= 23);
    const tier2 = this.sources.filter(s => s.id > 23 && s.id < 49);
    const tier3 = this.sources.filter(s => s.id >= 49);

    // Executar Tier 1 (prioridade máxima)
    console.log('🔴 TIER 1 - FONTES OFICIAIS');
    await this.runBatch(tier1);

    // Executar Tier 2
    console.log('\n🟡 TIER 2 - FONTES SETORIAIS');
    await this.runBatch(tier2);

    // Executar Tier 3
    console.log('\n🔵 TIER 3 - MÍDIA/RSS');
    await this.runBatch(tier3);

    this.results.endTime = new Date();
    
    this.printReport();
    return this.results;
  }

  async runBatch(batch) {
    for (const source of batch) {
      try {
        const runner = new SourceRunner(source);
        const data = await runner.run();
        
        this.results.success.push({
          id: source.id,
          nome: source.nome,
          status: 'success'
        });
        
        console.log(`✅ ${source.id}: ${source.nome}`);

      } catch (error) {
        this.results.failed.push({
          id: source.id,
          nome: source.nome,
          error: error.message
        });
        
        console.log(`❌ ${source.id}: ${source.nome} - ${error.message}`);
      }

      // Pequena pausa entre requisições
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  printReport() {
    const elapsed = (this.results.endTime - this.results.startTime) / 1000;
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DE COLETA');
    console.log('='.repeat(60));
    console.log(`\n⏱️  Tempo total: ${elapsed.toFixed(1)}s`);
    console.log(`📦 Total de fontes: ${this.results.total}`);
    console.log(`✅ Sucesso: ${this.results.success.length}`);
    console.log(`❌ Falhas: ${this.results.failed.length}`);
    console.log(`📈 Taxa de sucesso: ${((this.results.success.length / this.results.total) * 100).toFixed(1)}%`);
    
    if (this.results.failed.length > 0) {
      console.log('\n❌ FONTES COM FALHA:');
      this.results.failed.forEach(f => {
        console.log(`   - ${f.nome}: ${f.error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
  }
}

module.exports = BatchRunner;
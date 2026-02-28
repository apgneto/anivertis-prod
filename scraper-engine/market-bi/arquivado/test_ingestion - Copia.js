const MarketBIPipeline = require('./MarketBIPipeline');

(async () => {
  try {
    const pipeline = new MarketBIPipeline();

    await pipeline.run({
      ativo_codigo: 'SEBO_BOVINO_SP',
      url: 'https://www.scotconsultoria.com.br/cotacoes/couro-e-sebo/',
      unidade_origem: 'R$/kg'
    });

    console.log('✔ Ingestion Test Finalizado');
  } catch (e) {
    console.error('✖ Erro no teste:', e);
  }
})();
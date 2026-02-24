const fs = require('fs');
const path = require('path');
const { scrapeRacoesProdComex } = require('./RacoesProdScraperComex');
const { scrapeRacoesProdSindiracoes } = require('./RacoesProdScraperSindiracoes');
const { runRacoesProdMetrics } = require('./RacoesProdMetricsEngine');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
async function run() {
  if (!fs.existsSync(dbPath)) { console.error('❌ Banco não encontrado em:', dbPath); process.exit(1); }
  const args = process.argv.slice(2);
  const runAll = args.length === 0;
  const runScrape = runAll || args.includes('--scrape');
  const runMetrics = runAll || args.includes('--metrics');
  const runPredict = runAll || args.includes('--predict');
  let scrapersOk = 0, totalScrapers = 2, registros = 0, erros = 0;
  if (runScrape) {
    for (const r of [await scrapeRacoesProdComex(), await scrapeRacoesProdSindiracoes()]) {
      if (r.success) { scrapersOk += 1; registros += Number(r.novosRegistros || 0); }
      else { erros += 1; console.error('❌', r.error); }
    }
  } else { totalScrapers = 0; }
  if (runMetrics) {
    try { const m = await runRacoesProdMetrics(); registros += Number(m.metricasInseridas || 0); }
    catch (error) { erros += 1; console.error('❌ RACOES PROD metrics:', error.message); }
  }
  if (runPredict) console.log('ℹ️ Predição ainda não implementada para RAÇÕES PRODUÇÃO.');
  console.log('✅ RACOES PROD - Resumo da execução');
  console.log(`   Scrapers: ${scrapersOk}/${totalScrapers} concluídos`);
  console.log(`   Registros novos: ${registros}`);
  console.log(`   Erros: ${erros}`);
}
if (require.main === module) run();
module.exports = { run };

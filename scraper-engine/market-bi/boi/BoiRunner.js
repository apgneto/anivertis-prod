const fs = require('fs');
const path = require('path');
const { scrapeBoiCepea } = require('./BoiScraperCEPEA');
const { scrapeBoiIMEA } = require('./BoiScraperIMEA');
const { scrapeBoiSecex } = require('./BoiScraperSecex');
const { runBoiMetrics } = require('./BoiMetricsEngine');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
async function run() {
  if (!fs.existsSync(dbPath)) { console.error('❌ Banco não encontrado em:', dbPath); process.exit(1); }
  const args = process.argv.slice(2);
  const runAll = args.length === 0;
  const runScrape = runAll || args.includes('--scrape');
  const runMetrics = runAll || args.includes('--metrics');
  const runPredict = runAll || args.includes('--predict');
  let totalScrapers = 3, scrapersOk = 0, registros = 0, erros = 0;
  if (runScrape) {
    for (const scraper of [scrapeBoiCepea, scrapeBoiIMEA, scrapeBoiSecex]) {
      const res = await scraper();
      if (res.success) { scrapersOk += 1; registros += Number(res.novosRegistros || 0); }
      else { erros += 1; console.error('❌', res.ativo_id, res.error); }
    }
  } else { totalScrapers = 0; }
  if (runMetrics) {
    try { const r = await runBoiMetrics(); registros += Number(r.metricasInseridas || 0); }
    catch (error) { erros += 1; console.error('❌ BOI metrics:', error.message); }
  }
  if (runPredict) console.log('ℹ️ Predição ainda não implementada para BOI.');
  console.log('✅ BOI - Resumo da execução');
  console.log(`   Scrapers: ${scrapersOk}/${totalScrapers} concluídos`);
  console.log(`   Registros novos: ${registros}`);
  console.log(`   Erros: ${erros}`);
}
if (require.main === module) run();
module.exports = { run };

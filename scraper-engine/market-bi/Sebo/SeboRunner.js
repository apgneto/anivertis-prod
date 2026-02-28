const fs = require('fs');
const path = require('path');
const { scrapeScot } = require('./SeboScraperScot');
const { scrapeAbisa } = require('./SeboScraperAbisa');
const { runSeboMetrics } = require('./SeboMetricsEngine');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

async function run() {
    if (!fs.existsSync(dbPath)) {
        console.error('❌ Banco não encontrado em:', dbPath);
        process.exit(1);
    }

    const args = process.argv.slice(2);
    const runAll = args.length === 0;
    const runScrape = runAll || args.includes('--scrape');
    const runMetrics = runAll || args.includes('--metrics');

    let scrapersOk = 0;
    let totalScrapers = 2;
    let registros = 0;
    let erros = 0;

    if (runScrape) {
        const resScot = await scrapeScot();
        if (resScot.success) {
            scrapersOk += 1;
            registros += Number(resScot.novosRegistros || 0);
            console.log(`✅ SCOT: ${resScot.novosRegistros || 0} registros`);
        } else if (!resScot.softFail) {
            erros += 1;
            console.error(`❌ SCOT: ${resScot.error}`);
        } else {
            console.log(`⚠️ SCOT: ${resScot.error} (softFail)`);
        }

        const resAbisa = await scrapeAbisa();
        if (resAbisa.success) {
            scrapersOk += 1;
            registros += Number(resAbisa.novosRegistros || 0);
            console.log(`✅ ABISA: ${resAbisa.novosRegistros || 0} registros`);
        } else if (!resAbisa.softFail) {
            erros += 1;
            console.error(`❌ ABISA: ${resAbisa.error}`);
        } else {
            console.log(`⚠️ ABISA: ${resAbisa.error} (softFail)`);
        }
    } else {
        totalScrapers = 0;
    }

    if (runMetrics) {
        try {
            const resMetrics = await runSeboMetrics();
            registros += Number(resMetrics.calculados || 0);
            console.log(`✅ Métricas: ${resMetrics.calculados || 0} calculadas`);
        } catch (error) {
            erros += 1;
            console.error(`❌ SEBO metrics: ${error.message}`);
        }
    }

    console.log('\n✅ SEBO - Resumo da execução');
    console.log(`Scrapers: ${scrapersOk}/${totalScrapers} concluídos`);
    console.log(`Registros novos: ${registros}`);
    console.log(`Erros: ${erros}`);

    return { scrapersOk, totalScrapers, registros, erros };
}

if (require.main === module) {
    run().catch((err) => {
        console.error('❌ Erro fatal no runner:', err);
        process.exit(1);
    });
}

module.exports = { run };
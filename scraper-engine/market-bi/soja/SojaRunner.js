// market-bi/soja/SojaRunner.js
const fs = require('fs');
const path = require('path');
const { scrapeCepea } = require('./SojaScraperCEPEA');
const { scrapeNA } = require('./SojaScraperNA');
const { scrapeYahoo } = require('./SojaScraperYahoo');
const { scrapeIMEA } = require('./SojaScraperIMEA');
const { scrapeABISA } = require('./SojaScraperABISA');
const { consolidarSoja } = require('./SojaConsolidator');

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
    let totalScrapers = 5;
    let registros = 0;
    let erros = 0;

    if (runScrape) {
        console.log('\n🌾 INICIANDO SCRAPERS SOJA\n');

        const resCEPEA = await scrapeCepea();
        if (resCEPEA.success) {
            scrapersOk += 1;
            registros += Number(resCEPEA.novosRegistros || 0);
            console.log(`✅ CEPEA: ${resCEPEA.novosRegistros || 0} registros`);
        } else if (!resCEPEA.softFail) {
            erros += 1;
            console.error(`❌ CEPEA: ${resCEPEA.error}`);
        } else {
            console.log(`⚠️ CEPEA: ${resCEPEA.error} (softFail)`);
        }

        const resNA = await scrapeNA();
        if (resNA.success) {
            scrapersOk += 1;
            registros += Number(resNA.novosRegistros || 0);
            console.log(`✅ Notícias Agrícolas: ${resNA.novosRegistros || 0} registros`);
        } else if (!resNA.softFail) {
            erros += 1;
            console.error(`❌ Notícias Agrícolas: ${resNA.error}`);
        } else {
            console.log(`⚠️ Notícias Agrícolas: ${resNA.error} (softFail)`);
        }

        const resYahoo = await scrapeYahoo();
        if (resYahoo.success) {
            scrapersOk += 1;
            registros += Number(resYahoo.novosRegistros || 0);
            console.log(`✅ Yahoo/BACEN: ${resYahoo.novosRegistros || 0} registros`);
        } else if (!resYahoo.softFail) {
            erros += 1;
            console.error(`❌ Yahoo/BACEN: ${resYahoo.error}`);
        } else {
            console.log(`⚠️ Yahoo/BACEN: ${resYahoo.error} (softFail)`);
        }

        const resIMEA = await scrapeIMEA();
        if (resIMEA.success) {
            scrapersOk += 1;
            registros += Number(resIMEA.novosRegistros || 0);
            console.log(`✅ IMEA: ${resIMEA.novosRegistros || 0} registros`);
        } else if (!resIMEA.softFail) {
            erros += 1;
            console.error(`❌ IMEA: ${resIMEA.error}`);
        } else {
            console.log(`⚠️ IMEA: ${resIMEA.error} (softFail)`);
        }

        const resABISA = await scrapeABISA();
        if (resABISA.success) {
            scrapersOk += 1;
            registros += Number(resABISA.novosRegistros || 0);
            console.log(`✅ ABISA: ${resABISA.novosRegistros || 0} registros`);
        } else if (!resABISA.softFail) {
            erros += 1;
            console.error(`❌ ABISA: ${resABISA.error}`);
        } else {
            console.log(`⚠️ ABISA: ${resABISA.error} (softFail)`);
        }
    } else {
        totalScrapers = 0;
    }

    if (runMetrics) {
        try {
            const resMetrics = await consolidarSoja();
            registros += Number(resMetrics.calculados || 0);
            console.log(`✅ Métricas: ${resMetrics.calculados || 0} calculadas`);
        } catch (error) {
            erros += 1;
            console.error(`❌ SOJA metrics: ${error.message}`);
        }
    }

    console.log('\n✅ SOJA - Resumo da execução');
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
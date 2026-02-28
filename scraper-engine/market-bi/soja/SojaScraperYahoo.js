// market-bi/soja/SojaScraperYahoo.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

const ATIVOS = {
    CBOT: {
        ativo_id: 'SOJA_FUTURO_CBOT',
        unidade_origem: 'USD/bu',
        unidade_destino: 'USD/bu',
        fonte: 'YahooFinance',
        tier: 1,
        url: 'https://query1.finance.yahoo.com/v8/finance/chart/ZS=F'
    },
    PTAX: {
        ativo_id: 'USD_BRL',
        unidade_origem: 'BRL',
        unidade_destino: 'BRL',
        fonte: 'BACEN_PTAX',
        tier: 1,
        url: 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo'
    }
};

function gerarHash(ativo_id, valor_bruto, data_referencia) {
    return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}

function salvarPreco(ativo, dataReferencia, valorBruto, valorNormalizado, rawPayload) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        const hash = gerarHash(ativo.ativo_id, valorBruto.toString(), dataReferencia);
        db.run(
            `INSERT OR IGNORE INTO market_bi_precos (
                ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino,
                fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                ativo.ativo_id,
                valorBruto.toString(),
                valorNormalizado,
                ativo.unidade_origem,
                ativo.unidade_destino,
                ativo.fonte,
                ativo.tier,
                hash,
                dataReferencia,
                rawPayload || null
            ],
            function onRun(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes || 0);
            }
        );
    });
}

async function getPTAX() {
    const today = new Date();
    const past = new Date();
    past.setDate(today.getDate() - 7);

    const format = (d) => `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}-${d.getFullYear()}`;

    const url = `${ATIVOS.PTAX.url}(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${format(past)}'&@dataFinalCotacao='${format(today)}'&$orderby=dataHoraCotacao desc&$top=1&$format=json`;

    const response = await axios.get(url);
    if (!response.data.value.length) throw new Error('Nenhuma PTAX encontrada');
    return response.data.value[0].cotacaoVenda;
}

async function getCBOT() {
    const response = await axios.get(ATIVOS.CBOT.url, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const chart = response.data.chart;
    const result = chart.result[0];
    const meta = result.meta;
    const quote = result.indicators.quote[0];
    const close = quote.close[quote.close.length - 1];
    return close;
}

async function scrapeYahoo() {
    let novosRegistros = 0;
    const resultados = [];
    const dataReferencia = new Date().toISOString().slice(0, 10);
    const dataReferenciaCBOT = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    try {
        // CBOT
        try {
            const cbotValor = await getCBOT();
            const rawPayload = JSON.stringify({
                fonte: 'YahooFinance',
                url: ATIVOS.CBOT.url,
                coletado_em: new Date().toISOString()
            });

            if (cbotValor !== null) {
                novosRegistros += await salvarPreco(
                    ATIVOS.CBOT,
                    dataReferenciaCBOT,
                    cbotValor.toString(),
                    cbotValor,
                    rawPayload
                );
                resultados.push({ ativo: ATIVOS.CBOT.ativo_id, valor: cbotValor, data: dataReferenciaCBOT });
            }
        } catch (error) {
            resultados.push({ ativo: ATIVOS.CBOT.ativo_id, error: error.message });
        }

        // PTAX
        try {
            const ptaxValor = await getPTAX();
            const rawPayload = JSON.stringify({
                fonte: 'BACEN_PTAX',
                url: ATIVOS.PTAX.url,
                coletado_em: new Date().toISOString()
            });

            if (ptaxValor !== null) {
                novosRegistros += await salvarPreco(
                    ATIVOS.PTAX,
                    dataReferencia,
                    ptaxValor.toString(),
                    ptaxValor,
                    rawPayload
                );
                resultados.push({ ativo: ATIVOS.PTAX.ativo_id, valor: ptaxValor, data: dataReferencia });
            }
        } catch (error) {
            resultados.push({ ativo: ATIVOS.PTAX.ativo_id, error: error.message });
        }

        return { success: true, fonte: 'Yahoo/BACEN', novosRegistros, resultados };

    } catch (error) {
        return { success: false, fonte: 'Yahoo/BACEN', error: error.message, softFail: true };
    }
}

if (require.main === module) scrapeYahoo().then(res => console.log(res));
module.exports = { scrapeYahoo };
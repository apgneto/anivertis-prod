// market-bi/soja/SojaScraperIMEA.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const { connect } = require('puppeteer-real-browser');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

const ATIVOS = {
    GRAO_IMEA_MT: {
        ativo_id: 'SOJA_GRAO_IMEA_MT',
        unidade_origem: 'BRL/ton',
        unidade_destino: 'BRL/ton',
        fonte: 'IMEA',
        tier: 2,
        url: 'https://www.imea.com.br/imea-site/route/cotacao-soja'
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

function parseNumeroBr(valor) {
    if (!valor) return null;
    const cleaned = String(valor).trim().replace(/\./g, '').replace(',', '.');
    const match = cleaned.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
}

async function scrapeIMEA() {
    let browser;
    let novosRegistros = 0;
    const resultados = [];

    try {
        const session = await connect({ headless: false, turnstile: true });
        browser = session.browser;
        const page = session.page;

        await page.goto(ATIVOS.GRAO_IMEA_MT.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        for (let i = 0; i < 6; i++) {
            const title = await page.title();
            if (!/just a moment|attention required|cloudflare/i.test(title)) break;
            await new Promise(r => setTimeout(r, 5000));
        }

        await new Promise(r => setTimeout(r, 5000));
        await page.evaluate(() => window.scrollTo(0, 500));
        await new Promise(r => setTimeout(r, 2000));

        const dataReferencia = new Date().toISOString().slice(0, 10);
        const rawPayload = JSON.stringify({
            fonte: 'IMEA',
            url: ATIVOS.GRAO_IMEA_MT.url,
            coletado_em: new Date().toISOString()
        });

        const valorBruto = await page.evaluate(() => {
            const el = document.querySelector('#cotacao-soja-valor, .valor-soja, [data-produto="soja"]');
            return el ? el.textContent.trim() : null;
        });

        if (valorBruto) {
            const valorNormalizado = parseNumeroBr(valorBruto);
            if (valorNormalizado !== null && Number.isFinite(valorNormalizado)) {
                novosRegistros += await salvarPreco(
                    ATIVOS.GRAO_IMEA_MT,
                    dataReferencia,
                    valorBruto,
                    valorNormalizado,
                    rawPayload
                );
                resultados.push({ ativo: ATIVOS.GRAO_IMEA_MT.ativo_id, valor: valorNormalizado, data: dataReferencia });
            }
        }

        await browser.close();
        return { success: true, fonte: 'IMEA', novosRegistros, resultados };

    } catch (error) {
        if (browser) await browser.close();
        return { success: false, fonte: 'IMEA', error: error.message, softFail: true };
    }
}

if (require.main === module) scrapeIMEA().then(res => console.log(res));
module.exports = { scrapeIMEA };
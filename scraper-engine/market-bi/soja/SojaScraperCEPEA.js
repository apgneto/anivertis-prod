// market-bi/soja/SojaScraperCEPEA.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const { connect } = require('puppeteer-real-browser');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

const ATIVOS = {
    GRAO_PARANAGUA: {
        ativo_id: 'SOJA_GRAO_CEPEA_PARANAGUA',
        unidade_origem: 'BRL/sc',
        unidade_destino: 'BRL/ton',
        fonte: 'CEPEA',
        tier: 1,
        url: 'https://www.cepea.esalq.usp.br/br/indicador/soja.aspx',
        selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)'
    },
    OLEO_BR: {
        ativo_id: 'SOJA_OLEO_BR',
        unidade_origem: 'BRL/ton',
        unidade_destino: 'BRL/ton',
        fonte: 'CEPEA',
        tier: 1,
        url: 'https://www.cepea.esalq.usp.br/br/indicador/oleo-de-soja.aspx',
        selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)'
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

async function scrapeCepea() {
    let browser;
    let novosRegistros = 0;
    const resultados = [];

    try {
        const session = await connect({ headless: false, turnstile: true });
        browser = session.browser;
        const page = session.page;

        for (const [key, ativo] of Object.entries(ATIVOS)) {
            try {
                await page.goto(ativo.url, { waitUntil: 'domcontentloaded', timeout: 60000 });

                for (let i = 0; i < 6; i++) {
                    const title = await page.title();
                    if (!/just a moment|attention required|cloudflare/i.test(title)) break;
                    await new Promise(r => setTimeout(r, 5000));
                }

                await new Promise(r => setTimeout(r, 3000));

                const dataReferencia = await page.evaluate(() => {
                    const title = document.querySelector('table thead tr th')?.textContent || '';
                    const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(title);
                    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
                    return new Date().toISOString().slice(0, 10);
                });

                const rawPayload = JSON.stringify({
                    fonte: 'CEPEA',
                    url: ativo.url,
                    coletado_em: new Date().toISOString()
                });

                const valorBruto = await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.textContent.trim() : null;
                }, ativo.selector);

                if (valorBruto) {
                    const valorNormalizado = parseNumeroBr(valorBruto);
                    if (valorNormalizado !== null && Number.isFinite(valorNormalizado)) {
                        novosRegistros += await salvarPreco(
                            ativo,
                            dataReferencia,
                            valorBruto,
                            valorNormalizado,
                            rawPayload
                        );
                        resultados.push({ ativo: ativo.ativo_id, valor: valorNormalizado, data: dataReferencia });
                    }
                }
            } catch (error) {
                resultados.push({ ativo: ativo.ativo_id, error: error.message });
            }
        }

        await browser.close();
        return { success: true, fonte: 'CEPEA', novosRegistros, resultados };

    } catch (error) {
        if (browser) await browser.close();
        return { success: false, fonte: 'CEPEA', error: error.message, softFail: true };
    }
}

if (require.main === module) scrapeCepea().then(res => console.log(res));
module.exports = { scrapeCepea };
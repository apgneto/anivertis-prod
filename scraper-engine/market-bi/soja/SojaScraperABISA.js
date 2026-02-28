// market-bi/soja/SojaScraperABISA.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const ABISA_URL = 'https://abisa.com.br/cotacoes/cotacoes-2026';

const ATIVOS = {
    OLEO_SP: {
        ativo_id: 'SOJA_OLEO_SP_FISICO',
        unidade_origem: 'BRL/ton',
        unidade_destino: 'BRL/ton',
        fonte: 'ABISA',
        tier: 2
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

function parsePrecoFaixa(texto) {
    const match = /R\$\s*([\d,]+\.?\d*)\/?([\d,]+\.?\d*)?/.exec(texto);
    if (!match) return null;
    const val1 = parseFloat(match[1].replace(',', '.'));
    const val2 = match[2] ? parseFloat(match[2].replace(',', '.')) : val1;
    if (!Number.isFinite(val1)) return null;
    return (val1 + val2) / 2;
}

function parseDataReferencia(titulo) {
    const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(titulo);
    if (!match) return new Date().toISOString().slice(0, 10);
    const [, dia, mes, ano] = match;
    return `${ano}-${mes}-${dia}`;
}

async function scrapeABISA() {
    try {
        const response = await axios.get(ABISA_URL, {
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });

        if (response.status !== 200) {
            return { success: false, fonte: 'ABISA', error: `HTTP ${response.status}`, softFail: true };
        }

        const $ = cheerio.load(response.data);
        const rawPayload = JSON.stringify({
            fonte: 'ABISA',
            url: ABISA_URL,
            coletado_em: new Date().toISOString()
        });

        const primeiroToggle = $('.elementor-toggle-item').first();
        if (!primeiroToggle.length) {
            return { success: false, fonte: 'ABISA', error: 'Toggle não encontrado', softFail: true };
        }

        const titulo = primeiroToggle.find('.elementor-toggle-title').text().trim();
        const dataReferencia = parseDataReferencia(titulo);

        let novosRegistros = 0;

        const oleoRow = primeiroToggle.find('td.column-1').filter((_, el) => {
            return $(el).text().trim().toLowerCase().includes('óleo de soja');
        }).closest('tr');

        if (oleoRow.length) {
            const textoPreco = oleoRow.find('td.column-2').first().text().trim();
            const preco = parsePrecoFaixa(textoPreco);
            if (preco !== null) {
                novosRegistros += await salvarPreco(
                    ATIVOS.OLEO_SP,
                    dataReferencia,
                    textoPreco,
                    preco,
                    rawPayload
                );
            }
        }

        return { success: true, fonte: 'ABISA', novosRegistros, dataReferencia };

    } catch (error) {
        return { success: false, fonte: 'ABISA', error: error.message, softFail: true };
    }
}

if (require.main === module) scrapeABISA().then(res => console.log(res));
module.exports = { scrapeABISA };
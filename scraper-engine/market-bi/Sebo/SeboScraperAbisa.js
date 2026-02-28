const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ABISA_URL = 'https://abisa.com.br/cotacoes/cotacoes-2026';
const ICMS_RATE = 0.12;

const ATIVOS = {
    CIF_BRUTO: {
        ativo_id: 'ABISA_SEBO_BRUTO_CIF_SP',
        unidade_origem: 'BRL/kg',
        unidade_destino: 'BRL/kg',
        fonte: 'ABISA',
        tier: 2,
    },
    FOB_LIMPO: {
        ativo_id: 'ABISA_SEBO_BRUTO_FOB_LIMPO',
        unidade_origem: 'BRL/kg',
        unidade_destino: 'BRL/kg',
        fonte: 'ABISA',
        tier: 2,
    },
    CIF_BRANQUEADO: {
        ativo_id: 'ABISA_SEBO_BRANQUEADO_CIF_SP',
        unidade_origem: 'BRL/kg',
        unidade_destino: 'BRL/kg',
        fonte: 'ABISA',
        tier: 2,
    },
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
                valorNormalizado,  // ✅ DEVE SER NÚMERO
                ativo.unidade_origem,
                ativo.unidade_destino,
                ativo.fonte,
                ativo.tier,
                hash,
                dataReferencia,    // ✅ DEVE SER DATA 'YYYY-MM-DD'
                rawPayload || null,
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
    // Ex: "R$ 5,85/5,95" → { min: 5.85, max: 5.95, avg: 5.90 }
    const match = /R\$\s*([\d,]+)\/([\d,]+)/.exec(texto);
    if (!match) return null;
    const min = parseFloat(match[1].replace(',', '.'));
    const max = parseFloat(match[2].replace(',', '.'));
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    return { min, max, avg: (min + max) / 2 };
}

function parseDataReferencia(titulo) {
    // Ex: "1900 - 24/02/2026" → "2026-02-24"
    const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(titulo);
    if (!match) return new Date().toISOString().slice(0, 10);
    const [, dia, mes, ano] = match;
    return `${ano}-${mes}-${dia}`;
}

async function scrapeAbisa() {
    try {
        const response = await axios.get(ABISA_URL, {
            timeout: 30000,
            httpsAgent,
            headers: {
                'User-Agent': 'AniVertis-MarketBI/1.0 (bot; +https://anivertis.com)',
                'Accept': 'text/html,application/xhtml+xml'
            }
        });

        if (response.status !== 200) {
            return { success: false, fonte: 'ABISA', error: `HTTP ${response.status}`, softFail: true };
        }

        const $ = cheerio.load(response.data);
        
        // ✅ CORREÇÃO CRÍTICA: rawPayload deve ser JSON leve, NÃO HTML completo
        const rawPayload = JSON.stringify({
            fonte: 'ABISA',
            url: ABISA_URL,
            coletado_em: new Date().toISOString()
        });

        // Primeiro toggle = semana mais recente
        const primeiroToggle = $('.elementor-toggle-item').first();
        if (!primeiroToggle.length) {
            return { success: false, fonte: 'ABISA', error: 'Toggle não encontrado', softFail: true };
        }

        // Extrair data do título
        const titulo = primeiroToggle.find('.elementor-toggle-title').text().trim();
        const dataReferencia = parseDataReferencia(titulo);

        let novosRegistros = 0;

        // 1. Sebo bruto CIF SP
        const brutoRow = primeiroToggle.find('td.column-1').filter((_, el) => {
            return $(el).text().trim().toLowerCase().includes('sebo bruto');
        }).closest('tr');
        
        if (brutoRow.length) {
            const textoPreco = brutoRow.find('td.column-2').first().text().trim();
            const preco = parsePrecoFaixa(textoPreco);
            if (preco) {
                // ✅ CIF bruto: valorBruto=string formatada, valorNormalizado=número
                novosRegistros += await salvarPreco(
                    ATIVOS.CIF_BRUTO,
                    dataReferencia,           // ✅ dataReferencia primeiro
                    preco.avg.toFixed(2),      // ✅ valorBruto como string
                    preco.avg,                 // ✅ valorNormalizado como número
                    rawPayload
                );
                // ✅ FOB limpo (remove ICMS 12%)
                const fobLimpo = preco.avg / (1 + ICMS_RATE);
                novosRegistros += await salvarPreco(
                    ATIVOS.FOB_LIMPO,
                    dataReferencia,
                    fobLimpo.toFixed(2),
                    fobLimpo,
                    rawPayload
                );
            }
        }

        // 2. Sebo branqueado CIF SP
        const branqueadoRow = primeiroToggle.find('td.column-1').filter((_, el) => {
            return $(el).text().trim().toLowerCase().includes('sebo branqueado');
        }).closest('tr');
        
        if (branqueadoRow.length) {
            const textoPreco = branqueadoRow.find('td.column-2').first().text().trim();
            const preco = parsePrecoFaixa(textoPreco);
            if (preco) {
                novosRegistros += await salvarPreco(
                    ATIVOS.CIF_BRANQUEADO,
                    dataReferencia,
                    preco.avg.toFixed(2),
                    preco.avg,
                    rawPayload
                );
            }
        }

        return { success: true, fonte: 'ABISA', novosRegistros, dataReferencia };

    } catch (error) {
        return { success: false, fonte: 'ABISA', error: error.message, softFail: true };
    }
}

if (require.main === module) scrapeAbisa().then((res) => console.log(res));
module.exports = { scrapeAbisa };
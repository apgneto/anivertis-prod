const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const COMEX_URL = 'https://api-comexstat.mdic.gov.br/general';

const ATIVO = {
    ativo_id: 'EXPORT_SUINO_SECEX',
    unidade_origem: 'USD',
    unidade_destino: 'USD',
    fonte: 'MDIC_COMEXSTAT',
    tier: 1,
};

function gerarHash(ativo_id, valor_bruto, data_referencia) {
    return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}

function salvarPreco(dataReferencia, valorBruto, valorNormalizado, rawPayload) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        const hash = gerarHash(ATIVO.ativo_id, valorBruto.toString(), dataReferencia);
        db.run(
            `INSERT OR IGNORE INTO market_bi_precos (
                ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino,
                fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                ATIVO.ativo_id,
                valorBruto.toString(),
                valorNormalizado,
                ATIVO.unidade_origem,
                ATIVO.unidade_destino,
                ATIVO.fonte,
                ATIVO.tier,
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

function ultimos24Meses() {
    const to = new Date();
    to.setMonth(to.getMonth() - 2);
    const from = new Date(to.getFullYear(), to.getMonth() - 23, 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { from: fmt(from), to: fmt(to) };
}

function parseRows(data) {
    const rows = Array.isArray(data?.data?.list) ? data.data.list :
                 Array.isArray(data?.data) ? data.data :
                 (Array.isArray(data) ? data : []);
    return rows.map((r) => ({
        data: (r.year && r.monthNumber) ? `${r.year}${String(r.monthNumber).padStart(2,'0')}` : null,
        valor: Number(r.metricFOB || r.vl_fob || r.value || 0)
    })).filter((r) => Number.isFinite(r.valor));
}

async function scrapeSuinosSecex() {
    const period = ultimos24Meses();
    
    const body = {
        flow: 'export',
        monthDetail: true,
        period: { from: period.from, to: period.to },
        filters: [{
            filter: 'ncm',
            values: ['02031100', '02031900', '02032100', '02032900', '02033000']
        }],
        details: ['ncm'],
        metrics: ['metricFOB'],
    };
    
    try {
        const response = await axios.post(COMEX_URL, body, {
            timeout: 45000,
            httpsAgent,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'AniVertis-MarketBI/1.0 (bot; +https://anivertis.com)'
            },
            params: { language: 'pt' }
        });
        
        const rows = parseRows(response.data);
        let novosRegistros = 0;
        for (const row of rows) {
            const ym = String(row.data || period.to).replace('-', '');
            const dataReferencia = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
            novosRegistros += await salvarPreco(
                dataReferencia,
                row.valor.toString(),
                row.valor,
                JSON.stringify(response.data).slice(0, 200000)
            );
        }
        return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros };
    } catch (error) {
        return { success: false, ativo_id: ATIVO.ativo_id, error: error.message };
    }
}

if (require.main === module) scrapeSuinosSecex().then((res) => console.log(res));
module.exports = { scrapeSuinosSecex };
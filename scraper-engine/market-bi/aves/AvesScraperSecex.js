const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const COMEX_URL = 'https://api-comexstat.mdic.gov.br/general';

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

// CORREÇÃO: Delay de ~2 meses na disponibilidade dos dados COMEXSTAT
function ultimos24Meses() {
    const to = new Date();
    to.setMonth(to.getMonth() - 2); // dados têm delay de ~2 meses
    const from = new Date(to.getFullYear(), to.getMonth() - 23, 1);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { from: fmt(from), to: fmt(to) };
}

function toRows(data) {
    const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    return rows.map((r) => ({
        ym: String(r.coAnoMes || r.month || r.period || '').replace('-', ''),
        valor: Number(r.metricFOB || r.vl_fob || r.value || 0)
    }));
}

async function executar(ativoId, ncmValues) {
    const ativo = {
        ativo_id: ativoId,
        unidade_origem: 'USD',
        unidade_destino: 'USD',
        fonte: 'MDIC_COMEXSTAT',
        tier: 1,
    };
    
    const body = {
        flow: 'export',
        monthDetail: true,
        period: ultimos24Meses(),
        filters: [{ filter: 'ncm', values: ncmValues }],
        details: ['ncm'],
        metrics: ['metricFOB'],
    };
    
    const response = await axios.post(COMEX_URL, body, {
        httpsAgent,
        timeout: 45000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'AniVertis-MarketBI/1.0 (bot; +https://anivertis.com)'
        },
        params: { language: 'pt' }
    });
    
    const rows = toRows(response.data);
    let novos = 0;
    for (const row of rows) {
        if (!row.ym) continue;
        const dataRef = `${row.ym.slice(0, 4)}-${row.ym.slice(4, 6)}-01`;
        novos += await salvarPreco(
            ativo,
            dataRef,
            row.valor.toString(),
            row.valor,
            JSON.stringify(response.data).slice(0, 200000)
        );
    }
    return novos;
}

async function scrapePisciculturaComex() {
    try {
        // CORREÇÃO: NCMs com 8 dígitos para peixes
        const peixes = await executar('EXPORT_PEIXES_COMEX', ['03041000', '03042000', '03049000']);
        const farinha = await executar('EXPORT_FARINHA_PEIXE_COMEX', ['23012010']); // já com 8 dígitos
        return { success: true, novosRegistros: peixes + farinha };
    } catch (error) {
        return
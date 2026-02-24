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
    db.run(`INSERT OR IGNORE INTO market_bi_precos (ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino, fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [ativo.ativo_id, valorBruto.toString(), valorNormalizado, ativo.unidade_origem, ativo.unidade_destino, ativo.fonte, ativo.tier, hash, dataReferencia, rawPayload || null],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
function ultimos24Meses() {
  const to = new Date(); const from = new Date(to.getFullYear(), to.getMonth() - 23, 1);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  return { from: fmt(from), to: fmt(to) };
}
function rowsFromResponse(data) {
  const rows = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
  return rows.map((r) => ({ ym: String(r.coAnoMes || r.month || r.period || ''), valor: Number(r.metricFOB || r.vl_fob || r.value || 0) }));
}
async function executarFlow(flow, ativoId) {
  const ativo = { ativo_id: ativoId, unidade_origem: 'USD', unidade_destino: 'USD', fonte: 'MDIC_COMEXSTAT', tier: 1 };
  const period = ultimos24Meses();
  const body = { flow, monthDetail: true, period, filters: [{ filter: 'ncm', values: ['23091000'] }], details: ['ncm'], metrics: ['metricFOB'] };
  const response = await axios.post(COMEX_URL, body, { httpsAgent, timeout: 45000 });
  const rows = rowsFromResponse(response.data);
  let novosRegistros = 0;
  for (const row of rows) {
    if (!row.ym) continue;
    const ym = row.ym.replace('-', '');
    const dataRef = `${ym.slice(0, 4)}-${ym.slice(4, 6)}-01`;
    novosRegistros += await salvarPreco(ativo, dataRef, row.valor.toString(), row.valor, JSON.stringify(response.data).slice(0, 200000));
  }
  return novosRegistros;
}
async function scrapeRacoesPetComex() {
  try {
    const exp = await executarFlow('EXP', 'EXPORT_PETFOOD_COMEX');
    const imp = await executarFlow('IMP', 'IMPORT_PETFOOD_COMEX');
    return { success: true, novosRegistros: exp + imp };
  } catch (error) {
    return { success: false, error: error.message, novosRegistros: 0 };
  }
}
if (require.main === module) scrapeRacoesPetComex().then((res) => console.log(res));
module.exports = { scrapeRacoesPetComex };

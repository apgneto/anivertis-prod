const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ATIVO = { ativo_id: 'MPA_BOLETIM_AQUICULTURA', unidade_origem: 'INDICE', unidade_destino: 'INDICE', fonte: 'MPA', tier: 2 };
function gerarHash(ativo_id, valor_bruto, data_referencia) {
  return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}
function salvarPreco(dataReferencia, valorBruto, valorNormalizado, rawPayload) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const hash = gerarHash(ATIVO.ativo_id, valorBruto.toString(), dataReferencia);
    db.run(`INSERT OR IGNORE INTO market_bi_precos (ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino, fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [ATIVO.ativo_id, valorBruto.toString(), valorNormalizado, ATIVO.unidade_origem, ATIVO.unidade_destino, ATIVO.fonte, ATIVO.tier, hash, dataReferencia, rawPayload || null],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
function extrairNumeroProfundo(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
  if (typeof obj === 'string') { const m = obj.replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/); return m ? Number(m[0]) : null; }
  if (Array.isArray(obj)) { for (const item of obj) { const n = extrairNumeroProfundo(item); if (n !== null) return n; } return null; }
  for (const key of Object.keys(obj)) { const n = extrairNumeroProfundo(obj[key]); if (n !== null) return n; }
  return null;
}
async function scrapePisciculturaMPA() {
  const url = 'https://sistemas.mpa.gov.br/sistemas/entreposto/api/v1/';
  try {
    const response = await axios.get(url, { httpsAgent, timeout: 30000 });
    const valor = extrairNumeroProfundo(response.data) || 0;
    const dataReferencia = new Date().toISOString().slice(0, 10);
    const novosRegistros = await salvarPreco(dataReferencia, String(valor), valor, JSON.stringify(response.data).slice(0, 200000));
    return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros };
  } catch (error) {
    console.error('⚠️ MPA indisponível:', error.message);
    return { success: false, ativo_id: ATIVO.ativo_id, error: error.message, novosRegistros: 0, softFail: true };
  }
}
if (require.main === module) scrapePisciculturaMPA().then((res) => console.log(res));
module.exports = { scrapePisciculturaMPA };

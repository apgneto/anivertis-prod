const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ATIVO = { ativo_id: 'SINDIRACOES_INDICE_RACAO', unidade_origem: 'INDICE', unidade_destino: 'INDICE', fonte: 'SINDIRACOES', tier: 2 };
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
function extrairPrimeiroNumero(texto) {
  const m = String(texto || '').replace(/\./g, '').replace(',', '.').match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}
async function scrapeRacoesProdSindiracoes() {
  const url = 'https://sindiracoes.org.br/estatisticas/';
  try {
    const response = await axios.get(url, { httpsAgent, timeout: 30000 });
    const html = String(response.data || '');
    const valor = extrairPrimeiroNumero(html);
    const dataReferencia = new Date().toISOString().slice(0, 10);
    const novosRegistros = await salvarPreco(dataReferencia, valor.toString(), valor, html.slice(0, 200000));
    return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros };
  } catch (error) {
    return { success: false, ativo_id: ATIVO.ativo_id, error: error.message, novosRegistros: 0 };
  }
}
if (require.main === module) scrapeRacoesProdSindiracoes().then((res) => console.log(res));
module.exports = { scrapeRacoesProdSindiracoes };

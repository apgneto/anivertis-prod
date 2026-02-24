const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const https = require('https');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const ATIVO = {
  ativo_id: 'BOI_GORDO_IMEA_MT',
  unidade_origem: 'BRL/arroba',
  unidade_destino: 'BRL/arroba',
  fonte: 'IMEA',
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
        ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino, fonte, tier,
        integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [ATIVO.ativo_id, valorBruto.toString(), valorNormalizado, ATIVO.unidade_origem, ATIVO.unidade_destino, ATIVO.fonte, ATIVO.tier, hash, dataReferencia, rawPayload || null],
      function onRun(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes || 0);
      }
    );
  });
}
function extrairNumero(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj === 'number' && Number.isFinite(obj)) return obj;
  if (typeof obj === 'string') {
    const m = obj.replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
    return m ? Number(m[0]) : null;
  }
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i -= 1) {
      const v = extrairNumero(obj[i]);
      if (v !== null) return v;
    }
    return null;
  }
  const prioridade = ['preco', 'price', 'valor', 'cotacao', 'vl'];
  for (let i = 0; i < prioridade.length; i += 1) {
    const key = prioridade[i];
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const v = extrairNumero(obj[key]);
      if (v !== null) return v;
    }
  }
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i += 1) {
    const v = extrairNumero(obj[keys[i]]);
    if (v !== null) return v;
  }
  return null;
}
async function fetchIMEA(url) {
  const response = await axios.get(url, { timeout: 30000, httpsAgent });
  return response.data;
}
async function scrapeBoiIMEA() {
  const urls = [
    'https://www.imea.com.br/imea-site/route/cotacao-boi-gordo',
    'https://www.imea.com.br/imea-site/route/relatorios-mercado',
  ];
  let ultimoErro = null;
  for (let i = 0; i < urls.length; i += 1) {
    try {
      const data = await fetchIMEA(urls[i]);
      const valor = extrairNumero(data);
      if (valor === null) throw new Error('IMEA respondeu sem campo numérico de preço');
      const dataReferencia = new Date().toISOString().slice(0, 10);
      const novos = await salvarPreco(dataReferencia, String(valor), valor, JSON.stringify(data).slice(0, 200000));
      return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros: novos, origem: urls[i] };
    } catch (error) {
      ultimoErro = error;
    }
  }
  return { success: false, ativo_id: ATIVO.ativo_id, error: ultimoErro ? ultimoErro.message : 'Falha IMEA' };
}
if (require.main === module) scrapeBoiIMEA().then((res) => console.log(res));
module.exports = { scrapeBoiIMEA };

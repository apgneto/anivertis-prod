const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
function queryAll(sql, params) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all(sql, params || [], (err, rows) => {
      db.close();
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}
function run(sql, params) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run(sql, params || [], function onRun(err) {
      db.close();
      if (err) reject(err);
      else resolve(this.changes || 0);
    });
  });
}
async function inserirMetrica(tipo, valor, dataReferencia) {
  return run('INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia) VALUES (?, ?, ?, ?)', ['BOI_GORDO_CEPEA_SP', tipo, valor, dataReferencia]);
}
function mediaMovel(lista, janela) {
  if (lista.length < janela) return null;
  const subset = lista.slice(-janela);
  const soma = subset.reduce((acc, item) => acc + item.valor_normalizado, 0);
  return soma / janela;
}
async function runBoiMetrics() {
  const hoje = new Date().toISOString().slice(0, 10);
  let inseridas = 0;
  const boi = await queryAll('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['BOI_GORDO_CEPEA_SP']);
  const milho = await queryAll('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id IN (?, ?) ORDER BY data_referencia DESC LIMIT 1', ['MILHO_CEPEA_CAMPINAS', 'MILHO_CEPEA']);
  if (boi.length && milho.length && milho[0].valor_normalizado > 0) {
    const relacao = boi[boi.length - 1].valor_normalizado / milho[0].valor_normalizado;
    inseridas += await inserirMetrica('RELACAO_BOI_MILHO', relacao, hoje);
  }
  const exp = await queryAll('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['EXPORT_CARNE_BOVINA_SECEX']);
  if (exp.length) {
    const ultimo = exp[exp.length - 1];
    inseridas += await inserirMetrica('SPREAD_EXPORTACAO', ultimo.valor_normalizado, ultimo.data_referencia);
  }
  const mm20 = mediaMovel(boi, 20);
  const mm60 = mediaMovel(boi, 60);
  if (mm20 !== null) inseridas += await inserirMetrica('MOMENTUM_MM20', boi[boi.length - 1].valor_normalizado - mm20, hoje);
  if (mm60 !== null) inseridas += await inserirMetrica('MOMENTUM_MM60', boi[boi.length - 1].valor_normalizado - mm60, hoje);
  return { success: true, metricasInseridas: inseridas };
}
if (require.main === module) runBoiMetrics().then((res) => console.log(res)).catch((err) => console.error(err));
module.exports = { runBoiMetrics };

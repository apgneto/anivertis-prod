const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
function all(sql, params) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.all(sql, params || [], (err, rows) => { db.close(); if (err) reject(err); else resolve(rows || []); });
  });
}
function insert(tipo, valor, dataRef) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    db.run('INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia) VALUES (?, ?, ?, ?)', ['SUINO_CEPEA_SP', tipo, valor, dataRef],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
async function runSuinosMetrics() {
  const hoje = new Date().toISOString().slice(0, 10);
  let metricasInseridas = 0;
  const suino = await all('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia DESC LIMIT 1', ['SUINO_CEPEA_SP']);
  const milho = await all('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id IN (?, ?) ORDER BY data_referencia DESC LIMIT 1', ['MILHO_CEPEA_CAMPINAS', 'MILHO_CEPEA']);
  const farelo = await all('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id IN (?, ?) ORDER BY data_referencia DESC LIMIT 1', ['FARELO_SOJA_CEPEA', 'FARELO_SOJA']);
  const exp = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia DESC LIMIT 1', ['EXPORT_SUINO_SECEX']);
  if (suino.length && milho.length && milho[0].valor_normalizado > 0)
    metricasInseridas += await insert('RELACAO_SUINO_MILHO', suino[0].valor_normalizado / milho[0].valor_normalizado, hoje);
  if (suino.length && farelo.length && farelo[0].valor_normalizado > 0)
    metricasInseridas += await insert('RELACAO_SUINO_FARELO', suino[0].valor_normalizado / farelo[0].valor_normalizado, hoje);
  if (exp.length) metricasInseridas += await insert('SPREAD_EXPORTACAO', exp[0].valor_normalizado, exp[0].data_referencia);
  return { success: true, metricasInseridas };
}
if (require.main === module) runSuinosMetrics().then((res) => console.log(res)).catch((err) => console.error(err));
module.exports = { runSuinosMetrics };

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
    db.run('INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia) VALUES (?, ?, ?, ?)', ['EXPORT_PETFOOD_COMEX', tipo, valor, dataRef],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
async function runRacoesPetMetrics() {
  const serieExp = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['EXPORT_PETFOOD_COMEX']);
  const serieImp = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['IMPORT_PETFOOD_COMEX']);
  let metricasInseridas = 0;
  if (serieExp.length && serieImp.length) {
    const saldo = serieExp[serieExp.length - 1].valor_normalizado - serieImp[serieImp.length - 1].valor_normalizado;
    metricasInseridas += await insert('SALDO_COMERCIAL', saldo, serieExp[serieExp.length - 1].data_referencia);
  }
  if (serieExp.length >= 2) {
    const a = serieExp[serieExp.length - 1]; const b = serieExp[serieExp.length - 2];
    const crescMensal = b.valor_normalizado ? ((a.valor_normalizado - b.valor_normalizado) / b.valor_normalizado) * 100 : 0;
    metricasInseridas += await insert('CRESCIMENTO_MENSAL_PCT', crescMensal, a.data_referencia);
  }
  if (serieExp.length >= 13) {
    const atual = serieExp[serieExp.length - 1]; const anoAnt = serieExp[serieExp.length - 13];
    const crescAnual = anoAnt.valor_normalizado ? ((atual.valor_normalizado - anoAnt.valor_normalizado) / anoAnt.valor_normalizado) * 100 : 0;
    metricasInseridas += await insert('CRESCIMENTO_ANUAL_PCT', crescAnual, atual.data_referencia);
  }
  return { success: true, metricasInseridas };
}
if (require.main === module) runRacoesPetMetrics().then((res) => console.log(res)).catch((err) => console.error(err));
module.exports = { runRacoesPetMetrics };

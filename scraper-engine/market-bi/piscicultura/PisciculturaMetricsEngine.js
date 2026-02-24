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
    db.run('INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia) VALUES (?, ?, ?, ?)', ['EXPORT_PEIXES_COMEX', tipo, valor, dataRef],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
async function runPisciculturaMetrics() {
  const peixes = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['EXPORT_PEIXES_COMEX']);
  const farinha = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['EXPORT_FARINHA_PEIXE_COMEX']);
  let metricasInseridas = 0;
  if (peixes.length) metricasInseridas += await insert('VOLUME_EXPORTADO_MENSAL', peixes[peixes.length - 1].valor_normalizado, peixes[peixes.length - 1].data_referencia);
  if (peixes.length >= 13) {
    const atual = peixes[peixes.length - 1]; const anoAnt = peixes[peixes.length - 13];
    const crescimento = anoAnt.valor_normalizado ? ((atual.valor_normalizado - anoAnt.valor_normalizado) / anoAnt.valor_normalizado) * 100 : 0;
    metricasInseridas += await insert('CRESCIMENTO_ANUAL_PCT', crescimento, atual.data_referencia);
  }
  if (peixes.length && farinha.length) {
    const p = peixes[peixes.length - 1].valor_normalizado; const f = farinha[farinha.length - 1].valor_normalizado;
    metricasInseridas += await insert('RELACAO_FILE_FARINHA', f ? p / f : 0, peixes[peixes.length - 1].data_referencia);
  }
  return { success: true, metricasInseridas };
}
if (require.main === module) runPisciculturaMetrics().then((res) => console.log(res)).catch((err) => console.error(err));
module.exports = { runPisciculturaMetrics };

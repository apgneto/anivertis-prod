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
    db.run('INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia) VALUES (?, ?, ?, ?)', ['EXPORT_RACAO_PROD_COMEX', tipo, valor, dataRef],
      function onRun(err) { db.close(); if (err) reject(err); else resolve(this.changes || 0); });
  });
}
function correlacaoPearson(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;
  const xs = x.slice(-n); const ys = y.slice(-n);
  const meanX = xs.reduce((a, b) => a + b, 0) / n; const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) { const dx = xs[i] - meanX; const dy = ys[i] - meanY; num += dx * dy; denX += dx * dx; denY += dy * dy; }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? null : num / den;
}
async function runRacoesProdMetrics() {
  let metricasInseridas = 0;
  const exp = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['EXPORT_RACAO_PROD_COMEX']);
  const imp = await all('SELECT data_referencia, valor_normalizado FROM market_bi_precos WHERE ativo_id = ? ORDER BY data_referencia ASC', ['IMPORT_RACAO_PROD_COMEX']);
  if (exp.length) metricasInseridas += await insert('VOLUME_TOTAL_MENSAL', exp[exp.length - 1].valor_normalizado, exp[exp.length - 1].data_referencia);
  if (exp.length && imp.length) metricasInseridas += await insert('SALDO_COMERCIAL', exp[exp.length - 1].valor_normalizado - imp[imp.length - 1].valor_normalizado, exp[exp.length - 1].data_referencia);
  const milho = await all('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id IN (?, ?) ORDER BY data_referencia ASC', ['MILHO_CEPEA_CAMPINAS', 'MILHO_CEPEA']);
  const farelo = await all('SELECT valor_normalizado FROM market_bi_precos WHERE ativo_id IN (?, ?) ORDER BY data_referencia ASC', ['FARELO_SOJA_CEPEA', 'FARELO_SOJA']);
  const expSerie = exp.map((r) => r.valor_normalizado);
  const dataRef = exp.length ? exp[exp.length - 1].data_referencia : new Date().toISOString().slice(0, 10);
  const corrMilho = correlacaoPearson(expSerie, milho.map((r) => r.valor_normalizado));
  const corrFarelo = correlacaoPearson(expSerie, farelo.map((r) => r.valor_normalizado));
  if (corrMilho !== null) metricasInseridas += await insert('CORRELACAO_MILHO', corrMilho, dataRef);
  if (corrFarelo !== null) metricasInseridas += await insert('CORRELACAO_FARELO', corrFarelo, dataRef);
  return { success: true, metricasInseridas };
}
if (require.main === module) runRacoesProdMetrics().then((res) => console.log(res)).catch((err) => console.error(err));
module.exports = { runRacoesProdMetrics };

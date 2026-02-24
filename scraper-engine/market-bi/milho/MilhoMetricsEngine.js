const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const db = new sqlite3.Database(dbPath);

/* ===============================
   Utilitário
================================= */
function getLatestValue(ativo_id) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT valor_normalizado
      FROM market_bi_precos
      WHERE ativo_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [ativo_id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.valor_normalizado : null);
      }
    );
  });
}

function insertMetric(tipo, valor, dataRef) {
  return new Promise((resolve, reject) => {
    db.run(
      `
      INSERT INTO metricas_derivadas
      (ativo_id, tipo, valor, data_referencia, criado_em)
      VALUES ('MILHO', ?, ?, ?, datetime('now'))
      `,
      [tipo, valor, dataRef],
      function (err) {
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

/* ===============================
   Momentum 5 dias
================================= */
function getValueNDaysAgo(ativo_id, days) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT valor_normalizado
      FROM market_bi_precos
      WHERE ativo_id = ?
      ORDER BY id DESC
      LIMIT 1 OFFSET ?
      `,
      [ativo_id, days],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.valor_normalizado : null);
      }
    );
  });
}

/* ===============================
   Engine Métricas
================================= */
async function calculateMilhoMetrics() {
  const dataRef = new Date().toISOString().split('T')[0];

  const imea = await getLatestValue('MILHO_GRAO_IMEA_MT');
  const cepea = await getLatestValue('MILHO_CEPEA_CAMPINAS');
  const cbot = await getLatestValue('MILHO_FUTURO_CBOT');
  const usdbrl = await getLatestValue('USD_BRL');

  if (!imea || !cepea || !cbot || !usdbrl) {
    console.warn('⚠ Dados insuficientes para métricas.');
    return;
  }

  const spread = imea - cepea;

  const paridade = cbot * usdbrl;
  const basis = imea - paridade;

  const imea5d = await getValueNDaysAgo('MILHO_GRAO_IMEA_MT', 5);
  const momentum5d = imea5d ? imea - imea5d : 0;

  console.log('📊 Spread:', spread);
  console.log('📊 Basis:', basis);
  console.log('📊 Paridade:', paridade);
  console.log('📊 Momentum 5d:', momentum5d);

  await insertMetric('SPREAD_MT_CAMPINAS', spread, dataRef);
  await insertMetric('BASIS_MT_CBOT', basis, dataRef);
  await insertMetric('PARIDADE_TEORICA_MT', paridade, dataRef);
  await insertMetric('MOMENTUM_5D', momentum5d, dataRef);
}

module.exports = { calculateMilhoMetrics };
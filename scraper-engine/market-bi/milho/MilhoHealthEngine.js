const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const db = new sqlite3.Database(dbPath);

function getLatestMetric(tipo) {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT valor
      FROM metricas_derivadas
      WHERE ativo_id = 'MILHO'
      AND tipo = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [tipo],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.valor : null);
      }
    );
  });
}

function getPreviousDayScore() {
  return new Promise((resolve, reject) => {
    db.get(
      `
      SELECT valor
      FROM metricas_derivadas
      WHERE ativo_id = 'MILHO'
      AND tipo = 'HEALTH_SCORE'
      AND data_referencia < date('now')
      ORDER BY id DESC
      LIMIT 1
      `,
      [],
      (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.valor : null);
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

function calculateBasisScore(basis) {
  if (basis > 0) return 50;
  if (basis > -150) return 35;
  if (basis > -300) return 20;
  return 5;
}

function calculateSpreadScore(spread) {
  if (spread > -200) return 50;
  if (spread > -400) return 35;
  if (spread > -600) return 20;
  return 5;
}

function classifyRegime(score) {
  if (score >= 80) return 'FORTE';
  if (score >= 60) return 'SAUDAVEL';
  if (score >= 40) return 'ATENCAO';
  return 'PRESSAO';
}

async function calculateMilhoHealthScore() {
  const dataRef = new Date().toISOString().split('T')[0];

  const basis = await getLatestMetric('BASIS_MT_CBOT');
  const spread = await getLatestMetric('SPREAD_MT_CAMPINAS');

  if (basis === null || spread === null) return;

  const healthScore =
    calculateBasisScore(basis) +
    calculateSpreadScore(spread);

  const regime = classifyRegime(healthScore);

  const prevScore = await getPreviousDayScore();
  const delta = prevScore !== null ? healthScore - prevScore : 0;

  await insertMetric('HEALTH_SCORE', healthScore, dataRef);
  await insertMetric('HEALTH_REGIME', regime, dataRef);
  await insertMetric('HEALTH_DELTA', delta, dataRef);

  if (prevScore !== null && Math.abs(delta) >= 15) {
    await insertMetric('ALERTA_DELTA', 'VARIACAO_RELEVANTE', dataRef);
  }
}

module.exports = { calculateMilhoHealthScore };
const sqlite3 = require('sqlite3').verbose();

const dbPath = "C:\\Users\\apgne\\anivertis-prod\\data\\anivertis.db";

function getLatestValue(ativo_id) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

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
        db.close();
        if (err) return reject(err);
        resolve(row ? row.valor_normalizado : null);
      }
    );
  });
}

async function calculateSpreadMT() {
  const mt = await getLatestValue('MILHO_GRAO_IMEA_MT');
  const campinas = await getLatestValue('MILHO_CEPEA_CAMPINAS');

  if (mt === null || campinas === null) {
    console.log('Dados insuficientes para Spread.');
    return null;
  }

  return mt - campinas;
}

async function calculateBasisMT() {
  const mt = await getLatestValue('MILHO_GRAO_IMEA_MT');
  const cbotUSD = await getLatestValue('MILHO_FUTURO_CBOT');
  const usdbrl = await getLatestValue('USD_BRL');

  if (mt === null || cbotUSD === null || usdbrl === null) {
    console.log('Dados insuficientes para Basis.');
    return null;
  }

  const cbotBRL = cbotUSD * usdbrl;

  return mt - cbotBRL;
}

module.exports = {
  calculateSpreadMT,
  calculateBasisMT
};
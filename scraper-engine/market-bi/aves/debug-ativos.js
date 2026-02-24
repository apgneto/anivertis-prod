const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

const db = new sqlite3.Database(dbPath);

db.all(
  "SELECT DISTINCT ativo_id FROM market_bi_precos ORDER BY ativo_id",
  [],
  (err, rows) => {
    if (err) {
      console.error('Erro na query:', err.message);
    } else {
      console.log('\n=== ATIVOS CADASTRADOS ===\n');
      rows.forEach(r => console.log(r.ativo_id));
    }
    db.close();
  }
);
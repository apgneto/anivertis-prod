const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

console.log("Tentando abrir:", dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error("Erro ao abrir:", err.message);
  } else {
    console.log("Banco aberto com sucesso.");
    db.close();
  }
});
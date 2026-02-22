const crypto = require('crypto');

class DataIngestor {
  constructor(db) {
    this.db = db;
  }

  static generateIntegrityHash({ ativo_id, valor_bruto, data_referencia }) {
    const payload = `${ativo_id}${valor_bruto}${data_referencia}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async ensureSchema() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS market_bi_precos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ativo_id TEXT NOT NULL,
        valor_bruto TEXT NOT NULL,
        valor_normalizado REAL NOT NULL,
        unidade_origem TEXT NOT NULL,
        unidade_destino TEXT NOT NULL,
        data_referencia TEXT NOT NULL,
        integridade_hash_sha256 TEXT NOT NULL,
        raw_payload_debug TEXT,
        fonte TEXT,
        coletado_em TEXT NOT NULL DEFAULT (datetime('now')),
        criado_em TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (integridade_hash_sha256)
      );
    `);
  }

  async savePriceRecord(record) {
    const {
      ativo_id,
      valor_bruto,
      valor_normalizado,
      unidade_origem,
      unidade_destino,
      data_referencia,
      raw_payload_debug,
      fonte,
    } = record;

    const integridade_hash_sha256 = DataIngestor.generateIntegrityHash({
      ativo_id,
      valor_bruto,
      data_referencia,
    });

    await this.ensureSchema();

    await this.db.run(
      `INSERT OR IGNORE INTO market_bi_precos (
        ativo_id,
        valor_bruto,
        valor_normalizado,
        unidade_origem,
        unidade_destino,
        data_referencia,
        integridade_hash_sha256,
        raw_payload_debug,
        fonte
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ativo_id,
        valor_bruto,
        valor_normalizado,
        unidade_origem,
        unidade_destino,
        data_referencia,
        integridade_hash_sha256,
        raw_payload_debug,
        fonte || null,
      ]
    );

    return {
      ...record,
      integridade_hash_sha256,
    };
  }
}

module.exports = DataIngestor;

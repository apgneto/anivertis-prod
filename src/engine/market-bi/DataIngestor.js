// src/engine/market-bi/DataIngestor.js
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class DataIngestor {
  constructor(dbPath) {
    // Conexão única ao banco anivertis.db
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'anivertis.db');
  }

  async connect() {
    const dbDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    await this.initSchema();
    return this.db;
  }

  async initSchema() {
    // Tabela Ativos (Master Data)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ativos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL, -- Ex: SEBO_BOVINO_SP
        name TEXT,
        unit TEXT, -- Unidade Base
        source TEXT, -- Fonte Principal
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Tabela Conversões (Determinística)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversoes_unidade (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_unit TEXT NOT NULL,
        to_unit TEXT NOT NULL,
        factor REAL NOT NULL, -- Fator Multiplicador
        offset REAL NOT NULL DEFAULT 0, -- Offset Aditivo
        UNIQUE(from_unit, to_unit)
      );
    `);

    // Tabela Histórica (Cofre Imutável)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS indicadores_historicos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        asset_id INTEGER, -- FK para ativos
        asset_symbol TEXT, -- Redundância para performance
        source TEXT NOT NULL,
        raw_value REAL NOT NULL,
        normalized_value REAL NOT NULL,
        raw_unit TEXT,
        normalized_unit TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- YYYY-MM-DD
        integrity_hash TEXT UNIQUE NOT NULL,
        quality_score INTEGER DEFAULT 100,
        substitui_id INTEGER,
        metadata TEXT,
        raw_payload_debug TEXT -- Payload de Auditoria (HTML)
      );
    `);

    // Tabela de Qualidade
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS qualidade_dados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        indicador_id INTEGER,
        regra_violada TEXT,
        severity TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  generateHash(data) {
    // Hash SHA-256: symbol + raw_value + timestamp + source
    const content = `${data.asset_symbol}|${data.raw_value}|${data.timestamp}|${data.source}`;
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  validateQuality(data) {
    const issues = [];
    if (data.raw_value < 0) issues.push({ rule: 'NEGATIVE_VALUE', severity: 'CRITICAL' });

    // Regra Específica Sebo (Range check)
    if (data.asset_symbol === 'SEBO_BOVINO_SP') {
      if (data.raw_value < 3.0 || data.raw_value > 10.0) {
        issues.push({ rule: 'OUTLIER_DETECTED', severity: 'WARNING' });
      }
    }
    return issues;
  }

  async getAsset(symbol) {
    return this.db.get('SELECT * FROM ativos WHERE symbol = ?', symbol);
  }

  async createAsset(symbol, name, unit, source) {
    await this.db.run(
      'INSERT OR IGNORE INTO ativos (symbol, name, unit, source) VALUES (?, ?, ?, ?)',
      symbol, name, unit, source
    );
    return this.getAsset(symbol);
  }

  async getConversionRule(fromUnit, toUnit) {
    return this.db.get(
      'SELECT factor, offset FROM conversoes_unidade WHERE from_unit = ? AND to_unit = ?',
      fromUnit, toUnit
    );
  }

  async createConversionRule(fromUnit, toUnit, factor, offset) {
    await this.db.run(
      'INSERT OR REPLACE INTO conversoes_unidade (from_unit, to_unit, factor, offset) VALUES (?, ?, ?, ?)',
      fromUnit, toUnit, factor, offset
    );
  }

  async ingest(data) {
    if (!this.db) await this.connect();

    // Validar Ativo
    let asset = await this.getAsset(data.asset_symbol);
    if (!asset) {
        // Auto-create asset for resilience in MVP
        asset = await this.createAsset(data.asset_symbol, data.asset_symbol, data.normalized_unit, data.source);
    }

    const hash = this.generateHash(data);
    const qualityIssues = this.validateQuality(data);
    const qualityScore = Math.max(0, 100 - (qualityIssues.length * 20));

    try {
      await this.db.run('BEGIN TRANSACTION');

      const result = await this.db.run(`
        INSERT INTO indicadores_historicos (
          asset_id, asset_symbol, source, raw_value, normalized_value, raw_unit,
          normalized_unit, timestamp, integrity_hash, quality_score, metadata, raw_payload_debug
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        asset.id,
        data.asset_symbol,
        data.source,
        data.raw_value,
        data.normalized_value,
        data.raw_unit,
        data.normalized_unit,
        data.timestamp, // YYYY-MM-DD
        hash,
        qualityScore,
        JSON.stringify({ raw_payload_hash: data.raw_payload_hash }),
        data.raw_payload_debug || null
      ]);

      const insertId = result.lastID;

      for (const issue of qualityIssues) {
        await this.db.run(`
          INSERT INTO qualidade_dados (indicador_id, regra_violada, severity)
          VALUES (?, ?, ?)
        `, [insertId, issue.rule, issue.severity]);
      }

      await this.db.run('COMMIT');
      return { success: true, id: insertId, hash };

    } catch (error) {
      await this.db.run('ROLLBACK');
      if (error.message.includes('UNIQUE constraint failed')) {
        console.warn(`[Ingestor] Dado duplicado ignorado (Hash: ${hash})`);
        return { success: false, error: 'DUPLICATE_ENTRY', hash };
      }
      throw error;
    }
  }

  async close() {
    if (this.db) await this.db.close();
  }
}

module.exports = DataIngestor;

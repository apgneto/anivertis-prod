const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const IndicatorStrategy = require('./IndicatorStrategy');
const Normalizer = require('./Normalizer');
const DataIngestor = require('./DataIngestor');

class MarketBIPipeline {
  constructor(options = {}) {
    this.dbPath = options.dbPath || path.join(__dirname, '..', '..', 'data', 'anivertis.db');
    this.indicatorStrategy = new IndicatorStrategy(options.indicatorOptions || {});
  }

  async run(params) {
    const db = await open({ filename: this.dbPath, driver: sqlite3.Database });

    try {
      let extracted;

      // 1️⃣ CURTO-CIRCUITO: Se for API/Manual, não aciona o IndicatorStrategy (Puppeteer)
      if (params.extraction_mode === 'api_manual') {
        extracted = {
          success: true,
          valor_bruto: params.valor_manual,
          coletado_em: new Date().toISOString()
        };
      } else {
        // Extração via Scraper (CEPEA, etc)
        extracted = await this.indicatorStrategy.extractPrice(params.url, params);
      }

      if (!extracted.success) {
        return { success: false, stage: 'extract', ...extracted };
      }

      // 2️⃣ NORMALIZAÇÃO (Conversão de Unidades)
      const normalizer = new Normalizer(db);
      const normalized = await normalizer.applyUnitConversion({
        ativo_id: params.ativo_id,
        valor_bruto: extracted.valor_bruto,
        unidade_origem: params.unidade_origem,
        unidade_destino: params.unidade_destino,
      });

      // 3️⃣ INGESTÃO (Persistência no SQLite)
      const ingestor = new DataIngestor(db);
      await ingestor.savePriceRecord({
        ativo_id: params.ativo_id,
        valor_bruto: normalized.valor_bruto,
        valor_normalizado: normalized.valor_normalizado,
        unidade_origem: normalized.unidade_origem,
        unidade_destino: normalized.unidade_destino,
        data_referencia: params.data_referencia || new Date().toISOString().split('T')[0],
        raw_payload_debug: extracted.raw_payload_debug || null,
        fonte: params.fonte,
      });

      return { success: true, stage: 'pipeline_complete', data: normalized };

    } catch (error) {
      console.error(`❌ Erro no Pipeline [${params.ativo_id}]:`, error.message);
      return { success: false, stage: 'pipeline_error', error: error.message };
    } finally {
      await db.close();
    }
  }
}

module.exports = MarketBIPipeline;
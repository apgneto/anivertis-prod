// market-bi/shared/MarketBIPipeline.js
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const IndicatorStrategy = require('./IndicatorStrategy');
const Normalizer = require('./Normalizer');
const DataIngestor = require('./DataIngestor');

class MarketBIPipeline {
    constructor(options = {}) {
        this.dbPath = options.dbPath || path.join(process.cwd(), 'data', 'anivertis.db');
        this.indicatorStrategy = new IndicatorStrategy(options.indicatorOptions || {});
    }
    
    async run({ ativo_id, url, selector, unidade_origem, unidade_destino, data_referencia, fonte }) {
        const db = await open({
            filename: this.dbPath,
            driver: sqlite3.Database,
        });
        
        try {
            const extracted = await this.indicatorStrategy.extractFromCepea(url, selector);
            
            if (!extracted.success) {
                return {
                    success: false,
                    stage: 'extract',
                    ...extracted,
                };
            }
            
            const normalizer = new Normalizer(db);
            const normalized = await normalizer.applyUnitConversion({
                ativo_id,
                valor_bruto: extracted.valor_bruto,
                unidade_origem,
                unidade_destino,
            });
            
            const ingestor = new DataIngestor(db);
            const saved = await ingestor.savePriceRecord({
                ativo_id,
                valor_bruto: normalized.valor_bruto,
                valor_normalizado: normalized.valor_normalizado,
                unidade_origem: normalized.unidade_origem,
                unidade_destino: normalized.unidade_destino,
                data_referencia,
                raw_payload_debug: extracted.raw_payload_debug,
                fonte,
            });
            
            return {
                success: true,
                stage: 'done',
                extracted,
                normalized,
                saved,
            };
            
        } finally {
            await db.close();
        }
    }
}

module.exports = MarketBIPipeline;
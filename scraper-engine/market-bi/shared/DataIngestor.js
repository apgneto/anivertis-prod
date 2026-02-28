// market-bi/shared/DataIngestor.js
const crypto = require('crypto');

class DataIngestor {
    constructor(db) {
        this.db = db;
    }
    
    async savePriceRecord({
        ativo_id,
        valor_bruto,
        valor_normalizado,
        unidade_origem,
        unidade_destino,
        data_referencia,
        raw_payload_debug,
        fonte,
        tier = 1
    }) {
        const hash = crypto
            .createHash('sha256')
            .update(`${ativo_id}|${valor_bruto}|${data_referencia}`)
            .digest('hex');
        
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT OR IGNORE INTO market_bi_precos (
                    ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino,
                    fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    ativo_id,
                    valor_bruto.toString(),
                    valor_normalizado,
                    unidade_origem,
                    unidade_destino,
                    fonte,
                    tier,
                    hash,
                    data_referencia,
                    raw_payload_debug || null
                ],
                function onRun(err) {
                    if (err) reject(err);
                    else resolve({ changes: this.changes || 0, hash });
                }
            );
        });
    }
}

module.exports = DataIngestor;
// market-bi/aves/AvesScraperSecex.js
const axios = require('axios');
const https = require('https');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const ATIVO = {
    ativo_id: 'EXPORT_FRANGO_SECEX',
    unidade_origem: 'USD_FOB',
    unidade_destino: 'USD_FOB',
    fonte: 'MDIC_COMEXSTAT',
    tier: 1
};
const httpsAgent = new https.Agent({ rejectUnauthorized: false, keepAlive: true });

function gerarHash(payload) {
    return crypto.createHash('sha256').update(payload).digest('hex');
}

function salvarPreco(dataReferencia, valorBruto, valorNormalizado) {
    return new Promise((resolve, reject) => {
        const dirPath = path.dirname(dbPath);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        const db = new sqlite3.Database(dbPath, err => {
            if (err) return reject(new Error(`Erro ao abrir o banco: ${err.message}`));
        });

        db.serialize(() => {
            db.run(`
                CREATE TABLE IF NOT EXISTS market_bi_precos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    ativo_id TEXT NOT NULL,
                    valor_bruto TEXT NOT NULL,
                    valor_normalizado REAL NOT NULL,
                    collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            const colunasParaAdicionar = [
                'ALTER TABLE market_bi_precos ADD COLUMN tier INTEGER DEFAULT 1',
                'ALTER TABLE market_bi_precos ADD COLUMN unidade_origem TEXT',
                'ALTER TABLE market_bi_precos ADD COLUMN unidade_destino TEXT',
                'ALTER TABLE market_bi_precos ADD COLUMN fonte TEXT',
                'ALTER TABLE market_bi_precos ADD COLUMN data_referencia DATE',
                'ALTER TABLE market_bi_precos ADD COLUMN data_publicacao DATE',
                'ALTER TABLE market_bi_precos ADD COLUMN integridade_hash_sha256 TEXT',
                'ALTER TABLE market_bi_precos ADD COLUMN collected_at DATETIME',
                'ALTER TABLE market_bi_precos ADD COLUMN criado_em DATETIME'
            ];

            colunasParaAdicionar.forEach(cmd => {
                db.run(cmd, () => {});
            });

            const payload = JSON.stringify({
                ativo_id: ATIVO.ativo_id,
                valor_bruto: valorBruto.toString(),
                valor_normalizado: valorNormalizado,
                data_referencia: dataReferencia,
                fonte: ATIVO.fonte
            });
            const hash = gerarHash(payload);
            
            db.run(`
                INSERT OR IGNORE INTO market_bi_precos (
                    ativo_id, valor_bruto, valor_normalizado, unidade_origem,
                    unidade_destino, fonte, tier, integridade_hash_sha256,
                    data_referencia, data_publicacao, collected_at, criado_em
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
                ATIVO.ativo_id, valorBruto.toString(), valorNormalizado,
                ATIVO.unidade_origem, ATIVO.unidade_destino, ATIVO.fonte,
                ATIVO.tier, hash, dataReferencia, dataReferencia
            ], function(err) {
                db.close();
                if (err) return reject(new Error(`Erro no INSERT: ${err.message}`));
                resolve(this.changes);
            });
        });
    });
}

async function consultarComexStat() {
    // CORREÇÃO: Delay de ~2 meses na disponibilidade dos dados COMEXSTAT
    const hoje = new Date();
    hoje.setMonth(hoje.getMonth() - 2); // dados têm delay de ~2 meses
    const anoReal = hoje.getFullYear();
    const mesReal = hoje.getMonth() + 1;
    
    const periodos = [];
    for (let i = 2; i <= 25; i++) {
        let ano = anoReal;
        let mes = mesReal - i;
        while (mes <= 0) { mes += 12; ano -= 1; }
        periodos.push(`${ano}-${String(mes).padStart(2, '0')}`);
    }
    const periodoInicio = periodos[periodos.length - 1];
    const periodoFim = periodos[0];
    
    try {
        const response = await axios.post(
            'https://api-comexstat.mdic.gov.br/general',
            {
                flow: 'export',
                monthDetail: true,
                period: { from: periodoInicio, to: periodoFim },
                filters: [
                    { filter: 'ncm', values: ['02071100', '02071200', '02071300', '02071400'] }
                ],
                details: [],
                metrics: ['metricFOB']
            },
            {
                httpsAgent: httpsAgent,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'AniVertis-MarketBI/1.0 (bot; +https://anivertis.com)'
                },
                params: { language: 'pt' }
            }
        );
        
        const lista = response.data?.data?.list || response.data?.data || [];

        if (!lista || lista.length === 0) throw new Error('Lista vazia na resposta');

        const agrupadoPorMes = {};

        lista.forEach(r => {
            const year = parseInt(r.year || r.ano || r.co_ano);
            const month = parseInt(r.month || r.mes || r.co_mes || r.monthNumber);
            const metricFOB = parseFloat(r.metricFOB || r.value || 0);

            if (!isNaN(year) && !isNaN(month) && metricFOB > 0) {
                const chave = `${year}-${String(month).padStart(2, '0')}`;
                if (!agrupadoPorMes[chave]) {
                    agrupadoPorMes[chave] = { year, month, metricFOB: 0 };
                }
                agrupadoPorMes[chave].metricFOB += metricFOB;
            }
        });

        const registrosValidos = Object.values(agrupadoPorMes)
            .sort((a, b) => (b.year - a.year) || (b.month - a.month));

        if (registrosValidos.length === 0) throw new Error('Dados inconsistentes');

        const ultimo = registrosValidos[0];
        const dataReferencia = `${ultimo.year}-${String(ultimo.month).padStart(2, '0')}-01`;
        const valorFOB = ultimo.metricFOB;

        return { valorFOB, dataReferencia };
    } catch (err) {
        if (err.response) {
            console.error(`❌ Erro HTTP ${err.response.status}:`, JSON.stringify(err.response.data));
        }
        throw err;
    }
}

async function run() {
    try {
        const { valorFOB, dataReferencia } = await consultarComexStat();
        const changes = await salvarPreco(dataReferencia, valorFOB, valorFOB);
        return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros: changes };
    } catch (err) {
        return { success: false, ativo_id: ATIVO.ativo_id, error: err.message, novosRegistros: 0 };
    }
}

if (require.main === module) run().then((res) => console.log(res));
module.exports = { scrapeAvesSecex: run };
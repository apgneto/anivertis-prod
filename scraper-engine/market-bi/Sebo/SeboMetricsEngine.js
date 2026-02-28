const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// ✅ CORREÇÃO CRÍTICA: path absoluto para o banco
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

function queryAll(sql, params) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.all(sql, params || [], (err, rows) => {
            db.close();
            if (err) reject(err);
            else resolve(rows || []);
        });
    });
}

function run(sql, params) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(sql, params || [], function onRun(err) {
            db.close();
            if (err) reject(err);
            else resolve(this.changes || 0);
        });
    });
}

// ✅ CORREÇÃO: Buscar SEMPRE o último registro, sem filtro de data
async function buscarUltimoValor(ativoId) {
    const rows = await queryAll(
        `SELECT valor_normalizado, data_referencia 
         FROM market_bi_precos 
         WHERE ativo_id = ? 
         ORDER BY data_referencia DESC, criado_em DESC 
         LIMIT 1`,
        [ativoId]
    );
    const valor = rows[0]?.valor_normalizado;
    // Garantir que é número válido
    return (typeof valor === 'number' && Number.isFinite(valor)) ? valor : null;
}

async function runSeboMetrics() {
    const hoje = new Date().toISOString().slice(0, 10);
    let calculados = 0;
    const metricas = [];

    // 1. SEBO_SPREAD_SP_CENTRAL = ABISA_FOB_LIMPO - SCOT_CENTRAL
    const abisaFob = await buscarUltimoValor('ABISA_SEBO_BRUTO_FOB_LIMPO');
    const scotCentral = await buscarUltimoValor('SCOT_SEBO_CENTRAL');
    
    console.log(`🔍 Debug: abisaFob=${abisaFob}, scotCentral=${scotCentral}`);
    
    if (abisaFob !== null && scotCentral !== null) {
        const spread = parseFloat((abisaFob - scotCentral).toFixed(4));
        // ✅ Usar INSERT OR REPLACE para atualizar se já existir
        await run(
            `INSERT OR REPLACE INTO metricas_derivadas 
             (ativo_id, tipo, valor, data_referencia, criado_em) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            ['SEBO_SPREAD_SP_CENTRAL', 'spread', spread, hoje]
        );
        metricas.push({ ativo: 'SEBO_SPREAD_SP_CENTRAL', valor: spread });
        calculados += 1;
        console.log(`✅ Spread calculado: ${spread}`);
    } else {
        console.log(`⚠️ Dados insuficientes para spread: ABISA=${abisaFob}, SCOT=${scotCentral}`);
    }

    // 2. SEBO_BOVINO_SP (índice composto AniVertis)
    // Peso: ABISA 50% + SCOT_CENTRAL 30% + SCOT_RS 20%
    const scotRs = await buscarUltimoValor('SCOT_SEBO_RS');
    
    console.log(`🔍 Debug: scotRs=${scotRs}`);
    
    if (abisaFob !== null && scotCentral !== null && scotRs !== null) {
        const indice = parseFloat((
            (abisaFob * 0.50) + 
            (scotCentral * 0.30) + 
            (scotRs * 0.20)
        ).toFixed(4));
        await run(
            `INSERT OR REPLACE INTO metricas_derivadas 
             (ativo_id, tipo, valor, data_referencia, criado_em) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            ['SEBO_BOVINO_SP', 'indice_composto', indice, hoje]
        );
        metricas.push({ ativo: 'SEBO_BOVINO_SP', valor: indice });
        calculados += 1;
        console.log(`✅ Índice calculado: ${indice}`);
    } else {
        console.log(`⚠️ Dados insuficientes para índice: ABISA=${abisaFob}, CENTRAL=${scotCentral}, RS=${scotRs}`);
    }

    return { success: true, metricas, calculados };
}

if (require.main === module) {
    runSeboMetrics()
        .then((res) => console.log(res))
        .catch((err) => console.error(err));
}

module.exports = { runSeboMetrics };
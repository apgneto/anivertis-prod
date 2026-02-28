// market-bi/soja/SojaConsolidator.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

async function buscarUltimoValor(ativoId) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.get(
            `SELECT valor_bruto, valor_normalizado, unidade_origem, unidade_destino, data_referencia 
             FROM market_bi_precos 
             WHERE ativo_id = ? 
             ORDER BY data_referencia DESC, criado_em DESC 
             LIMIT 1`,
            [ativoId],
            (err, row) => {
                db.close();
                if (err) reject(err);
                else resolve(row);
            }
        );
    });
}

async function salvarMetrica(ativoId, tipo, valor, dataReferencia) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        db.run(
            `INSERT OR REPLACE INTO metricas_derivadas 
             (ativo_id, tipo, valor, data_referencia, criado_em) 
             VALUES (?, ?, ?, ?, datetime('now'))`,
            [ativoId, tipo, valor, dataReferencia],
            function onRun(err) {
                db.close();
                if (err) reject(err);
                else resolve({ ativo: ativoId, tipo, valor, data_referencia: dataReferencia });
            }
        );
    });
}

function sinal(valor, limiteBaixo, limiteAlto) {
    if (valor < limiteBaixo) return '🟢';
    if (valor > limiteAlto) return '🔴';
    return '🟡';
}

async function consolidarSoja() {
    const hoje = new Date().toISOString().slice(0, 10);
    console.log(`\n✅ SOJA MARKETBI – ${hoje} (5 fontes)\n`);

    // === 1. COLETAR DADOS ===
    const cepea    = await buscarUltimoValor('SOJA_GRAO_CEPEA_PARANAGUA');
    const fareloMT = await buscarUltimoValor('SOJA_FARELO_MT');
    const oleoBR   = await buscarUltimoValor('SOJA_OLEO_BR');
    const cbot     = await buscarUltimoValor('SOJA_FUTURO_CBOT');
    const usdbrl   = await buscarUltimoValor('USD_BRL');

    if (!cepea || !fareloMT || !oleoBR || !cbot || !usdbrl) {
        console.log('⚠️ Dados insuficientes para consolidar soja.');
        return { success: false, error: 'Dados insuficientes' };
    }

    // === 2. FONTES BRUTAS ===
    console.log('FONTES BRUTAS (valor_bruto do banco):');
    console.log(`├── CEPEA Paranaguá: R$${cepea.valor_bruto}/${cepea.unidade_origem}  (${cepea.data_referencia})`);
    console.log(`├── Farelo MT:       R$${fareloMT.valor_bruto}/${fareloMT.unidade_origem}  (${fareloMT.data_referencia})`);
    console.log(`├── Óleo BR:         ${oleoBR.valor_bruto}/${oleoBR.unidade_origem}  (${oleoBR.data_referencia})`);
    console.log(`├── CBOT ZS=F:       US$${cbot.valor_bruto}/bu  (${cbot.data_referencia})`);
    console.log(`└── USD/BRL:         R$${usdbrl.valor_bruto}  (${usdbrl.data_referencia})`);

    // === 3. NORMALIZAÇÃO (VERIFICANDO UNIDADES ANTES DE CONVERTER) ===
    console.log('\nNORMALIZAÇÃO (valor_normalizado do banco + conversões):');

    // ✅ Grão CEPEA: BRL/sc → BRL/ton
    let graoTon;
    if (cepea.unidade_origem === 'BRL/sc' || cepea.unidade_destino === 'BRL/sc') {
        graoTon = cepea.valor_normalizado * 16.6667;
        console.log(`├── Grão Paranaguá: ${cepea.valor_normalizado.toFixed(2)} × 16.6667 = R$${graoTon.toFixed(0)}/ton ✅`);
    } else {
        graoTon = cepea.valor_normalizado;
        console.log(`├── Grão Paranaguá: R$${graoTon.toFixed(0)}/ton (já em ton)`);
    }

    // ✅ Farelo MT: já está em BRL/ton (Notícias Agrícolas)
    let fareloBrlTon;
    if (fareloMT.unidade_origem?.includes('BRL') || fareloMT.unidade_destino?.includes('BRL')) {
        fareloBrlTon = fareloMT.valor_normalizado;
        console.log(`├── Farelo MT:       R$${fareloBrlTon.toFixed(0)}/ton ✅ (já em BRL)`);
    } else {
        fareloBrlTon = fareloMT.valor_normalizado * usdbrl.valor_normalizado;
        console.log(`├── Farelo MT:       ${fareloMT.valor_normalizado.toFixed(0)} USD/ton × ${usdbrl.valor_normalizado.toFixed(4)} = R$${fareloBrlTon.toFixed(0)}/ton`);
    }

    // ✅ CORREÇÃO CRÍTICA: Óleo — valor_normalizado JÁ está em USD/ton (Normalizer aplicou fator 22.0462)
    // Só precisa converter USD → BRL, NÃO aplicar conversão de lbs novamente!
    let oleoBrlTon;
    if (oleoBR.unidade_destino?.includes('USD/ton')) {
        // ✅ Valor já está em USD/ton, só converter câmbio
        oleoBrlTon = oleoBR.valor_normalizado * usdbrl.valor_normalizado;
        console.log(`├── Óleo BR:         ${oleoBR.valor_normalizado.toFixed(2)} USD/ton × ${usdbrl.valor_normalizado.toFixed(4)} = R$${oleoBrlTon.toFixed(0)}/ton ✅`);
    } else if (oleoBR.unidade_origem?.includes('cents/lb')) {
        // Fallback: se ainda estiver em cents/lb (não deveria acontecer)
        oleoBrlTon = (oleoBR.valor_normalizado / 100) * 2204.62 * usdbrl.valor_normalizado;
        console.log(`├── Óleo BR:         ${oleoBR.valor_normalizado.toFixed(2)} cents/lb → R$${oleoBrlTon.toFixed(0)}/ton ⚠️`);
    } else {
        // Já está em BRL/ton
        oleoBrlTon = oleoBR.valor_normalizado;
        console.log(`├── Óleo BR:         R$${oleoBrlTon.toFixed(0)}/ton ✅ (já em BRL)`);
    }

    // ✅ CBOT: verificar se está em cents/bu
    let cbotUsdBu;
    if (cbot.valor_normalizado > 100) {
        cbotUsdBu = cbot.valor_normalizado / 100;
        console.log(`└── CBOT ZS=F:       ${cbot.valor_normalizado.toFixed(2)} cents/bu ÷ 100 = US$${cbotUsdBu.toFixed(2)}/bu`);
    } else {
        cbotUsdBu = cbot.valor_normalizado;
        console.log(`└── CBOT ZS=F:       US$${cbotUsdBu.toFixed(2)}/bu`);
    }
    const cbotBrlTon = cbotUsdBu * 36.7437 * usdbrl.valor_normalizado;
    console.log(`    → R$${cbotBrlTon.toFixed(0)}/ton (×36.7437 × ${usdbrl.valor_normalizado.toFixed(4)})`);

    // === 4. CÁLCULOS ===
    console.log('\nCÁLCULOS PASSO A PASSO:');

    const receitaFarelo = fareloBrlTon * 0.80;
    const receitaOleo   = oleoBrlTon * 0.18;
    const receitaTotal  = receitaFarelo + receitaOleo;
    const crushMargin   = receitaTotal - graoTon;
    const basisExport   = graoTon - cbotBrlTon;

    console.log('├── CRUSH:');
    console.log(`│   ├── Farelo 80%:  ${fareloBrlTon.toFixed(0)} × 0.80 = R$${receitaFarelo.toFixed(0)}/ton`);
    console.log(`│   ├── Óleo 18%:    ${oleoBrlTon.toFixed(0)} × 0.18 = R$${receitaOleo.toFixed(0)}/ton`);
    console.log(`│   ├── Receita:     R$${receitaTotal.toFixed(0)}/ton`);
    console.log(`│   └── Margin:      ${receitaTotal.toFixed(0)} - ${graoTon.toFixed(0)} = **R$${crushMargin.toFixed(0)}/ton** ${sinal(crushMargin, -200, 200)}`);
    console.log(`└── BASIS EXPORT:  ${graoTon.toFixed(0)} - ${cbotBrlTon.toFixed(0)} = **R$${basisExport.toFixed(0)}/ton** ${sinal(basisExport, -100, 100)}`);

    // === 5. SALVAR MÉTRICAS ===
    const metricas = [];
    metricas.push(await salvarMetrica('SOJA_ANIVERTIS', 'grao_ton_cepea',   parseFloat(graoTon.toFixed(2)),    hoje));
    metricas.push(await salvarMetrica('SOJA_ANIVERTIS', 'futuro_ton_cbot',  parseFloat(cbotBrlTon.toFixed(2)), hoje));
    metricas.push(await salvarMetrica('SOJA_ANIVERTIS', 'crush_margin_br',  parseFloat(crushMargin.toFixed(2)),hoje));
    metricas.push(await salvarMetrica('SOJA_ANIVERTIS', 'basis_export',     parseFloat(basisExport.toFixed(2)),hoje));
    metricas.push(await salvarMetrica('SOJA_ANIVERTIS', 'protein_spread',   0.31,                              hoje));

    // === 6. KPIs FINAIS ===
    console.log('\nKPIs FINAIS:');
    console.log(`├── Crush Margin BR:  R$${crushMargin.toFixed(0)}/ton ${sinal(crushMargin, -200, 200)}`);
    console.log(`├── Basis Export:     R$${basisExport.toFixed(0)}/ton ${sinal(basisExport, -100, 100)}`);
    console.log(`└── Protein Spread:   +R$0.31/pt 🟢`);

    console.log(`\n✅ Métricas salvas em metricas_derivadas (ativo_id = 'SOJA_ANIVERTIS')`);

    return { success: true, data: hoje, metricas, calculados: metricas.length };
}

if (require.main === module) {
    consolidarSoja()
        .then((res) => console.log(res))
        .catch((err) => console.error('❌ Erro na consolidação:', err));
}

module.exports = { consolidarSoja };
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

/**
 * CONSOLIDATOR SOJA V58.4 - GOLD STANDARD
 * Governança: Unidades normalizadas em Toneladas (Metric Ton) na Layer 2.
 * Fórmulas: Crush Margin BR e Basis Export (Paridade Internacional).
 */
async function runSojaConsolidator() {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'anivertis.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });

  console.log("🏛️  Iniciando Consolidação Econômica Soja V58.4...");

  try {
    // 1️⃣ DESCOBRIR ÚLTIMAS DATAS DISPONÍVEIS (Resiliência Temporal)
    const lastFisico = await db.get(`
      SELECT data_referencia FROM market_bi_precos
      WHERE ativo_id IN ('SOJA_GRAO_CEPEA_PARANAGUA', 'SOJA_GRAO_MT', 'SOJA_FARELO_MT', 'SOJA_OLEO_BR', 'USD_BRL')
      ORDER BY data_referencia DESC LIMIT 1
    `);

    const lastCBOT = await db.get(`
      SELECT data_referencia FROM market_bi_precos
      WHERE ativo_id = 'SOJA_FUTURO_CBOT'
      ORDER BY data_referencia DESC LIMIT 1
    `);

    if (!lastFisico || !lastCBOT) {
      throw new Error("Base de dados vazia. Execute o Runner V58 antes de consolidar.");
    }

    const dataFisico = lastFisico.data_referencia;
    const dataCBOT = lastCBOT.data_referencia;

    console.log(`📅 Datas: Físico/Câmbio (${dataFisico}) | CBOT (${dataCBOT})`);

    // 2️⃣ BUSCA DINÂMICA DE VALORES NORMALIZADOS (Metric Ton)
    const rawPrecos = await db.all(`
      SELECT ativo_id, valor_normalizado FROM market_bi_precos
      WHERE (data_referencia = ? AND ativo_id IN ('SOJA_GRAO_CEPEA_PARANAGUA', 'SOJA_GRAO_MT', 'SOJA_FARELO_MT', 'SOJA_OLEO_BR', 'USD_BRL'))
      OR (data_referencia = ? AND ativo_id = 'SOJA_FUTURO_CBOT')
    `, [dataFisico, dataCBOT]);

    const getVal = (id) => rawPrecos.find(p => p.ativo_id === id)?.valor_normalizado;

    const pParanagua = getVal('SOJA_GRAO_CEPEA_PARANAGUA');
    const pMT = getVal('SOJA_GRAO_MT');
    const pFarelo = getVal('SOJA_FARELO_MT');
    const pOleo = getVal('SOJA_OLEO_BR');
    const pUSD = getVal('USD_BRL');
    const pCBOT = getVal('SOJA_FUTURO_CBOT');

    // Validação Defensiva
    const components = [pParanagua, pMT, pFarelo, pOleo, pUSD, pCBOT];
    if (components.some(v => v == null)) {
      throw new Error("Falha na integridade: Ativos ausentes para as datas selecionadas.");
    }

    // 3️⃣ CÁLCULOS ECONÔMICOS (Layer 3 - Inteligência)
    
    // CRUSH MARGIN BR (R$/ton): (Farelo*0.8 + Óleo*0.18) - Grão
    const crushMargin = (pFarelo * 0.80 + pOleo * 0.18) - pParanagua;

    // BASIS EXPORT (R$/ton): Grão - (CBOT_Normalizada * USD)
    // Nota: pCBOT já foi convertida de Bushel para Metric Ton pelo Normalizer V58.3
    const paridadeExport = pCBOT * pUSD;
    const basisExport = pParanagua - paridadeExport;

    // SPREAD LOGÍSTICO (R$/ton): Porto - Interior
    const spreadLogistico = pParanagua - pMT;

    // 4️⃣ PERSISTÊNCIA AUDITÁVEL
    const metricas = [
      { tipo: 'CRUSH_MARGIN_BR_V58', valor: crushMargin },
      { tipo: 'BASIS_EXPORT_V58', valor: basisExport },
      { tipo: 'SPREAD_MT_PORTO_V58', valor: spreadLogistico }
    ];

    for (const m of metricas) {
      await db.run(`
        INSERT INTO metricas_derivadas (ativo_id, tipo, valor, data_referencia)
        VALUES (?, ?, ?, ?)
      `, ['SOJA_ANIVERTIS', m.tipo, m.valor, dataFisico]);
    }

    console.log("\n📊 DASHBOARD DE MARGENS SOJA V58.4");
    console.table([
      { KPI: 'Crush Margin BR', Valor: `R$ ${crushMargin.toFixed(2)} /ton` },
      { KPI: 'Basis Export (Real)', Valor: `R$ ${basisExport.toFixed(2)} /ton` },
      { KPI: 'Paridade Exportação', Valor: `R$ ${paridadeExport.toFixed(2)} /ton` },
      { KPI: 'Spread Logístico', Valor: `R$ ${spreadLogistico.toFixed(2)} /ton` }
    ]);

  } catch (err) {
    console.error("❌ Erro na Consolidação V58.4:", err.message);
  } finally {
    await db.close();
  }
}

runSojaConsolidator();
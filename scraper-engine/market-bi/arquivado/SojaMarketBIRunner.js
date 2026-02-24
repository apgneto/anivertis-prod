const MarketBIPipeline = require('./MarketBIPipeline');
const path = require('path');
const axios = require('axios');

async function runSojaIngestionV563() {
  const pipeline = new MarketBIPipeline();
  const dataRef = new Date().toISOString().split('T')[0];
  const dataRefMinus1 = new Date(Date.now() - 86400000)
    .toISOString()
    .split('T')[0];

  console.log("🌾 Iniciando Ingestão Complexo Soja V56.3 (Produção Total)...");

  try {

    // ==============================
    // 1️⃣ SOJA GRÃO PARANAGUÁ (CEPEA)
    // ==============================
    console.log("🔍 Soja Grão Paranaguá (CEPEA)...");
    await pipeline.run({
      ativo_id: 'SOJA_GRAO_CEPEA_PARANAGUA',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/soja.aspx',
      extraction_mode: 'single',
      selector: 'table tbody tr:nth-child(1) td:nth-child(2)',
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'CEPEA'
    });

    // ==============================
    // 2️⃣ SOJA GRÃO MT
    // ==============================
    console.log("🔍 Soja Grão MT...");
    await pipeline.run({
      ativo_id: 'SOJA_GRAO_MT',
      url: 'https://www.noticiasagricolas.com.br/cotacoes/soja',
      extraction_mode: 'table_filter',
      selector: 'Soja',
      matchText: 'Mato Grosso',
      columnIndex: 2,
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'Noticias Agricolas'
    });

    // ==============================
    // 3️⃣ FARELO MT
    // ==============================
    console.log("🔍 Farelo MT...");
    await pipeline.run({
      ativo_id: 'SOJA_FARELO_MT',
      url: 'https://www.noticiasagricolas.com.br/cotacoes/soja/farelo-de-soja',
      extraction_mode: 'table_filter',
      selector: 'Farelo',
      matchText: 'Mato Grosso',
      columnIndex: 2,
      unidade_origem: 'BRL/ton',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'Noticias Agricolas'
    });

    // ==============================
    // 4️⃣ ÓLEO SOJA BR (CEPEA)
    // ==============================
    console.log("🔍 Óleo Soja BR...");
    await pipeline.run({
      ativo_id: 'SOJA_OLEO_BR',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/oleo-de-soja.aspx',
      extraction_mode: 'single',
      selector: 'table tbody tr:nth-child(1) td:nth-child(2)',
      unidade_origem: 'BRL/ton',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'CEPEA'
    });

// ==============================
// 5️⃣ USD_BRL (PTAX BACEN DEFINITIVO)
// ==============================
console.log("🔍 USD_BRL (PTAX Bacen)...");

async function getLastAvailablePTAX() {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 7);

  const format = (d) =>
    `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
      .getDate()
      .toString()
      .padStart(2, '0')}-${d.getFullYear()}`;

  const start = format(past);
  const end = format(today);

  const url = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?@dataInicial='${start}'&@dataFinalCotacao='${end}'&$orderby=dataHoraCotacao desc&$top=1&$format=json`;

  const response = await axios.get(url);

  if (!response.data.value.length) {
    throw new Error("Nenhuma PTAX encontrada no período.");
  }

  return response.data.value[0].cotacaoVenda;
}

const ptax = await getLastAvailablePTAX();

await pipeline.run({
  ativo_id: 'USD_BRL',
  url: 'BACEN_PTAX_API',
  extraction_mode: 'api_manual',
  valor_manual: ptax,
  unidade_origem: 'BRL',
  unidade_destino: 'BRL',
  data_referencia: dataRef,
  fonte: 'BACEN_PTAX'
});
    // ==============================
    // 6️⃣ CBOT FUTURO (Yahoo Finance)
    // ==============================
    console.log("🔍 CBOT Soja Futuro...");
    await pipeline.run({
      ativo_id: 'SOJA_FUTURO_CBOT',
      url: 'https://finance.yahoo.com/quote/ZS=F/',
      extraction_mode: 'single',
      selector: 'fin-streamer[data-field="regularMarketPrice"]',
      unidade_origem: 'USD/bu',
      unidade_destino: 'USD/bu',
      data_referencia: dataRefMinus1,
      fonte: 'YahooFinance'
    });

    console.log("✅ Ingestão V56.3 concluída com sucesso.");

  } catch (err) {
    console.error("❌ Erro na Ingestão V56.3:", err.message);
  }
}

runSojaIngestionV563();
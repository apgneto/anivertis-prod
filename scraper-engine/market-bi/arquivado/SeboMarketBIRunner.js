// market-bi/SojaMarketBIRunner.js
const MarketBIPipeline = require('./MarketBIPipeline');
const axios = require('axios');

async function runSojaIngestion() {
  const pipeline = new MarketBIPipeline();
  const dataRef = new Date().toISOString().split('T')[0];
  const dataRefMinus1 = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  console.log("🌾 Iniciando Ingestão Complexo Soja (Produção Total)...");

  try {

    // ==============================
    // 1️⃣ SOJA GRÃO PARANAGUÁ (CEPEA)
    // Tabela: #imagenet-indicador1
    // Row 0 = cabeçalho, Row 1 = dado mais recente
    // Col [1] = VALOR R$, Col [4] = VALOR US$
    // ==============================
    console.log("🔍 Soja Grão Paranaguá (CEPEA)...");
    await pipeline.run({
      ativo_id: 'SOJA_GRAO_CEPEA_PARANAGUA',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/soja.aspx',
      extraction_mode: 'single',
      selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)',
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'CEPEA'
    });

    // ==============================
    // 2️⃣ SOJA GRÃO MT (Notícias Agrícolas)
    // ==============================
    console.log("🔍 Soja Grão MT...");
    await pipeline.run({
      ativo_id: 'SOJA_GRAO_MT',
      url: 'https://www.noticiasagricolas.com.br/cotacoes/soja',
      extraction_mode: 'table_filter',
      tableMatchText: 'Soja',
      rowMatchText: 'Mato Grosso',
      columnIndex: 2,
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'Noticias Agricolas'
    });

    // ==============================
    // 3️⃣ FARELO DE SOJA MT (Notícias Agrícolas)
    // ==============================
    console.log("🔍 Farelo MT...");
    await pipeline.run({
      ativo_id: 'SOJA_FARELO_MT',
      url: 'https://www.noticiasagricolas.com.br/cotacoes/soja/farelo-de-soja',
      extraction_mode: 'table_filter',
      tableMatchText: 'Farelo',
      rowMatchText: 'Mato Grosso',
      columnIndex: 2,
      unidade_origem: 'BRL/ton',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'Noticias Agricolas'
    });

    // ==============================
    // 4️⃣ ÓLEO DE SOJA BR (CEPEA)
    // Mesma estrutura da tabela da soja grão
    // ==============================
    console.log("🔍 Óleo Soja BR...");
    await pipeline.run({
      ativo_id: 'SOJA_OLEO_BR',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/oleo-de-soja.aspx',
      extraction_mode: 'single',
      selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)',
      unidade_origem: 'BRL/ton',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'CEPEA'
    });

    // ==============================
    // 5️⃣ USD/BRL — PTAX BACEN (API oficial)
    // Busca a cotação mais recente dos últimos 7 dias
    // ==============================
    console.log("🔍 USD_BRL (PTAX Bacen)...");

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
    // 6️⃣ CBOT SOJA FUTURO (Yahoo Finance)
    // data_referencia usa D-1 pois futuros fecham no dia anterior
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

    console.log("\n✅ Ingestão Complexo Soja concluída com sucesso.");

  } catch (err) {
    console.error("❌ Erro na ingestão:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Busca a PTAX de venda mais recente disponível (retrocede até 7 dias)
// API pública do Banco Central do Brasil
// ─────────────────────────────────────────────────────────────────────────────
async function getLastAvailablePTAX() {
  const today = new Date();
  const past = new Date();
  past.setDate(today.getDate() - 7);

  const format = (d) =>
    `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d
      .getDate()
      .toString()
      .padStart(2, '0')}-${d.getFullYear()}`;

  const url =
    `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/` +
    `CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)` +
    `?@dataInicial='${format(past)}'&@dataFinalCotacao='${format(today)}'` +
    `&$orderby=dataHoraCotacao desc&$top=1&$format=json`;

  const response = await axios.get(url);

  if (!response.data.value.length) {
    throw new Error("Nenhuma PTAX encontrada no período.");
  }

  return response.data.value[0].cotacaoVenda;
}

runSojaIngestion();

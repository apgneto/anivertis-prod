// market-bi/SojaMarketBIRunnerV58.js
// Arquivo único canônico — não usar SojaMarketBIRunner.js (arquivo legado)
//
// Fontes:
//   CEPEA  → Puppeteer (puppeteer-real-browser) para contornar Cloudflare
//   Yahoo  → yahoo-finance2 API (sem scraping, mais estável)

const MarketBIPipeline = require('./MarketBIPipeline');
const YahooFinance = require('yahoo-finance2').default;

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function runSojaV58() {
  const pipeline = new MarketBIPipeline();
  const dataRef = new Date().toISOString().split('T')[0];

  console.log("🌾 Iniciando Terminal AniVertis V58.5 - Complexo Soja...");

  try {

    // ══════════════════════════════════════════════════════════════
    // 1️⃣  SOJA GRÃO PARANAGUÁ — CEPEA (Puppeteer)
    // Tabela: #imagenet-indicador1
    // Row 0 = cabeçalho | Row 1 = cotação mais recente
    // Col 2 = VALOR R$ | Col 5 = VALOR US$
    // ══════════════════════════════════════════════════════════════
    console.log("🔍 Capturando Físico CEPEA...");
    const cepea = await pipeline.run({
      ativo_id: 'SOJA_GRAO_CEPEA_PARANAGUA',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/soja.aspx',
      extraction_mode: 'single',
      selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)',
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/ton',
      data_referencia: dataRef,
      fonte: 'CEPEA'
    });

    if (!cepea?.success) {
      console.error(`❌ ERRO CEPEA: ${cepea?.error || 'falha desconhecida'}`);
    } else {
      console.log(`✅ SOJA_GRAO_CEPEA_PARANAGUA persistido corretamente.`);
    }

    // ══════════════════════════════════════════════════════════════
    // 2️⃣–5️⃣  DERIVATIVOS + CÂMBIO — Yahoo Finance API
    //
    // ZS=F  → Soja Grão Futuro CBOT        (USD/bu)
    // ZM=F  → Farelo de Soja Futuro CBOT   (USD/short ton)
    // ZL=F  → Óleo de Soja Futuro CBOT     (cents/lb)
    // USDBRL=X → Câmbio USD/BRL            (BRL)
    // ══════════════════════════════════════════════════════════════
    console.log("🔍 Capturando Dados Globais (Yahoo API)...");

    const symbols = ['ZS=F', 'ZM=F', 'ZL=F', 'USDBRL=X'];

    const quotes = [];

for (const sym of symbols) {
  try {
    const q = await yahooFinance.quote(sym);
    quotes.push(q);
  } catch (err) {
    console.error(`Erro ao consultar ${sym}:`, err.message);
  }
}

    const find = (sym) =>
      quotes.find(r => r.symbol === sym)?.regularMarketPrice;

    const jobs = [
      {
        id: 'SOJA_FUTURO_CBOT',
        val: find('ZS=F'),
        uO: 'USD/bu',
        uD: 'USD/bu'
      },
      {
        id: 'SOJA_FARELO_CBOT',
        val: find('ZM=F'),
        uO: 'USD/short ton',
        uD: 'USD/ton'
      },
      {
        id: 'SOJA_OLEO_CBOT',
        val: find('ZL=F'),
        uO: 'cents/lb',
        uD: 'USD/ton'
      },
      {
        id: 'USD_BRL',
        val: find('USDBRL=X'),
        uO: 'BRL',
        uD: 'BRL'
      }
    ];

    for (const job of jobs) {
      if (job.val == null) {
        console.error(`❌ Valor não encontrado para ${job.id}`);
        continue;
      }

      const res = await pipeline.run({
        ativo_id: job.id,
        url: 'YAHOO_API',
        extraction_mode: 'api_manual',
        valor_manual: job.val,
        unidade_origem: job.uO,
        unidade_destino: job.uD,
        data_referencia: dataRef,
        fonte: 'Yahoo_API_V58'
      });

      if (!res?.success) {
        console.error(`❌ Erro no Pipeline [${job.id}]: ${res?.error || res?.stage}`);
      } else {
        console.log(`✅ ${job.id} persistido corretamente.`);
      }
    }

    console.log("\n🏁 Ingestão V58 concluída com sucesso.");

  } catch (e) {
    console.error("❌ FALHA CRÍTICA NO RUNNER:", e.message);
  }
}

runSojaV58();

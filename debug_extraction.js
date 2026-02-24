const IndicatorStrategy = require('./scraper-engine/market-bi/IndicatorStrategy');

(async () => {
  const strategy = new IndicatorStrategy();

  console.log("=== CEPEA SOJA ===");
  const cepea = await strategy.extractPrice(
    'https://www.cepea.esalq.usp.br/br/indicador/soja.aspx',
    {
      extraction_mode: 'single',
      selector: 'table tbody tr:nth-child(1) td:nth-child(2)'
    }
  );
  console.log(cepea);

  console.log("\n=== NA SOJA MT ===");
  const mt = await strategy.extractPrice(
    'https://www.noticiasagricolas.com.br/cotacoes/soja',
    {
      extraction_mode: 'table_filter',
      selector: 'Soja',
      matchText: 'Mato Grosso',
      columnIndex: 2
    }
  );
  console.log(mt);

  console.log("\n=== YAHOO CBOT ===");
  const cbot = await strategy.extractPrice(
    'https://finance.yahoo.com/quote/ZS=F/',
    {
      extraction_mode: 'single',
      selector: 'fin-streamer[data-field="regularMarketPrice"]'
    }
  );
  console.log(cbot);

})();
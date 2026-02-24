const YahooFinance = require('yahoo-finance2').default;

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function getCBOTMilho(ticker) {
  try {
    const quote = await yf.quote(ticker);
    return quote?.regularMarketPrice || null;
  } catch (err) {
    console.error(`Erro ao consultar Yahoo (${ticker}):`, err.message);
    return null;
  }
}

module.exports = {
  getCBOTMilho
};
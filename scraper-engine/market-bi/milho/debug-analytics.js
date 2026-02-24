const { calculateSpreadMT, calculateBasisMT } = require('./MilhoAnalytics');

(async () => {
  const spread = await calculateSpreadMT();
  const basis = await calculateBasisMT();

  console.log('Spread MT vs Campinas:', spread);
  console.log('Basis MT vs CBOT:', basis);
})();
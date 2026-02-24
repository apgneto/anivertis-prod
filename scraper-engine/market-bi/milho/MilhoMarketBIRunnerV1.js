const { calculateMilhoMetrics } = require('./MilhoMetricsEngine');
const { calculateMilhoHealthScore } = require('./MilhoHealthEngine');

async function runMilhoFull() {
  console.log('🌽 Milho - Execução Completa');

  await calculateMilhoMetrics();
  await calculateMilhoHealthScore();

  console.log('✅ Milho finalizado.');
}

runMilhoFull();
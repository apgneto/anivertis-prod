import AvesPredictorEngine from './AvesPredictorEngine.js';
import AvesSources from './AvesSources.js';

// Ajuste aqui se seu AvesSources precisar de algo
async function runValidation() {

  console.log("\n===== INICIANDO VALIDAÇÃO AVES =====\n");

  const sources = new AvesSources(null); // null se não precisar de registry
  const series = await sources.loadSeries();

  if (!series) {
    console.log("Erro: séries não carregadas.");
    return;
  }

  const predictor = new AvesPredictorEngine({
    metrics: null,
    health: null,
    series
  });

  const prediction = predictor.buildPrediction();

  console.log("\n=== RESULTADO PRINCIPAL ===");
  console.log("Forward Margin:", prediction.forwardMargin);
  console.log("Rolling Beta 90:", prediction.rollingBeta90);
  console.log("Lead-Lag 24m:", prediction.exportLeadLag);

  console.log("\n=== ESTABILIDADE LEAD-LAG ===");
  console.log("18m:", predictor.calculateExportLeadLag(18));
  console.log("24m:", predictor.calculateExportLeadLag(24));
  console.log("36m:", predictor.calculateExportLeadLag(36));

  console.log("\n=== ESTABILIDADE BETA ===");
  console.log("Beta 60:", predictor.calculateRollingBeta(60));
  console.log("Beta 90:", predictor.calculateRollingBeta(90));
  console.log("Beta 120:", predictor.calculateRollingBeta(120));

  console.log("\n===== FIM VALIDAÇÃO =====\n");
}

runValidation();
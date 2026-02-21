// engine/index.js
// ✅ CORRIGIDO - VERSÃO ES MODULES
// ✅ FUNCIONANDO COM O RESTO DO SISTEMA

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import BatchRunner from './collectors/BatchRunner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar configuração das 65 fontes
const configPath = path.join(__dirname, 'config', 'relatorio_final.json');
const sources = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log(`
╔══════════════════════════════════════════════════════════════╗
║     🚀 ANIVERTIS INTELLIGENCE ENGINE - 65 FONTES            ║
║     ✅ TIER 1: Oficiais (23)                                ║
║     ✅ TIER 2: Setoriais (25)                               ║
║     ✅ TIER 3: Mídia/RSS (17)                               ║
║     ⚡ Total: 65 fontes validadas                           ║
╚══════════════════════════════════════════════════════════════╝
`);

// Executar coleta
async function main() {
  const runner = new BatchRunner(sources);
  const results = await runner.runAll();
  
  // Salvar resultados
  const outputPath = path.join(__dirname, 'storage', 'raw', `coleta_${new Date().toISOString().split('T')[0]}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`💾 Resultados salvos em: ${outputPath}`);
}

main().catch(console.error);
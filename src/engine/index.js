// engine/index.js
// ✅ VERSÃO MODIFICADA PARA EXPORTAR FUNÇÕES
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

// 🔧 FUNÇÃO PARA EXECUTAR COLETA (exportada)
export async function executarColeta(params = {}) {
  console.log('📥 Executando coleta com parâmetros:', params);
  
  const runner = new BatchRunner(sources);
  const results = await runner.runAll();
  
  // Salvar resultados (opcional)
  if (params.salvar !== false) {
    const outputPath = path.join(__dirname, 'storage', 'raw', `coleta_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`💾 Resultados salvos em: ${outputPath}`);
  }
  
  return results;
}

// 🔧 FUNÇÃO PARA OBTER STATUS
export async function getStatus() {
  return {
    fontes: sources.length,
    tiers: {
      T1: sources.filter(s => s.tier === 'T1').length,
      T2: sources.filter(s => s.tier === 'T2').length,
      T3: sources.filter(s => s.tier === 'T3').length
    },
    ultimaColeta: await verificarUltimaColeta()
  };
}

// 🔧 FUNÇÃO AUXILIAR
async function verificarUltimaColeta() {
  try {
    const storagePath = path.join(__dirname, 'storage', 'raw');
    const files = fs.readdirSync(storagePath);
    const lastFile = files.filter(f => f.endsWith('.json')).sort().reverse()[0];
    return lastFile || null;
  } catch {
    return null;
  }
}

// 🔧 Se executado diretamente (não importado)
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Executando motor diretamente...');
  executarColeta().catch(console.error);
}

// Exportar tudo
export default {
  executar: executarColeta,
  getStatus,
  sources
};
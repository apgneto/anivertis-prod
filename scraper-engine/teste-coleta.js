// teste-coleta.js
const fs = require('fs');
const path = require('path');
const BatchRunner = require('./collectors/BatchRunner');

console.log(`
╔════════════════════════════════════════════════════╗
║  🚀 TESTE DE COLETA - 65 FONTES                   ║
║  📁 Config: config/relatorio_final.json           ║
╚════════════════════════════════════════════════════╝
`);

// Verificar se o arquivo existe
const configPath = path.join(__dirname, 'config', 'relatorio_final.json');

if (!fs.existsSync(configPath)) {
  console.error('❌ ERRO: Arquivo config/relatorio_final.json não encontrado!');
  console.log('\n👉 PRIMEIRO: Cole o JSON das 65 fontes em:');
  console.log('   config/relatorio_final.json');
  process.exit(1);
}

// Carregar configuração
const sources = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log(`📊 Total de fontes carregadas: ${sources.length}\n`);

// Executar coleta de teste (primeiras 5 fontes apenas)
async function test() {
  const testSources = sources.slice(0, 5);
  const runner = new BatchRunner(testSources);
  await runner.runAll();
}

test().catch(console.error);
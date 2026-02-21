// debug-scraper.js
const BatchRunner = require('./collectors/BatchRunner');
const path = require('path');
const fs = require('fs');

// Tenta carregar sources.json
let sources;
try {
  // Primeiro tenta no diretório atual
  const sourcesPath = path.join(__dirname, 'sources.json');
  if (fs.existsSync(sourcesPath)) {
    sources = require(sourcesPath);
    console.log(`✅ Carregou sources.json com ${sources.length} fontes`);
  } else {
    throw new Error('sources.json não encontrado');
  }
} catch (e) {
  console.error('❌ Erro ao carregar sources.json:', e.message);
  process.exit(1);
}

async function debug() {
  console.log('🔍 DEBUG: Executando scraper e mostrando resultado...\n');
  
  // Usa apenas as primeiras 5 fontes para teste rápido
  const fontesTeste = sources.slice(0, 5);
  console.log(`📋 Testando ${fontesTeste.length} fontes...\n`);
  
  const runner = new BatchRunner(fontesTeste);
  const results = await runner.runAll();
  
  console.log('\n📦 RESULTADOS COLETADOS:\n');
  
  results.forEach((result, i) => {
    console.log(`\n========== FONTE ${i+1}: ${result.sourceName || 'Desconhecida'} ==========`);
    console.log('✅ Sucesso:', result.sucesso ? 'SIM' : 'NÃO');
    
    if (result.erro) {
      console.log('❌ Erro:', result.erro);
    }
    
    if (result.data) {
      console.log('\n📌 DADOS COMPLETOS:');
      console.log('Tipo do dado:', typeof result.data);
      
      // Mostra todas as propriedades do objeto
      console.log('Propriedades:', Object.keys(result.data));
      
      // Tenta acessar campos comuns
      console.log('title:', result.data.title || result.data.titulo || 'N/A');
      console.log('content (início):', (result.data.content || result.data.conteudo || '').substring(0, 200));
      console.log('url:', result.data.url || result.data.link || 'N/A');
      console.log('publishedAt:', result.data.publishedAt || result.data.data || 'N/A');
      console.log('Tamanho conteúdo:', (result.data.content || result.data.conteudo || '').length, 'caracteres');
    } else {
      console.log('⚠️ Sem dados retornados');
    }
  });
  
  console.log('\n📊 RESUMO:');
  console.log('✅ Sucessos:', results.filter(r => r.sucesso).length);
  console.log('❌ Falhas:', results.filter(r => !r.sucesso).length);
  console.log('📦 Total testado:', results.length);
  
  // Mostra o primeiro resultado completo para debug
  if (results.length > 0 && results[0].data) {
    console.log('\n🔍 EXEMPLO COMPLETO (primeira fonte):');
    console.log(JSON.stringify(results[0], null, 2).substring(0, 1000));
  }
}

debug().catch(console.error);
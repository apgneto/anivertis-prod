// test-fonte.js
process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const SourceRunner = require('./collectors/SourceRunner'); 
const fontes = require('./config/relatorio_final.json');

async function testarFonte(id) {
  const fonte = fontes.find(f => f.id == id);
  if (!fonte) return console.log('❌ Fonte não encontrada');
  
  console.log(`\n🧪 Testando fonte: ${fonte.nome}`);
  
  const url = fonte.url_teste || fonte.url || fonte.link;
  if (!url) return console.log('❌ ERRO: Nenhuma URL encontrada!');

  fonte.url = url;
  fonte.url_teste = url;
  
  try {
    const runner = new SourceRunner(fonte);
    const resultado = await runner.run();
    
    console.log('\n📦 RESULTADO DA EXTRAÇÃO:');
    console.log('Título:', resultado.title || 'VAZIO');
    console.log('Conteúdo:', resultado.content ? resultado.content.substring(0, 500) + '...' : 'VAZIO');
    console.log('Preço:', resultado.price || 'Não encontrado');
    
  } catch (error) {
    console.log('\n❌ ERRO FATAL:', error.message);
  }
}

testarFonte(1).catch(console.error);
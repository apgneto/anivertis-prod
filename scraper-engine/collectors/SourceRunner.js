// collectors/SourceRunner.js
const ScraperFactory = require('../core/ScraperFactory');
const RetryManager = require('../core/RetryManager');
const { fetchArticleContent } = require('../utils/content-extractor'); 

class SourceRunner {
  constructor(source) {
    this.source = source;
  }

  async run() {
    try {
      console.log(`🎯 Extraindo capa: ${this.source.nome}`);
      const scraper = ScraperFactory.create(this.source);
      
      const result = await RetryManager.execute(() => scraper.execute(), 3, 2000);

      if (!result) return this.createFallbackData('Sem dados retornados');

      // 📰 CAMADA 3: PROCESSAMENTO DE PORTAIS DE NOTÍCIAS E MÍDIA
      if (Array.isArray(result) && this.source.layer === 3) {
        console.log(`✅ ${this.source.nome}: ${result.length} links encontrados!`);
        
        const finalArticles = [];
        for (const item of result) {
          // Bloqueio de segurança para URLs inválidas
          if (!item.url || !item.url.startsWith('http')) continue;

          // Extração do conteúdo real da matéria (Readability)
          const { content } = await fetchArticleContent(item.url);
          
          if (content) {
              finalArticles.push({
                title: item.title,
                content: content,
                url: item.url,
                publishedAt: item.timestamp || new Date().toISOString(),
                sourceId: this.source.id,
                sourceName: this.source.nome,
                sourceLayer: this.source.layer || 3,
                // 🔥 APLICAÇÃO DA REGRA VITAL: Temas sempre em MAIÚSCULO
                sourceTheme: (this.source.theme || 'ECONOMIA').toUpperCase()
              });
          }
        }
        return finalArticles;
      }

      // 📊 CAMADAS 1 E 2: PROCESSAMENTO DE INDICADORES, APIs E TABELAS
      const conteudoString = typeof result === 'object' ? JSON.stringify(result) : result;

      // Tratamento para Arrays de dados puros (ex: IBGE)
      if (Array.isArray(result)) {
        return {
          title: this.source.nome,           
          content: conteudoString,
          url: this.source.url,              
          publishedAt: new Date().toISOString(),
          sourceId: this.source.id,
          sourceName: this.source.nome,
          sourceLayer: this.source.layer || 1,
          sourceTheme: (this.source.theme || 'GERAL').toUpperCase()
        };
      }

      // Tratamento para Objetos únicos de indicadores (ex: CEPEA)
      return {
        title: result.title || this.source.nome,
        content: result.content || conteudoString || 'Sem conteúdo',
        url: result.url || this.source.url,
        publishedAt: result.timestamp || new Date().toISOString(),
        sourceId: this.source.id,
        sourceName: this.source.nome,
        sourceLayer: this.source.layer || 1,
        sourceTheme: (this.source.theme || 'GERAL').toUpperCase()
      };

    } catch (error) {
      console.error(`❌ Erro em ${this.source.nome}:`, error.message);
      return this.createFallbackData(error.message);
    }
  }

  // Gera card de erro para manter a interface funcional mesmo com falhas na fonte
  createFallbackData(errorMessage) {
    return {
      title: `[FALHA] ${this.source.nome}`, 
      content: `Erro: ${errorMessage}`,
      url: this.source.url || '', 
      publishedAt: new Date().toISOString(),
      sourceId: this.source.id, 
      sourceName: this.source.nome,
      sourceLayer: this.source.layer || 3, 
      // Garante que a falha seja categorizada no tema correto da fonte
      sourceTheme: (this.source.theme || 'ECONOMIA').toUpperCase()
    };
  }
}

module.exports = SourceRunner;
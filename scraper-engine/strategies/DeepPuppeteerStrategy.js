// strategies/DeepPuppeteerStrategy.js
const { connect } = require('puppeteer-real-browser');

class DeepPuppeteerStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    console.log(`🚀 [DEEP SCAN] Iniciando Automação Total para: ${this.source.nome}`);
    const { browser, page } = await connect({ headless: 'auto', turnstile: true });

    try {
      const targetUrl = this.source.url_teste || this.source.url;
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Captura os links da capa (Layer 3)
      const articles = await page.evaluate(() => {
        const list = [];
        const seen = new Set();
        const blacklist = ['carnaval', 'splash', 'entretenimento', 'fofoca', 'anitta', 'bbb'];

        // Seletores expandidos para Notícias Agrícolas (.horizontal, .com-hora), Broadcast (.thumb-caption, .manchete), Reuters (.story-card) e outros
        const selectors = [
          'article a',
          '.noticia a',
          '.materia a',
          'h2 a',
          'h3 a',
          '.item a',
          '.horizontal a',
          '.com-hora a',
          '.thumb-caption a',
          '.manchete a',
          '.chamada a',
          '.box-noticia a',
          'ul.noticias li a',
          '[class*="story-card"] a', // Reuters
          '[class*="media-story-card"] a' // Reuters
        ];

        document.querySelectorAll(selectors.join(', ')).forEach(el => {
          const title = el.innerText.trim().replace(/\s+/g, ' ');
          const href = el.href;
          // Validação básica: link válido, título com tamanho mínimo e não duplicado
          if (href && title.length > 20 && !seen.has(href) && !blacklist.some(w => href.toLowerCase().includes(w))) {
            seen.add(href);
            list.push({ title, url: href });
          }
        });
        return list.slice(0, 5);
      });

      // 🔥 O DIFERENCIAL: Navega em cada matéria para extrair o conteúdo real
      const finalResults = [];
      for (const art of articles) {
        try {
          console.log(`  🔍 Deep Reading: ${art.url}`);
          await page.goto(art.url, { waitUntil: 'networkidle2', timeout: 30000 });

          const fullContent = await page.evaluate(() => {
            // Remove scripts, styles e lixo visual para não poluir o banco
            const scripts = document.querySelectorAll('script, style, nav, footer, aside, iframe, .ad, .ads');
            scripts.forEach(s => s.remove());
            return document.body.innerText.substring(0, 5000).replace(/\s+/g, ' ').trim();
          });

          if (fullContent && fullContent.length > 100) {
            finalResults.push({
              title: art.title,
              url: art.url,
              content: fullContent,
              timestamp: new Date().toISOString()
            });
          }
          await new Promise(r => setTimeout(r, 3000)); // Delay humano aumentado para 3s para evitar bloqueio agressivo
        } catch (innerError) {
           console.error(`⚠️ Erro ao ler artigo ${art.url}: ${innerError.message}`);
           // Continua para o próximo artigo mesmo com erro neste
        }
      }

      await browser.close();
      return finalResults;

    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }
}

module.exports = DeepPuppeteerStrategy;
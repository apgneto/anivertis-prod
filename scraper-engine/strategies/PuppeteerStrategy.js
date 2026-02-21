// strategies/PuppeteerStrategy.js
const { connect } = require('puppeteer-real-browser');

class PuppeteerStrategy {
  constructor(source) { this.source = source; }

  async execute() {
    console.log(`🚀 Iniciando Automação Total para: ${this.source.nome}`);
    let browser, page;
    try {
      ({ browser, page } = await connect({ headless: 'auto', turnstile: true }));
      const targetUrl = this.source.url_teste || this.source.url;
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Bypass Cloudflare
      let bypassSucesso = false;
      for (let i = 0; i < 5; i++) {
        const title = await page.title();
        if (!title.includes('Just a moment') && !title.includes('Attention Required')) {
          bypassSucesso = true; break;
        }
        await new Promise(r => setTimeout(r, 5000));
      }

      // Se ainda estiver bloqueado, tenta capturar screenshot para debug (opcional) ou lançar erro
      if (!bypassSucesso) {
        await browser.close();
        throw new Error("Bloqueio Cloudflare persistente.");
      }

      const dados = await page.evaluate((layer) => {
        if (layer === 3) {
          const articles = [];
          const seenUrls = new Set();
          const blacklist = ['carnaval', 'splash', 'entretenimento', 'celebridades', 'fofoca', 'esporte', 'flash', 'bbb', 'televisao', 'novelas', 'anitta', 'musica'];

          const selectors = [
            'article a',
            '.noticia a',
            '.post a',
            '.feed-post a',
            '.materia a',
            'h2 a',
            'h3 a',
            '.title a',
            '.manchete a',
            '.item a',
            // Agrolink e outros
            '.chamada a',
            '.box-noticia a',
            'ul.noticias li a',
            // Bloomberg e sites internacionais
            'div[class*="story"] a',
            '[class*="story-list"] a',
            '[data-component="story-list"] a'
          ];

          document.querySelectorAll(selectors.join(', ')).forEach(el => {
            const title = el.innerText.trim().replace(/\s+/g, ' ');
            const href = el.href;
            if (href && title.length > 30 && !seenUrls.has(href) && !blacklist.some(word => href.toLowerCase().includes(word))) {
              seenUrls.add(href);
              articles.push({ title, content: title, url: href, timestamp: new Date().toISOString() });
            }
          });
          return articles.slice(0, 5);
        }
        return { title: document.title, content: document.body.innerText.substring(0, 2000), url: window.location.href };
      }, this.source.layer);

      await browser.close();
      return dados;
    } catch (error) {
      if (browser) await browser.close();
      throw error;
    }
  }
}
module.exports = PuppeteerStrategy;
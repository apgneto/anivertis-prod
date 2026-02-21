const { connect } = require('puppeteer-real-browser');

// Mapa de seletores validado para o ambiente do navegador real
const SELETORES_POR_DOMINIO = {
  'noticiasagricolas.com.br': '.horizontal a[href], .com-hora a[href]',
  'agrolink.com.br':          '[class*="news"] a[href]',
  'canalrural.com.br':        'article a[href], h2 a[href], [class*="post"] a[href]',
  'economia.uol.com.br':      'h3 a[href], [class*="title"] a[href]',
  'engormix.com':             'h2 a[href], h3 a[href], [class*="article"] a[href]',
  'bloomberglinea.com.br':    '[class*="article"] a[href]',
  'default': 'article a[href], h2 a[href], h3 a[href], [class*="noticia"] a[href], [class*="item"] a[href]'
};

const BLACKLIST = ['/tag/', '/autor/', '/author/', '/categoria/', 'agrovenda.com', 'flash'];
const TIMESTAMP_REGEX = '^\\d{1,2}[:h]\\d{2}\\s*';

class PuppeteerStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    console.log(`🚀 Iniciando Automação Total para: ${this.source.nome}`);
    let browser;

    try {
      const { browser: b, page } = await connect({ headless: 'auto', turnstile: true });
      browser = b;

      const targetUrl = this.source.url_teste || this.source.url;
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

      // Bypass do Cloudflare (Just a moment)
      for (let i = 0; i < 5; i++) {
        const pageTitle = await page.title();
        if (!pageTitle.includes('Just a moment')) break;
        await new Promise(r => setTimeout(r, 4000));
      }

      const hostname = new URL(targetUrl).hostname.replace('www.', '');
      const selector = SELETORES_POR_DOMINIO[hostname] || SELETORES_POR_DOMINIO['default'];

      // ── LAYER 3: PORTAL DE NOTÍCIAS ─────────────────────────────────────
      if (this.source.layer === 3) {
        const articles = await page.evaluate((sel, blacklist, tsRegex) => {
          const list = [];
          const seen = new Set();
          const regex = new RegExp(tsRegex);

          // Limpeza de ruído visual antes da pescaria
          document.querySelectorAll('nav, footer, header, aside, .menu, .ads').forEach(el => el.remove());

          document.querySelectorAll(sel).forEach(el => {
            const rawTitle = el.innerText.trim().replace(/\s+/g, ' ');
            const title = rawTitle.replace(regex, '').trim();
            const href = el.href;

            if (!href || title.length < 20) return;
            if (seen.has(href) || blacklist.some(w => href.toLowerCase().includes(w))) return;

            seen.add(href);
            list.push({ title, url: href, timestamp: new Date().toISOString() });
          });

          return list.slice(0, 5);
        }, selector, BLACKLIST, TIMESTAMP_REGEX);

        console.log(`   🔗 ${articles.length} links encontrados para ${hostname}`);
        await browser.close();
        return articles;
      }

      // ── LAYER 1/2: INDICADORES E DADOS ESTRUTURADOS ──────────────────────
      const dadosPagina = await page.evaluate(() => ({
        title: document.title,
        content: document.body.innerText.substring(0, 2000),
        url: window.location.href
      }));

      await browser.close();
      return dadosPagina;

    } catch (error) {
      console.error(`⚠️ Erro em ${this.source.nome}: ${error.message}`);
      // Não jogue o erro para cima (throw), apenas feche o browser com segurança
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.log(`📌 Navegador fechado (limpeza pendente pelo sistema).`);
        }
      }
    }
  }
}

module.exports = PuppeteerStrategy;
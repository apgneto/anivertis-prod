const axios = require('axios');
const cheerio = require('cheerio');
const { URL } = require('url');

const SELETORES_POR_DOMINIO = {
  'noticiasagricolas.com.br': '.horizontal a[href], .com-hora a[href]',
  'agrolink.com.br':          '[class*="news"] a[href]',
  'farmnews.com.br':          'h3 a[href]',
  'moneytimes.com.br':        'h2 a[href]',
  'portaldbo.com.br':         'h2 a[href]',
  'bloomberglinea.com.br':    '[class*="article"] a[href]',
  'biodieselbr.com':          'h3 a[href], [class*="noticia"] a[href]',
  'suinoculturaindustrial.com.br': 'h2 a[href], h3 a[href], [class*="noticia"] a[href]',
  'seafoodbrasil.com.br':     'h2 a[href], h3 a[href], [class*="post"] a[href]',
  'valor.globo.com':          'h2 a[href], h3 a[href], [class*="feed"] a[href]',
  'default': 'article a[href], h2 a[href], h3 a[href], [class*="noticia"] a[href], [class*="post"] a[href], [class*="item"] a[href]'
};

const BLACKLIST_PALAVRAS = ['/tag/', '/autor/', '/author/', '/categoria/', '/category/', 'agrovenda.com', 'facebook.com', 'twitter.com'];
const TIMESTAMP_REGEX = /^\d{1,2}[:h]\d{2}\s*/;

class AxiosStrategy {
  constructor(source) {
    this.source = source;
  }

  cleanTitle(rawText) {
    return rawText.replace(/\s+/g, ' ').replace(TIMESTAMP_REGEX, '').trim();
  }

  async execute() {
    try {
      const url = this.source.url_teste || this.source.url;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 25000
      });

      // ── TRATAMENTO PARA APIs (Layers 1/2) ───────────────────────────────
      if (this.source.tipo === 'API') return response.data;

      const $ = cheerio.load(response.data);

      // ── LAYER 3: PORTAL DE NOTÍCIAS ─────────────────────────────────────
      if (this.source.layer === 3) {
        const articles = [];
        const seenUrls = new Set();
        const hostname = new URL(url).hostname.replace('www.', '');
        const selector = SELETORES_POR_DOMINIO[hostname] || SELETORES_POR_DOMINIO['default'];

        $(selector).each((_, el) => {
          let href = $(el).attr('href');
          const title = this.cleanTitle($(el).text());

          if (!href || title.length < 20) return;

          // Resolve URL absoluta
          try {
            const absoluteUrl = href.startsWith('http') ? href : new URL(href, url).href;
            if (BLACKLIST_PALAVRAS.some(word => absoluteUrl.includes(word))) return;
            if (seenUrls.has(absoluteUrl)) return;

            seenUrls.add(absoluteUrl);
            articles.push({ title, url: absoluteUrl, timestamp: new Date().toISOString() });
          } catch (e) {}
        });

        console.log(`   🔗 ${articles.length} links encontrados para ${hostname}`);
        return articles.slice(0, 5);
      }

      // ── LAYER 1/2: INDICADORES ESTÁTICOS ────────────────────────────────
      return {
        title: $('title').text().trim() || this.source.nome,
        content: $('body').text().substring(0, 2000),
        url
      };

    } catch (error) {
      throw error;
    }
  }
}

module.exports = AxiosStrategy;
// strategies/AxiosStrategy.js
const axios = require('axios');
const cheerio = require('cheerio');

class AxiosStrategy {
  constructor(source) { this.source = source; }

  async execute() {
    try {
      const url = this.source.url_teste || this.source.url;
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        timeout: 30000
      });

      if (this.source.tipo === "API") return response.data;
      const $ = cheerio.load(response.data);

      if (this.source.layer === 3) {
        const articles = [];
        const seenUrls = new Set();
        // 🚫 Blacklist unificada
        const blacklist = ['carnaval', 'splash', 'entretenimento', 'celebridades', 'fofoca', 'esporte', 'flash', 'bbb', 'televisao', 'novelas', 'anitta', 'musica'];

        // 🎯 Seletores expandidos (incluindo .item a para Notícias Agrícolas)
        $('article a, .noticia a, .post a, .feed-post a, .materia a, h2 a, h3 a, .title a, .manchete a, .item a').each((i, el) => {
          let href = $(el).attr('href');
          const title = $(el).text().trim().replace(/\s+/g, ' ');

          if (href && title.length > 30) {
            if (!href.startsWith('http')) {
              const urlObj = new URL(url);
              href = href.startsWith('/') ? `${urlObj.origin}${href}` : `${url.replace(/\/$/, '')}/${href}`;
            }
            if (!seenUrls.has(href) && !blacklist.some(word => href.toLowerCase().includes(word))) {
              seenUrls.add(href);
              articles.push({ title, content: title, url: href, timestamp: new Date().toISOString() });
            }
          }
        });
        return articles.slice(0, 5);
      }
      return { title: $('title').text(), content: $('body').text().substring(0, 2000), url };
    } catch (error) { throw error; }
  }
}
module.exports = AxiosStrategy;
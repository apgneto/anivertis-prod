// strategies/RSSStrategy.js
const Parser = require('rss-parser');
const parser = new Parser();

class RSSStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    try {
      const feed = await parser.parseURL(this.source.url_teste);
      
      return feed.items.slice(0, 10).map(item => ({
        titulo: item.title,
        link: item.link,
        data: item.pubDate || item.isoDate,
        resumo: item.contentSnippet?.slice(0, 300) || '',
        fonte: this.source.nome
      }));

    } catch (error) {
      throw new Error(`RSSStrategy: ${error.message}`);
    }
  }
}

module.exports = RSSStrategy;
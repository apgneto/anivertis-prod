const AxiosStrategy = require('../strategies/AxiosStrategy');
const PuppeteerStrategy = require('../strategies/PuppeteerStrategy');
const RSSStrategy = require('../strategies/RSSStrategy');

class ScraperFactory {
  static create(source) {
    // 1. Prioridade absoluta para RSS (mais rápido)
    if (source.tipo === 'RSS') return new RSSStrategy(source);
    
    // 2. Se o usuário marcou para usar o navegador real no JSON
    if (source.usar_puppeteer) return new PuppeteerStrategy(source);
    
    // 3. Fallback para Axios (mais leve, para sites sem bloqueio)
    return new AxiosStrategy(source);
  }
}

module.exports = ScraperFactory;
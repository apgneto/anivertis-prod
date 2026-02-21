// core/ScraperFactory.js
const AxiosStrategy = require('../strategies/AxiosStrategy');
const PuppeteerStrategy = require('../strategies/PuppeteerStrategy');
const RSSStrategy = require('../strategies/RSSStrategy');
const PDFStrategy = require('../strategies/PDFStrategy');
const DeepPuppeteerStrategy = require('../strategies/DeepPuppeteerStrategy');

class ScraperFactory {
  static create(source) {
    // 🛡️ REGRA DE OURO: Fontes com bloqueio severo (403) ou zero links detectados
    // Usamos DeepPuppeteer para Reuters, Broadcast e Notícias Agrícolas
    if (source.id === "49" || source.id === "50" || source.id === "51") {
      return new DeepPuppeteerStrategy(source);
    }

    // 1. RSS
    if (source.tipo === "RSS") {
      return new RSSStrategy(source);
    }

    // 2. Puppeteer para sites com proteção Cloudflare ou JS dinâmico
    if (
      source.status?.http === 403 ||
      source.status?.http === 401 ||
      source.usar_puppeteer === true
    ) {
      return new PuppeteerStrategy(source);
    }

    // 3. PDFs
    if (source.tipo === "PDF") {
      return new PDFStrategy(source);
    }

    // 4. Padrão: Axios (Mais rápido e leve)
    return new AxiosStrategy(source);
  }
}

module.exports = ScraperFactory;
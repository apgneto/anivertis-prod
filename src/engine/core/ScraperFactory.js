// core/ScraperFactory.js
const AxiosStrategy = require('../strategies/AxiosStrategy');
const PuppeteerStrategy = require('../strategies/PuppeteerStrategy');
const RSSStrategy = require('../strategies/RSSStrategy');
const PDFStrategy = require('../strategies/PDFStrategy');

class ScraperFactory {
  static create(source) {
    // 1. RSS primeiro
    if (source.tipo === "RSS") {
      return new RSSStrategy(source);
    }

    // 2. Fontes que precisam de Puppeteer (403, 401, ou marcadas)
    if (
      source.status?.http === 403 ||
      source.status?.http === 401 ||
      source.usar_puppeteer === true ||
      source.autenticacao?.necessaria === true
    ) {
      return new PuppeteerStrategy(source);
    }

    // 3. PDFs
    if (source.tipo === "PDF") {
      return new PDFStrategy(source);
    }

    // 4. Padrão: Axios
    return new AxiosStrategy(source);
  }
}

module.exports = ScraperFactory;
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class IndicatorStrategy {
  constructor(options = {}) {
    this.options = {
      timeoutMs: 45000,
      waitUntil: 'domcontentloaded',
      ...options,
    };
  }

  async extractFromCepea(url, selector) {
    let browser;
    let rawPayload = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });

      const page = await browser.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
      );
      await page.setExtraHTTPHeaders({
        'accept-language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      });

      const response = await page.goto(url, {
        waitUntil: this.options.waitUntil,
        timeout: this.options.timeoutMs,
      });

      rawPayload = await page.content();

      if (!response || response.status() >= 400) {
        const status = response ? response.status() : 'NO_RESPONSE';
        const error = new Error(`Falha ao acessar indicador CEPEA. HTTP status: ${status}`);
        error.raw_payload_debug = rawPayload;
        throw error;
      }

      await page.waitForSelector(selector, { timeout: 10000 });
      const indicatorData = await page.$eval(selector, (el) => {
        const text = (el.textContent || '').trim();
        return {
          text,
          html: el.outerHTML,
        };
      });

      return {
        success: true,
        url,
        valor_bruto: indicatorData.text,
        raw_payload_debug: rawPayload,
        evidencia_html: indicatorData.html,
        coletado_em: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        url,
        error: error.message,
        raw_payload_debug: error.raw_payload_debug || rawPayload,
        coletado_em: new Date().toISOString(),
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

module.exports = IndicatorStrategy;

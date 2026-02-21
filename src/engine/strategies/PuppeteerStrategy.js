// strategies/PuppeteerStrategy.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

class PuppeteerStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    let browser = null;
    
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--window-size=1920,1080'
        ],
        ignoreHTTPSErrors: true
      });

      const page = await browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      await page.goto(this.source.url_teste, {
        waitUntil: 'networkidle2',
        timeout: this.source.timeout || 30000
      });

      // Scroll automático se necessário
      if (this.source.paginacao?.tipo === 'scroll') {
        await page.evaluate(async () => {
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 100;
            const timer = setInterval(() => {
              window.scrollBy(0, distance);
              totalHeight += distance;
              if (totalHeight >= document.body.scrollHeight) {
                clearInterval(timer);
                resolve(true);
              }
            }, 200);
          });
        });
      }

      const content = await page.content();
      return content;

    } catch (error) {
      throw new Error(`PuppeteerStrategy: ${error.message}`);
    } finally {
      if (browser) await browser.close();
    }
  }
}

module.exports = PuppeteerStrategy;
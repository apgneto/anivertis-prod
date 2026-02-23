// market-bi/IndicatorStrategy.js
// Usa puppeteer-real-browser (já instalado no projeto) em vez de puppeteer-extra.
// Isso contorna o Cloudflare Turnstile do CEPEA sem precisar de proxy ou plugins externos.

const { connect } = require('puppeteer-real-browser');

class IndicatorStrategy {
  constructor(options = {}) {
    this.options = {
      timeoutMs: 60000,
      ...options
    };
  }

  async extractPrice(url, config) {

    // Modo manual: retorna valor fixo sem acessar a web (útil para testes)
    if (config.extraction_mode === 'api_manual') {
      return {
        success: true,
        valor_bruto: config.valor_manual,
        raw_payload_debug: null,
        coletado_em: new Date().toISOString()
      };
    }

    let browser;

    try {
      // puppeteer-real-browser usa o Chrome instalado na máquina,
      // eliminando os sinais de automação que o Turnstile detecta.
      const { browser: b, page } = await connect({
        headless: false,   // false é obrigatório para bypass do Turnstile
        turnstile: true,   // tenta resolver o challenge automaticamente
        args: ['--window-size=1920,1080']
      });
      browser = b;

      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: this.options.timeoutMs
      });

      // Aguarda bypass do Cloudflare (até 25s)
      for (let i = 0; i < 5; i++) {
        const title = await page.title();
        if (!title.toLowerCase().includes('just a moment')) break;
        await new Promise(r => setTimeout(r, 5000));
      }

      // Simulação humana leve para não acionar heurísticas de comportamento
      await page.mouse.move(300, 300);
      await new Promise(r => setTimeout(r, 1200));
      await page.mouse.move(600, 400);
      await new Promise(r => setTimeout(r, 1000));
      await page.mouse.wheel({ deltaY: 300 });
      await new Promise(r => setTimeout(r, 2000));

      // Aguarda tabela carregar
      await page.waitForSelector('table', { timeout: 30000 });

      // Captura HTML para auditoria (raw_payload_debug)
      const rawHtml = await page.content();

      let priceText = null;

      // ── Modo: seletor CSS direto (ex: CEPEA single cell) ────────────────
      if (config.extraction_mode === 'single') {
        priceText = await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (!el) return null;
          return (el.getAttribute('value') || el.innerText || el.textContent || '').trim();
        }, config.selector);
      }

      // ── Modo: busca por texto em tabela ──────────────────────────────────
      if (config.extraction_mode === 'table_filter') {
        priceText = await page.evaluate(
          ({ tableMatchText, rowMatchText, columnIndex }) => {
            const tables = Array.from(document.querySelectorAll('table'));
            const targetTable = tables.find(t =>
              t.innerText.includes(tableMatchText)
            );
            if (!targetTable) return null;

            const rows = Array.from(targetTable.querySelectorAll('tr'));
            const targetRow = rows.find(r =>
              r.innerText.includes(rowMatchText)
            );
            if (!targetRow) return null;

            const cell = targetRow.querySelector(`td:nth-child(${columnIndex})`);
            return cell ? cell.innerText.trim() : null;
          },
          config
        );
      }

      if (!priceText) {
        throw new Error(`Valor não encontrado para ${config.ativo_id} — verifique o selector/tableMatchText/rowMatchText`);
      }

      return {
        success: true,
        valor_bruto: priceText,
        raw_payload_debug: rawHtml.substring(0, 5000), // primeiros 5KB para auditoria
        coletado_em: new Date().toISOString()
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        raw_payload_debug: null
      };
    } finally {
      if (browser) {
        try { await browser.close(); } catch (_) {}
      }
    }
  }
}

module.exports = IndicatorStrategy;

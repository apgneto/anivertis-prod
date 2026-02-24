const { connect } = require('puppeteer-real-browser');

async function getIMEAMilhoMT() {
  const url = 'https://www.imea.com.br/imea-site/indicador-milho';

  const { browser, page } = await connect({
    headless: false,
    turnstile: true
  });

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Aguarda carregamento JS dinâmico
    await new Promise(r => setTimeout(r, 7000));

    const value = await page.evaluate(() => {
      const panels = Array.from(document.querySelectorAll('.panel'));

      for (const panel of panels) {
        const title = panel.querySelector('h4');
        if (!title) continue;

        // Procurar painel de Preço Comercialização Mensal
        if (title.innerText.includes('PREÇO COMER')) {
          const rows = panel.querySelectorAll('tbody tr');

          for (const row of rows) {
            const firstCell = row.querySelector('td small');

            if (firstCell && firstCell.innerText.includes('Mato Grosso')) {
              const valueCell = row.querySelectorAll('td')[1];
              if (!valueCell) continue;

              const raw = valueCell.innerText.trim();
              if (raw && raw !== '-') {
                return raw;
              }
            }
          }
        }
      }

      return null;
    });

    if (!value) {
      console.log('IMEA retornou valor vazio ou indisponível.');
      return null;
    }

    console.log('VALOR BRUTO CAPTURADO:', value);

    const cleaned = value
      .replace('R$', '')
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.');

    const numeric = parseFloat(cleaned);

    return isNaN(numeric) ? null : numeric;

  } catch (err) {
    console.error('Erro IMEA:', err.message);
    return null;
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

module.exports = { getIMEAMilhoMT };
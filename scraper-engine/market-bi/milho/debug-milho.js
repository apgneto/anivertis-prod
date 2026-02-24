const { connect } = require('puppeteer-real-browser');

(async () => {
  const { browser, page } = await connect({
    headless: false,
    turnstile: true
  });

  await page.goto('https://www.cepea.esalq.usp.br/br/indicador/milho.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Aguarda Cloudflare sair do "Um momento..."
  for (let i = 0; i < 6; i++) {
    const title = await page.title();
    console.log(`[${i}] TITLE:`, title);

    if (
      !title.toLowerCase().includes('momento') &&
      !title.toLowerCase().includes('just')
    ) {
      break;
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  const finalTitle = await page.title();
  console.log('\nFINAL TITLE:', finalTitle);

  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => ({
      id: t.id,
      className: t.className,
      rows: t.rows.length
    }));
  });

  console.log('\nTABLES:', tables);

  const html = await page.content();
  console.log('\nFIRST 800 CHARS:\n', html.substring(0, 800));

  await browser.close();
})();
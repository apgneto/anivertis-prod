// debug-cepea.js
const { connect } = require('puppeteer-real-browser');

(async () => {
  const { browser, page } = await connect({ headless: false, turnstile: true });
  
  await page.goto('https://www.cepea.esalq.usp.br/br/indicador/oleo-de-soja.aspx', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Aguarda Cloudflare
  for (let i = 0; i < 6; i++) {
    const title = await page.title();
    console.log(`[${i}] Title: ${title}`);
    if (!title.toLowerCase().includes('just a moment') && 
        !title.toLowerCase().includes('moment') &&
        !title.toLowerCase().includes('checking')) break;
    await new Promise(r => setTimeout(r, 5000));
  }

  // Captura o HTML seja qual for o estado
  const html = await page.content();
  const title = await page.title();
  
  console.log('\n=== TÍTULO DA PÁGINA ===');
  console.log(title);
  console.log('\n=== PRIMEIROS 1000 CHARS DO HTML ===');
  console.log(html.substring(0, 1000));
  
  // Tenta encontrar tabelas
  const tables = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('table')).map(t => ({
      id: t.id,
      className: t.className,
      rows: t.rows.length,
      firstCellText: t.rows[0]?.cells[0]?.innerText?.substring(0, 50) || ''
    }));
  });
  
  console.log('\n=== TABELAS ENCONTRADAS ===');
  console.log(JSON.stringify(tables, null, 2));

// Adicione antes do browser.close():
const cellContent = await page.evaluate(() => {
  const table = document.querySelector('#imagenet-indicador1');
  if (!table) return 'tabela não encontrada';
  
  const rows = Array.from(table.querySelectorAll('tr'));
  return rows.slice(0, 5).map((row, i) => {
    const cells = Array.from(row.querySelectorAll('td, th'));
    return `Row ${i}: ` + cells.map((c, j) => `[${j}]="${c.innerText.trim().substring(0, 30)}"`).join(' | ');
  });
});

console.log('\n=== CONTEÚDO DAS CÉLULAS ===');
cellContent.forEach(r => console.log(r));

  await browser.close();
})().catch(console.error);
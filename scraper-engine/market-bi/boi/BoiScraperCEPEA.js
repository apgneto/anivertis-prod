const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const { connect } = require('puppeteer-real-browser');
const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const ATIVO = {
  ativo_id: 'BOI_GORDO_CEPEA_SP',
  unidade_origem: 'BRL/arroba',
  unidade_destino: 'BRL/arroba',
  fonte: 'CEPEA',
  tier: 1,
};
function gerarHash(ativo_id, valor_bruto, data_referencia) {
  return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}
function salvarPreco(dataReferencia, valorBruto, valorNormalizado, rawPayload) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);
    const hash = gerarHash(ATIVO.ativo_id, valorBruto.toString(), dataReferencia);
    db.run(
      `INSERT OR IGNORE INTO market_bi_precos (
        ativo_id, valor_bruto, valor_normalizado,
        unidade_origem, unidade_destino, fonte, tier,
        integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [ATIVO.ativo_id, valorBruto.toString(), valorNormalizado, ATIVO.unidade_origem, ATIVO.unidade_destino, ATIVO.fonte, ATIVO.tier, hash, dataReferencia, rawPayload || null],
      function onRun(err) {
        db.close();
        if (err) reject(err);
        else resolve(this.changes || 0);
      }
    );
  });
}
function parseNumeroBr(valor) {
  const match = String(valor || '').replace(/\./g, '').replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}
async function scrapeBoiCepea() {
  let browser;
  try {
    const session = await connect({ headless: false, turnstile: true });
    browser = session.browser;
    const page = session.page;
    await page.goto('https://www.cepea.esalq.usp.br/br/indicador/boi-gordo.aspx', { waitUntil: 'domcontentloaded', timeout: 90000 });
    for (let i = 0; i < 6; i += 1) {
      const title = await page.title();
      const cloudflare = /just a moment|attention required|cloudflare/i.test(title);
      if (!cloudflare) break;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    const seletor = '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)';
    await page.waitForSelector(seletor, { timeout: 60000 });
    const valorBruto = await page.$eval(seletor, (el) => (el.textContent || '').trim());
    const valorNormalizado = parseNumeroBr(valorBruto);
    const dataReferencia = new Date().toISOString().slice(0, 10);
    const rawPayload = await page.content();
    if (valorNormalizado === null) throw new Error(`Valor inválido para BOI_GORDO_CEPEA_SP: ${valorBruto}`);
    const novos = await salvarPreco(dataReferencia, valorBruto, valorNormalizado, rawPayload);
    await browser.close();
    return { success: true, ativo_id: ATIVO.ativo_id, novosRegistros: novos };
  } catch (error) {
    if (browser) await browser.close();
    return { success: false, ativo_id: ATIVO.ativo_id, error: error.message };
  }
}
if (require.main === module) scrapeBoiCepea().then((res) => console.log(res));
module.exports = { scrapeBoiCepea };

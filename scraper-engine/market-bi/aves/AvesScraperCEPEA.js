const { connect } = require('puppeteer-real-browser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');

/* ===============================
   Config do ativo
================================= */
const ATIVO = {
  ativo_id: 'FRANGO_CEPEA_CONGELADO_SP',
  unidade_origem: 'BRL/kg',
  unidade_destino: 'BRL/kg',
  fonte: 'CEPEA'
};

/* ===============================
   Gerar hash integridade
================================= */
function gerarHash(payload) {
  return crypto
    .createHash('sha256')
    .update(payload)
    .digest('hex');
}

/* ===============================
   Salvar no banco (padrão completo)
================================= */
function salvarPreco(valorBruto, valorNormalizado) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath);

    const payload = JSON.stringify({
      ativo_id: ATIVO.ativo_id,
      valor_bruto: valorBruto,
      valor_normalizado: valorNormalizado,
      data: new Date().toISOString().split('T')[0]
    });

    const hash = gerarHash(payload);

    db.run(
      `
      INSERT INTO market_bi_precos
      (
        ativo_id,
        valor_bruto,
        valor_normalizado,
        unidade_origem,
        unidade_destino,
        fonte,
        integridade_hash_sha256,
        data_referencia,
        criado_em
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, date('now'), datetime('now'))
      `,
      [
        ATIVO.ativo_id,
        valorBruto,
        valorNormalizado,
        ATIVO.unidade_origem,
        ATIVO.unidade_destino,
        ATIVO.fonte,
        hash
      ],
      function (err) {
        db.close();
        if (err) return reject(err);
        resolve(true);
      }
    );
  });
}

/* ===============================
   Scraper CEPEA Frango
================================= */
async function getFrangoCEPEA() {
  const url = 'https://www.cepea.esalq.usp.br/br/indicador/frango.aspx';

  const { browser, page } = await connect({
    headless: false,
    turnstile: true
  });

  try {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Aguarda Cloudflare
    for (let i = 0; i < 6; i++) {
      const title = await page.title();

      if (
        !title.toLowerCase().includes('momento') &&
        !title.toLowerCase().includes('just')
      ) {
        break;
      }

      await new Promise(r => setTimeout(r, 5000));
    }

    const valorBruto = await page.evaluate(() => {
      const cell = document.querySelector(
        '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)'
      );
      return cell ? cell.innerText.trim() : null;
    });

    if (!valorBruto) {
      console.log('Valor não encontrado no CEPEA.');
      return null;
    }

    console.log('Valor bruto capturado:', valorBruto);

    const valorLimpo = valorBruto
      .replace('R$', '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim();

    const valorNumerico = parseFloat(valorLimpo);

    if (isNaN(valorNumerico)) {
      console.log('Valor inválido após limpeza.');
      return null;
    }

    await salvarPreco(valorBruto, valorNumerico);

    console.log('FRANGO_CEPEA_CONGELADO_SP salvo:', valorNumerico);

    return valorNumerico;

  } catch (err) {
    console.error('Erro CEPEA Frango:', err.message);
    return null;
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

getFrangoCEPEA();
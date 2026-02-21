// teste-seletores.js
// Coloque este arquivo em: C:\Users\apgne\anivertis-prod\scraper-engine\
// Execute com: node teste-seletores.js

const axios = require('axios');
const cheerio = require('cheerio');

const SITES_PARA_TESTAR = [
  'https://www.moneytimes.com.br/ultimas-noticias/',
  'https://portaldbo.com.br/conteudo/mercado-do-boi/',
  'https://www.bloomberglinea.com.br/agro/',
  'https://www.agrolink.com.br/noticias/',
  'https://www.canalrural.com.br/pecuaria/',
];

const SELETORES = [
  'article a[href]',
  'h2 a[href]',
  'h3 a[href]',
  '.noticia a[href]',
  '.news-item a[href]',
  '.horizontal a[href]',
  '.com-hora a[href]',
  'ul.noticias li a[href]',
  '.thumb-caption a[href]',
  '.manchete a[href]',
  '.chamada a[href]',
  '.box-noticia a[href]',
  '[class*="story"] a[href]',
  '[class*="post"] a[href]',
  '[class*="card"] a[href]',
  '[class*="item"] a[href]',
  '[class*="title"] a[href]',
  '[class*="headline"] a[href]',
  '[class*="news"] a[href]',
  '[class*="entry"] a[href]',
  '[class*="article"] a[href]',
  'li a[href]',
];

const testSite = async (url) => {
  console.log('\n' + '='.repeat(60));
  console.log(`🌐 Testando: ${url}`);
  console.log('='.repeat(60));

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      }
    });

    const $ = cheerio.load(res.data);
    // Remove nav/footer antes de testar para não poluir com links de menu
    $('nav, footer, header').remove();

    let encontrou = false;
    SELETORES.forEach(sel => {
      const els = $(sel);
      if (els.length > 0) {
        // Filtra apenas links que parecem ser de matérias (com texto útil)
        const useful = els.filter((_, el) => $(el).text().trim().length > 15);
        if (useful.length === 0) return;

        encontrou = true;
        console.log(`\n✅ "${sel}" → ${useful.length} links com texto útil`);
        useful.slice(0, 3).each((_, el) => {
          const href = $(el).attr('href') || '';
          const text = $(el).text().trim().substring(0, 70);
          console.log(`   href: ${href.substring(0, 70)}`);
          console.log(`   text: ${text}`);
        });
      }
    });

    if (!encontrou) {
      console.log('\n❌ Nenhum seletor funcionou!');
      console.log('💡 Classes presentes no HTML (primeiras 20):');
      const classes = new Set();
      $('[class]').each((_, el) => {
        const cls = $(el).attr('class');
        if (cls) cls.split(' ').forEach(c => { if (c.trim()) classes.add(c.trim()); });
      });
      [...classes].slice(0, 30).forEach(c => console.log(`   .${c}`));
    }

  } catch (err) {
    console.log(`❌ ERRO: ${err.message}`);
    if (err.response) console.log(`   Status HTTP: ${err.response.status}`);
  }
};

const main = async () => {
  console.log('🔍 DIAGNÓSTICO DE SELETORES - ANIVERTIS\n');
  for (const url of SITES_PARA_TESTAR) {
    await testSite(url);
    await new Promise(r => setTimeout(r, 1000)); // pausa entre sites
  }
  console.log('\n\n✅ Diagnóstico concluído!');
};

main().catch(console.error);

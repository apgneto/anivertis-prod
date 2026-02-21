/**
 * content-extractor.js
 * =====================================================================
 * Módulo dedicado para extração de texto limpo de matérias jornalísticas.
 * Estratégia em camadas (waterfall):
 *   1. Mozilla Readability  →  Melhor resultado, robusto para qualquer site
 *   2. Cheerio Cirúrgico    →  Fallback se Readability falhar
 *   3. Texto Bruto Limpo    →  Último recurso, melhor que lixo
 * =====================================================================
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { Readability } = require('@mozilla/readability');
const { JSDOM } = require('jsdom');

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES DE CONFIGURAÇÃO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Elementos que SEMPRE devem ser removidos antes de qualquer extração de texto.
 * São fontes garantidas de lixo: scripts, estilos, navegação, anúncios, etc.
 */
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'object', 'embed',
  'nav', 'header', 'footer', 'aside', 'form',
  '[class*="menu"]', '[class*="navigation"]', '[class*="sidebar"]',
  '[class*="banner"]', '[class*="ad"]', '[class*="advertisement"]',
  '[class*="popup"]', '[class*="modal"]', '[class*="cookie"]',
  '[class*="newsletter"]', '[class*="subscribe"]', '[class*="social"]',
  '[class*="share"]', '[class*="related"]', '[class*="recommend"]',
  '[class*="comment"]', '[id*="comment"]',
  '[class*="breadcrumb"]', '[class*="tag"]', '[class*="author-bio"]',
  'figure > figcaption', // remove legendas de imagem mas não o <article>
].join(', ');

/**
 * Seletores para encontrar o container principal do artigo.
 * Ordem de prioridade: do mais semântico ao mais genérico.
 */
const ARTICLE_CONTAINER_SELECTORS = [
  'article[class*="content"]',
  'article[class*="article"]',
  'article[class*="body"]',
  'article[class*="text"]',
  'article[class*="materia"]',
  'article',
  '[class*="article-body"]',
  '[class*="article-content"]',
  '[class*="article-text"]',
  '[class*="article__body"]',
  '[class*="article__content"]',
  '[class*="story-body"]',
  '[class*="story-content"]',
  '[class*="post-body"]',
  '[class*="post-content"]',
  '[class*="entry-content"]',  // WordPress padrão
  '[class*="materia-content"]',
  '[class*="noticia-conteudo"]',
  '[itemprop="articleBody"]',   // Schema.org markup
  '[data-testid*="article"]',
  'main',
];

const MIN_CONTENT_LENGTH = 150; // Mínimo de chars para considerar extração válida
const REQUEST_TIMEOUT_MS = 12000;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna um User-Agent aleatório para rotação básica.
 */
const getRandomUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

/**
 * Verifica se um texto parece ser código/lixo e não texto jornalístico.
 * Detecta: JavaScript, CSS inline, iframes, JSON, etc.
 */
const isGarbage = (text) => {
  if (!text || text.trim().length < MIN_CONTENT_LENGTH) return true;

  const garbagePatterns = [
    /var\s+\w+\s*=/,           // var declarações JS
    /function\s*\(/,            // funções JS
    /\(function\s*\(/,          // IIFEs
    /window\[|document\./,      // DOM manipulation
    /\.push\(|\.apply\(/,       // métodos JS comuns
    /<iframe\s/i,               // iframe literal no texto
    /src\s*=\s*["']\/\//,       // src de recurso externo
    /\{["']@context["']/,       // JSON-LD
    /@media\s+\(/,              // CSS media queries
    /GoogleTag|gtag\(|_gaq\./,  // Google Analytics/Tag
    /^[\s\S]{0,50}\{[\s\S]*\}[\s\S]{0,50}$/, // Texto é basicamente um JSON
  ];

  return garbagePatterns.some(pattern => pattern.test(text));
};

/**
 * Limpa e normaliza o texto extraído.
 * Remove espaços excessivos, caracteres de controle, etc.
 */
const sanitizeText = (rawText) => {
  if (!rawText) return '';

  return rawText
    .replace(/\r\n/g, '\n')         // normaliza quebras de linha
    .replace(/\t/g, ' ')             // tabs → espaço
    .replace(/\u00A0/g, ' ')         // non-breaking space → espaço
    .replace(/\u200B/g, '')          // zero-width space → remove
    .replace(/ {2,}/g, ' ')          // múltiplos espaços → um
    .replace(/\n{3,}/g, '\n\n')      // mais de 2 quebras → 2
    .trim();
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATÉGIA 1: MOZILLA READABILITY (principal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Usa o algoritmo do Firefox Reader Mode para extrair o artigo.
 * É o método mais robusto e site-agnóstico disponível.
 * 
 * @param {string} html - HTML bruto da página
 * @param {string} url - URL da página (necessário para o Readability resolver URLs relativas)
 * @returns {string|null} Texto limpo ou null se falhar
 */
const extractWithReadability = (html, url) => {
  try {
    // JSDOM cria um documento DOM real em Node.js, que é o que Readability precisa
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document, {
      // Configurações para maximizar a extração de conteúdo
      charThreshold: MIN_CONTENT_LENGTH,
      keepClasses: false, // remove classes CSS do output
    });

    const article = reader.parse();

    if (!article || !article.textContent) return null;

    const text = sanitizeText(article.textContent);

    if (isGarbage(text)) return null;

    console.log(`    [Readability] ✅ Extraídos ${text.length} chars`);
    return text;

  } catch (error) {
    console.warn(`    [Readability] ⚠️ Falhou: ${error.message}`);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATÉGIA 2: CHEERIO CIRÚRGICO (fallback)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extração manual com Cheerio com remoção agressiva de ruído.
 * Tenta cada seletor de container do mais específico ao mais genérico.
 * 
 * IMPORTANTE: A remoção de ruído ($noiseSelectors.remove()) DEVE acontecer
 * ANTES de qualquer seleção de texto. Essa é a regra de ouro.
 * 
 * @param {string} html - HTML bruto da página
 * @returns {string|null} Texto limpo ou null se falhar
 */
const extractWithCheerio = (html) => {
  try {
    const $ = cheerio.load(html);

    // ── PASSO 1: AMPUTAÇÃO DE RUÍDO ──────────────────────────────────────────
    // Remove TODOS os elementos de ruído ANTES de qualquer extração.
    // Essa é a etapa mais crítica e que estava faltando na sua implementação.
    $(NOISE_SELECTORS).remove();

    // ── PASSO 2: BUSCA DO CONTAINER DO ARTIGO ────────────────────────────────
    let articleContainer = null;

    for (const selector of ARTICLE_CONTAINER_SELECTORS) {
      const el = $(selector).first();
      if (el.length > 0) {
        const text = el.text().trim();
        if (text.length >= MIN_CONTENT_LENGTH) {
          articleContainer = el;
          console.log(`    [Cheerio] ✅ Container encontrado: "${selector}"`);
          break;
        }
      }
    }

    if (!articleContainer) {
      console.warn('    [Cheerio] ⚠️ Nenhum container de artigo encontrado.');
      return null;
    }

    // ── PASSO 3: EXTRAÇÃO DE PARÁGRAFOS ──────────────────────────────────────
    // Coleta parágrafos com texto útil (mínimo 30 chars para filtrar labels)
    const paragraphs = [];
    articleContainer.find('p, h2, h3, h4, blockquote').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length >= 30) {
        paragraphs.push(text);
      }
    });

    if (paragraphs.length === 0) {
      // Último recurso dentro do container: pega o texto bruto do container
      const rawText = articleContainer.text();
      const cleaned = sanitizeText(rawText);
      return cleaned.length >= MIN_CONTENT_LENGTH ? cleaned : null;
    }

    const result = sanitizeText(paragraphs.join('\n\n'));
    console.log(`    [Cheerio] ✅ Extraídos ${result.length} chars de ${paragraphs.length} parágrafos`);
    return result;

  } catch (error) {
    console.warn(`    [Cheerio] ⚠️ Falhou: ${error.message}`);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// ESTRATÉGIA 3: TEXTO BRUTO SANITIZADO (último recurso)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Remove todas as tags HTML e retorna texto puro.
 * Última linha de defesa - melhor que salvar lixo no banco.
 * 
 * @param {string} html - HTML bruto da página
 * @returns {string|null} Texto ou null
 */
const extractRawText = (html) => {
  try {
    const $ = cheerio.load(html);

    // Remove ruído primeiro, mesmo na extração bruta
    $(NOISE_SELECTORS).remove();
    $('head').remove();

    const text = sanitizeText($('body').text());

    if (text.length < MIN_CONTENT_LENGTH || isGarbage(text)) return null;

    // Trunca para não salvar absurdos no banco
    const truncated = text.substring(0, 5000);
    console.warn(`    [RawText] ⚠️ Usando extração bruta. ${truncated.length} chars.`);
    return truncated;

  } catch (error) {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO PRINCIPAL: fetchArticleContent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Função pública do módulo. Busca e extrai o conteúdo limpo de uma matéria.
 * Implementa o waterfall de estratégias automaticamente.
 * 
 * @param {string} url - URL da matéria a ser extraída
 * @param {object} [options] - Opções opcionais
 * @param {string} [options.existingHtml] - Se você já tem o HTML (ex: do Puppeteer), passe aqui
 * @returns {Promise<{content: string, method: string}>}
 */
const fetchArticleContent = async (url, options = {}) => {
  console.log(`  📰 Extraindo conteúdo: ${url}`);

  let html = options.existingHtml || null;

  // ── BUSCA O HTML SE NÃO FOI FORNECIDO ─────────────────────────────────────
  if (!html) {
    try {
      const response = await axios.get(url, {
        timeout: REQUEST_TIMEOUT_MS,
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Referer': 'https://www.google.com/',
        },
        // Segurança: não seguir mais de 3 redirects
        maxRedirects: 3,
      });
      html = response.data;
    } catch (fetchError) {
      console.error(`  ❌ Falha no fetch de ${url}: ${fetchError.message}`);
      return {
        content: null,
        method: 'fetch_failed',
        error: fetchError.message
      };
    }
  }

  if (!html || typeof html !== 'string' || html.length < 100) {
    return { content: null, method: 'empty_html' };
  }

  // ── WATERFALL DE ESTRATÉGIAS ───────────────────────────────────────────────

  // Tentativa 1: Readability (mais preciso)
  const readabilityResult = extractWithReadability(html, url);
  if (readabilityResult) {
    return { content: readabilityResult, method: 'readability' };
  }

  // Tentativa 2: Cheerio Cirúrgico (fallback específico)
  const cheerioResult = extractWithCheerio(html);
  if (cheerioResult) {
    return { content: cheerioResult, method: 'cheerio' };
  }

  // Tentativa 3: Texto bruto sanitizado (último recurso)
  const rawResult = extractRawText(html);
  if (rawResult) {
    return { content: rawResult, method: 'raw_text' };
  }

  // Falha total - retorna null, o SourceRunner decide o que fazer
  console.error(`  ❌ Todas as estratégias falharam para: ${url}`);
  return { content: null, method: 'all_failed' };
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  fetchArticleContent,
  // Exporta internals para testes unitários
  extractWithReadability,
  extractWithCheerio,
  isGarbage,
  sanitizeText,
};

// utils/contentCleaner.js
const cheerio = require('cheerio');

class ContentCleaner {
  static clean(input, type = 'auto') {
    if (!input) return '';
    
    // Se já é string limpa e curta, retorna direto (evita processamento desnecessário)
    if (typeof input === 'string' && input.length < 500 && !input.includes('<') && !input.includes('{')) {
      return input.trim();
    }
    
    let text = typeof input === 'string' ? input : JSON.stringify(input);
    text = this.preClean(text);
    
    if (type === 'auto') {
      type = this.detectType(text);
    }
    
    console.log(`📋 Tipo detectado: ${type} (tamanho: ${text.length} caracteres)`);
    
    switch (type) {
      case 'xml': return this.cleanXML(text);
      case 'json': return this.cleanJSON(text);
      case 'html': return this.cleanHTML(text);
      default: return this.cleanText(text);
    }
  }

  static preClean(text) {
    return text
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\\//g, '/');
  }

  static detectType(text) {
    // XML detection
    if (text.trim().startsWith('<?xml') || 
        text.includes('<ArrayOfValor') || 
        text.includes('<soap:') ||
        (text.includes('<') && text.includes('</') && !text.includes('<html'))) {
      return 'xml';
    }
    
    // HTML detection
    if (text.includes('<html') || 
        text.includes('<body') || 
        text.includes('<div') || 
        text.includes('<article') ||
        text.includes('<p>')) {
      return 'html';
    }
    
    // JSON detection
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        JSON.parse(text);
        return 'json';
      } catch (e) {
        // Não é JSON válido
      }
    }
    
    // Se tem muitas tags, é HTML mesmo sem a tag html
    const tagCount = (text.match(/<[^>]+>/g) || []).length;
    if (tagCount > 5) {
      return 'html';
    }
    
    return 'text';
  }

  static cleanHTML(html) {
    try {
      const $ = cheerio.load(html, { 
        decodeEntities: true,
        xmlMode: false
      });
      
      // Remove tudo que não é conteúdo
      const removeTags = [
        'script', 'style', 'noscript', 'iframe', 'svg', 
        'meta', 'link', 'nav', 'header', 'footer', 
        'aside', 'form', 'button', 'input', 'select',
        'option', 'label', 'canvas', 'embed', 'object'
      ];
      
      removeTags.forEach(tag => $(tag).remove());
      
      // Tenta encontrar o conteúdo principal
      let text = '';
      
      // Lista de seletores para conteúdo principal
      const contentSelectors = [
        // Artigos e posts
        'article', 'main', '.post', '.post-content', '.entry-content',
        '.article-content', '[itemprop="articleBody"]', '.story-body',
        '.news-body', '.news-content', '.noticia-conteudo',
        // Classes comuns em sites brasileiros
        '.texto', '.conteudo', '.corpo', '.materia-conteudo',
        // IDs comuns
        '#content', '#main-content', '#conteudo', '#noticia',
        // Fallback
        'body'
      ];
      
      for (const selector of contentSelectors) {
        const el = $(selector);
        if (el.length > 0) {
          const elText = el.text().trim();
          if (elText.length > text.length) {
            text = elText;
          }
        }
      }
      
      // Se não achou nada, pega todos os parágrafos
      if (!text || text.length < 100) {
        const paragraphs = [];
        $('p').each((_, el) => {
          const pText = $(el).text().trim();
          if (pText.length > 20) {
            paragraphs.push(pText);
          }
        });
        
        if (paragraphs.length > 0) {
          text = paragraphs.join('\n\n');
        } else {
          // Último recurso: todo o texto
          text = $('body').text() || $.text();
        }
      }
      
      return this.finalClean(text);
      
    } catch (e) {
      console.error('Erro no cleanHTML:', e.message);
      return this.cleanText(html);
    }
  }

  static cleanXML(xml) {
    try {
      // Remove declaração XML e namespaces
      let clean = xml
        .replace(/<\?xml[^>]*\?>/g, '')
        .replace(/<[!?][^>]*>/g, '')
        .replace(/xmlns[^=]*="[^"]*"/g, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Se for muito curto, procura valores numéricos
      if (clean.length < 50) {
        const priceMatch = clean.match(/\d+[.,]\d{2}/);
        if (priceMatch) {
          return `R$ ${priceMatch[0].replace('.', ',')}`;
        }
      }
      
      return clean.substring(0, 300);
    } catch (e) {
      return this.cleanText(xml);
    }
  }

  static cleanJSON(json) {
    try {
      const data = JSON.parse(json);
      
      // Função para extrair texto de forma inteligente
      const extractText = (obj, depth = 0) => {
        if (!obj || depth > 3) return '';
        
        // Tipos primitivos
        if (typeof obj === 'string') return obj;
        if (typeof obj === 'number') return obj.toString();
        if (typeof obj === 'boolean') return '';
        
        // Arrays
        if (Array.isArray(obj)) {
          return obj
            .map(item => extractText(item, depth + 1))
            .filter(t => t && t.length > 10)
            .join('\n\n');
        }
        
        // Objetos
        if (typeof obj === 'object') {
          // Prioriza campos de texto
          const textFields = [
            'conteudo', 'content', 'texto', 'text',
            'descricao', 'description', 'resumo', 'summary',
            'titulo', 'title', 'headline', 'nome', 'name'
          ];
          
          for (const field of textFields) {
            if (obj[field] && typeof obj[field] === 'string') {
              const val = obj[field].trim();
              if (val.length > 20) return val;
            }
          }
          
          // Se tem data, procura notícias lá dentro
          if (obj.data && Array.isArray(obj.data)) {
            return extractText(obj.data, depth + 1);
          }
          
          // Se tem items/noticias array
          if (obj.items && Array.isArray(obj.items)) {
            return extractText(obj.items, depth + 1);
          }
          
          if (obj.noticias && Array.isArray(obj.noticias)) {
            return extractText(obj.noticias, depth + 1);
          }
          
          // Último recurso: pega todos os valores
          const values = Object.values(obj)
            .map(val => extractText(val, depth + 1))
            .filter(t => t && t.length > 10);
          
          if (values.length > 0) {
            return values.join('\n\n');
          }
        }
        
        return '';
      };
      
      const extracted = extractText(data);
      return extracted || 'Dados recebidos da fonte';
      
    } catch (e) {
      return this.cleanText(json);
    }
  }

  static finalClean(text) {
    if (!text) return '';
    
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&[a-z]+;/g, ' ')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  static cleanText(text) {
    return this.finalClean(text);
  }
}

module.exports = ContentCleaner;
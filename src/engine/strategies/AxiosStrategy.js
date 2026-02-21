// strategies/AxiosStrategy.js
const axios = require('axios');
const cheerio = require('cheerio');

class AxiosStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    try {
      const response = await axios.get(this.source.url_teste, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
        },
        timeout: this.source.timeout || 15000,
        httpsAgent: this.source.ignorar_ssl 
          ? new (require('https')).Agent({ rejectUnauthorized: false }) 
          : undefined
      });

      // API - retorna JSON direto
      if (this.source.tipo === "API") {
        return response.data;
      }

      // HTML - usa cheerio para parsear
      const $ = cheerio.load(response.data);
      
      return {
        title: $("title").text(),
        body: $("body").text().slice(0, 500),
        html: response.data.slice(0, 1000)
      };

    } catch (error) {
      throw new Error(`AxiosStrategy: ${error.message}`);
    }
  }
}

module.exports = AxiosStrategy;

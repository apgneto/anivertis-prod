// strategies/PDFStrategy.js
const axios = require('axios');
const pdfParse = require('pdf-parse');

class PDFStrategy {
  constructor(source) {
    this.source = source;
  }

  async execute() {
    try {
      const response = await axios.get(this.source.url_teste, {
        responseType: 'arraybuffer',
        timeout: this.source.timeout || 30000
      });

      const data = await pdfParse(response.data);
      
      return {
        texto: data.text.slice(0, 2000),
        paginas: data.numpages,
        info: data.info
      };

    } catch (error) {
      throw new Error(`PDFStrategy: ${error.message}`);
    }
  }
}

module.exports = PDFStrategy;
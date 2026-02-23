// scraper-engine/market-bi/Normalizer.js

class Normalizer {
  constructor(db) {
    this.db = db;
  }

  parseNumeric(value) {
    if (typeof value === 'number') return value;

    if (!value) return null;

    // Remove espaços
    let cleaned = String(value).trim();

    // Detecta padrão brasileiro (1.234,56)
    const hasCommaDecimal = cleaned.includes(',') && cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.');

    if (hasCommaDecimal) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  async applyUnitConversion(params) {
    const {
      ativo_id,
      valor_bruto,
      unidade_origem,
      unidade_destino
    } = params;

    const valorNumerico = this.parseNumeric(valor_bruto);

    if (valorNumerico == null) {
      throw new Error(`Valor inválido para ${ativo_id}`);
    }

    // 🔥 BUSCA EXATA (ativo + origem + destino)
    const conv = await this.db.get(`
      SELECT fator_multiplicador
      FROM conversoes_unidade
      WHERE ativo_id = ?
      AND unidade_origem = ?
      AND unidade_destino = ?
      LIMIT 1
    `, [ativo_id, unidade_origem, unidade_destino]);

    if (!conv) {
      throw new Error(
        `Conversão não encontrada para ${ativo_id}: ${unidade_origem} -> ${unidade_destino}`
      );
    }

    const valorNormalizado = valorNumerico * conv.fator_multiplicador;

    return {
      ativo_id,
      valor_bruto: valorNumerico,
      valor_normalizado: valorNormalizado,
      unidade_origem,
      unidade_destino
    };
  }
}

module.exports = Normalizer;
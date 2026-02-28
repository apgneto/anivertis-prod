class Normalizer {
  constructor(db) {
    this.db = db;
  }

  static parseNumeric(valorBruto) {
    if (typeof valorBruto === 'number') return valorBruto;
    if (!valorBruto) return null;

    const normalized = String(valorBruto)
      .replace(/\s/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .match(/-?\d+(\.\d+)?/);

    return normalized ? Number(normalized[0]) : null;
  }

  async applyUnitConversion({ ativo_id, valor_bruto, unidade_origem, unidade_destino }) {
    const valorNumerico = Normalizer.parseNumeric(valor_bruto);
    if (valorNumerico === null) {
      throw new Error(`Não foi possível normalizar valor bruto: ${valor_bruto}`);
    }

    const conversao = await this.db.get(
      `SELECT fator_multiplicador, offset
       FROM conversoes_unidade
       WHERE ativo_id = ?
         AND unidade_origem = ?
         AND unidade_destino = ?
       ORDER BY id DESC
       LIMIT 1`,
      [ativo_id, unidade_origem, unidade_destino]
    );

    if (!conversao) {
      throw new Error(
        `Conversão de unidade não encontrada para ativo_id=${ativo_id}, ${unidade_origem} -> ${unidade_destino}`
      );
    }

    const fator = Number(conversao.fator_multiplicador);
    const offset = Number(conversao.offset || 0);
    const valor_normalizado = valorNumerico * fator + offset;

    return {
      ativo_id,
      valor_bruto,
      valor_numerico: valorNumerico,
      unidade_origem,
      unidade_destino,
      fator_multiplicador: fator,
      offset,
      valor_normalizado,
    };
  }
}

module.exports = Normalizer;

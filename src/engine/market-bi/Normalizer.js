class Normalizer {
  constructor() {
    // Agora as regras são injetadas, não hardcoded
  }

  normalize(value, rule) {
    if (!rule) {
      throw new Error('Regra de conversão não fornecida');
    }

    const { factor, offset } = rule;

    // Determinismo matemático: Valor * Fator + Offset
    // Sem eval, apenas aritmética pura
    return (value * factor) + offset;
  }
}

module.exports = Normalizer;

// src/services/sanitaryShieldService.ts
import { SanitaryEvent, SanitaryShieldScore, SanitaryRiskMatrix } from '../types/anivertis';

export class SanitaryShieldService {
  /**
   * Calcula Lead Time (dias entre detecção e resposta)
   */
  calcularLeadTime(dataDetecao: string, dataResposta: string): number {
    const det = new Date(dataDetecao);
    const resp = new Date(dataResposta);
    const diffMs = resp.getTime() - det.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Calcula IC90 (Intervalo de Confiança 90%) para probabilidade de contágio
   * Fórmula: p ± z * sqrt(p*(1-p)/n)
   * Para IC90: z = 1.645
   */
  calcularIC90(
    casosConfirmados: number,
    populacaoExposta: number,
    nivelConfianca: 0.90 = 0.90
  ): {
    probabilidade: number;
    ic_inf: number;
    ic_sup: number;
    amplitude: number;
  } {
    if (populacaoExposta <= 0) {
      throw new Error('População exposta deve ser maior que 0');
    }

    const p = casosConfirmados / populacaoExposta;
    const z = 1.645; // Z-score para IC 90%
    const se = Math.sqrt((p * (1 - p)) / populacaoExposta);
    
    const ic_inf = Math.max(0, p - z * se);
    const ic_sup = Math.min(1, p + z * se);
    const amplitude = ic_sup - ic_inf;

    return {
      probabilidade: p,
      ic_inf,
      ic_sup,
      amplitude
    };
  }

  /**
   * Calcula score de Lead Time (0-100)
   * Quanto menor o tempo, maior o score
   */
  calcularLeadTimeScore(leadTimeDias: number): number {
    // Curva de penalidade: 1 dia = 100, 7 dias = 70, 15 dias = 40, 30 dias = 20
    if (leadTimeDias <= 1) return 100;
    if (leadTimeDias <= 3) return 90;
    if (leadTimeDias <= 7) return 75;
    if (leadTimeDias <= 15) return 50;
    if (leadTimeDias <= 30) return 25;
    return 10; // > 30 dias
  }

  /**
   * Calcula score de compliance (0-100)
   * Baseado em medidas implementadas
   */
  calcularComplianceScore(medidas: string[]): number {
    const medidasRequeridas = [
      'quarentena', 'vacinação', 'monitoramento', 
      'rastreabilidade', 'descarte_seguro', 'desinfecao'
    ];
    
    const medidasImplementadas = medidas.filter(m => 
      medidasRequeridas.some(req => m.toLowerCase().includes(req))
    ).length;
    
    return Math.round((medidasImplementadas / medidasRequeridas.length) * 100);
  }

  /**
   * Calcula SanitaryShield Score completo
   */
  calcularSanitaryShieldScore(evento: SanitaryEvent): SanitaryShieldScore {
    const leadTime = this.calcularLeadTime(evento.data_deteccao, evento.data_resposta);
    const ic90 = this.calcularIC90(evento.animais_afetados, evento.animais_afetados + 1000); // +1000 = população total estimada
    const leadTimeScore = this.calcularLeadTimeScore(leadTime);
    const complianceScore = this.calcularComplianceScore(evento.medidas_controle);
    
    // Score total: média ponderada
    // Lead Time: 40%, IC90: 30%, Compliance: 30%
    const scoreTotal = (leadTimeScore * 0.4) + (ic90.probabilidade * 100 * 0.3) + (complianceScore * 0.3);
    
    // Nível de alerta baseado no score
    let nivelAlerta: 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO';
    if (scoreTotal >= 80) nivelAlerta = 'VERDE';
    else if (scoreTotal >= 60) nivelAlerta = 'AMARELO';
    else if (scoreTotal >= 40) nivelAlerta = 'LARANJA';
    else nivelAlerta = 'VERMELHO';

    return {
      evento_id: evento.id,
      lead_time_score: leadTimeScore,
      ic90_probability: ic90.probabilidade,
      ic90_confidence: ic90.amplitude <= 0.1 ? 0.9 : ic90.amplitude <= 0.2 ? 0.8 : 0.7, // IC estreito = alta confiança
      compliance_score: complianceScore,
      sanidade_score_total: Math.round(scoreTotal),
      nivel_alerta: nivelAlerta, // ✅ CORRIGIDO: nome correto da variável
      recomendacoes: this.gerarRecomendacoes(nivelAlerta, evento.evento),
      validade_score: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // Válido por 7 dias
    };
  }

  /**
   * Gera matriz de risco sanitário
   */
  gerarRiskMatrix(
    probabilidadeContagio: number,
    severidadeImpacto: number,
    tempoResposta: number
  ): SanitaryRiskMatrix {
    // Escala de risco: 0-0.2 = Muito Baixo, 0.2-0.4 = Baixo, etc.
    const nivelRisco = probabilidadeContagio * severidadeImpacto;
    
    let categoria: SanitaryRiskMatrix['risco_categoria'];
    if (nivelRisco < 0.2) categoria = 'MUITO_BAIXO';
    else if (nivelRisco < 0.4) categoria = 'BAIXO';
    else if (nivelRisco < 0.6) categoria = 'MODERADO';
    else if (nivelRisco < 0.8) categoria = 'ALTO';
    else categoria = 'MUITO_ALTO';

    const medidas: string[] = [];
    if (categoria === 'MUITO_ALTO' || categoria === 'ALTO') {
      medidas.push('Quarentena imediata', 'Rastreabilidade total', 'Monitoramento intensivo');
    } else if (categoria === 'MODERADO') {
      medidas.push('Monitoramento aumentado', 'Restrições parciais');
    } else {
      medidas.push('Monitoramento padrão', 'Vigilância ativa');
    }

    return {
      probabilidade_contagio: probabilidadeContagio,
      severidade_impacto: severidadeImpacto,
      tempo_resposta: tempoResposta,
      risco_categoria: categoria,
      medidas_recomendadas: medidas
    };
  }

  /**
   * Gera recomendações baseadas no nível de alerta
   */
  private gerarRecomendacoes(
    nivelAlerta: 'VERDE' | 'AMARELO' | 'LARANJA' | 'VERMELHO',
    tipoEvento: string
  ): string[] {
    const baseRecomendacoes: Record<string, string[]> = {
      PSA: [
        'Monitoramento de granjas circunvizinhas',
        'Testagem de suínos',
        'Restrição de movimentação',
        'Desinfecção de veículos'
      ],
      NEWCASTLE: [
        'Vacinação emergencial',
        'Isolamento de aviários',
        'Controle de vetores',
        'Descarte seguro de aves mortas'
      ],
      AFTOSA: [
        'Vacinação de emergência',
        'Quarentena total',
        'Rastreabilidade animal',
        'Desinfecção de propriedades'
      ],
      SALMONELLA: [
        'Controle de qualidade de rações',
        'Higienização de equipamentos',
        'Testagem de lotes',
        'Isolamento de animais infectados'
      ]
    };

    const recomendacoesBase = baseRecomendacoes[tipoEvento] || ['Monitoramento contínuo', 'Vigilância sanitária'];

    switch (nivelAlerta) {
      case 'VERMELHO':
        return [
          'AÇÃO IMEDIATA NECESSÁRIA',
          ...recomendacoesBase,
          'Notificação às autoridades competentes',
          'Suspensão de exportações'
        ];
      case 'LARANJA':
        return [
          'ALERTA MÁXIMO',
          ...recomendacoesBase,
          'Aumento de vigilância',
          'Preparação para contingência'
        ];
      case 'AMARELO':
        return [
          'ALERTA MODERADO',
          ...recomendacoesBase,
          'Monitoramento intensificado'
        ];
      default: // VERDE
        return [
          'SITUAÇÃO CONTROLADA',
          ...recomendacoesBase,
          'Manutenção de vigilância ativa'
        ];
    }
  }
}

export const sanitaryShieldService = new SanitaryShieldService();
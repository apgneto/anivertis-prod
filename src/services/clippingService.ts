// src/services/clippingService.ts - V57_ULTRA_GRANULAR
import { 
  ClippingItemBlindado, 
  TemaEstrategico, 
  ImpactoNivel,
  TEMAS_ESTRUTURAIS,
  FonteTier,
  NewsItem,
  NCM_MAPA_DETALHADO,
  NCMSegmento
} from '../types/anivertis';

// ============================================================================
// LAYER 0: CONFIGURAÇÃO DE FONTES (COLETA)
// ============================================================================

export const FONTES_TIERS: FonteTier[] = [
  // TIER 1: Fontes Primárias (Dados Oficiais)
  { nome: 'CEPEA/ESALQ', tipo: 'OFICIAL', prioridade: 10, exemplos: ['Preço da soja em USD/ton no porto', 'Série histórica farinha de penas'], ncm_codes: ['1201.90.00', '2301.10.10'], update_frequency: 'daily', reliability_score: 0.94, language: 'pt' },
  { nome: 'IBGE/SIDRA', tipo: 'OFICIAL', prioridade: 10, exemplos: ['PPM Rebanhos', 'LSPA Produção Agrícola'], ncm_codes: ['0201', '1201', '1005'], update_frequency: 'monthly', reliability_score: 0.95, language: 'pt' },
  { nome: 'MAPA', tipo: 'OFICIAL', prioridade: 10, exemplos: ['Surto de Newcastle confirmado', 'Suspensão de importações'], ncm_codes: ['0201', '0202', '2301'], update_frequency: 'as-needed', reliability_score: 0.96, language: 'pt' },
  { nome: 'USDA', tipo: 'OFICIAL', prioridade: 10, exemplos: ['WASDE Report', 'FAS GAIN Report'], ncm_codes: ['1201', '1005', '0201'], update_frequency: 'monthly', reliability_score: 0.93, language: 'en' },
  { nome: 'APHIS', tipo: 'OFICIAL', prioridade: 10, exemplos: ['FSIS Compliance', '312.19 Rendering Standards'], ncm_codes: ['2301', '1507'], update_frequency: 'quarterly', reliability_score: 0.91, language: 'en' },
  { nome: 'UE', tipo: 'OFICIAL', prioridade: 10, exemplos: ['Reg. (UE) 2017/892', 'EFSA Scientific Opinion'], ncm_codes: ['2309', '2301'], update_frequency: 'as-needed', reliability_score: 0.92, language: 'en' },
  { nome: 'BCB', tipo: 'OFICIAL', prioridade: 10, exemplos: ['SELIC', 'IPCA', 'PTAX'], ncm_codes: [], update_frequency: 'daily', reliability_score: 0.98, language: 'pt' },
  { nome: 'ANP', tipo: 'OFICIAL', prioridade: 10, exemplos: ['Produção Biodiesel', 'Vendas Biodiesel'], ncm_codes: ['3826', '1502'], update_frequency: 'monthly', reliability_score: 0.92, language: 'pt' },
  { nome: 'CONAB', tipo: 'OFICIAL', prioridade: 10, exemplos: ['Acompanhamento Safra', 'Estoque de grãos'], ncm_codes: ['1201', '1005', '0701'], update_frequency: 'weekly', reliability_score: 0.90, language: 'pt' },
  
  // TIER 2: Fontes Setoriais
  { nome: 'ABPA', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Relatório Mensal Jan/2023', 'Exportações de carne'], ncm_codes: ['0207', '0203'], update_frequency: 'monthly', reliability_score: 0.85, language: 'pt' },
  { nome: 'ABIEC', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Abate bovino trimestral', 'Exportações'], ncm_codes: ['0201', '0202'], update_frequency: 'monthly', reliability_score: 0.83, language: 'pt' },
  { nome: 'ABRA', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Relatório Anual Rendering', 'Capacidade instalada'], ncm_codes: ['2301', '1507'], update_frequency: 'yearly', reliability_score: 0.83, language: 'pt' },
  { nome: 'Sindirações', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Custo de Produção de Ração', 'Insumos'], ncm_codes: ['2309', '2304'], update_frequency: 'monthly', reliability_score: 0.82, language: 'pt' },
  { nome: 'Scot Consultoria', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Abate Bovino', 'Preços Carnes'], ncm_codes: ['0201', '0202'], update_frequency: 'weekly', reliability_score: 0.82, language: 'pt' },
  { nome: 'Fastmarkets Jacobsen', tipo: 'SETORIAL', prioridade: 7, exemplos: ['Fishmeal Prices', 'Animal Proteins'], ncm_codes: ['2301', '0304'], update_frequency: 'daily', reliability_score: 0.80, language: 'en' },
  
  // TIER 3: Fontes de Mídia
  { nome: 'Valor Econômico', tipo: 'MIDIA', prioridade: 3, exemplos: ['China suspende importações', 'Preços em alta'], ncm_codes: ['0201', '1201'], update_frequency: 'daily', reliability_score: 0.60, language: 'pt' },
  { nome: 'Reuters', tipo: 'MIDIA', prioridade: 3, exemplos: ['PSA se espalha na China', 'Mercado global'], ncm_codes: ['0203', '1201'], update_frequency: 'daily', reliability_score: 0.58, language: 'en' },
  { nome: 'Bloomberg', tipo: 'MIDIA', prioridade: 3, exemplos: ['Commodities em queda', 'Dólar sobe'], ncm_codes: ['1201', '1005'], update_frequency: 'daily', reliability_score: 0.55, language: 'en' },
  { nome: 'Notícias Agrícolas', tipo: 'MIDIA', prioridade: 3, exemplos: ['Preço da soja', 'Mercado de milho'], ncm_codes: ['1201', '1005'], update_frequency: 'daily', reliability_score: 0.60, language: 'pt' },
  { nome: 'Canal Rural', tipo: 'MIDIA', prioridade: 3, exemplos: ['Notícias Agro', 'Política Rural'], ncm_codes: ['1201', '0201'], update_frequency: 'daily', reliability_score: 0.55, language: 'pt' }
];

// ============================================================================
// DIMENSÃO TEMPORAL (CRÍTICA PARA OPERACIONALIDADE)
// ============================================================================

export type JanelaTemporal = 
  | 'T24'   // Últimas 24h (ALERTAS OPERACIONAIS)
  | 'T7D'   // Últimos 7 dias (TENDÊNCIAS CURTO PRAZO)
  | 'TM1'   // Mês corrente (ANÁLISE ESTRUTURAL)
  | 'TQ1'   // Trimestre (PADRÕES SAZONAIS)
  | 'TY1'   // Ano corrente (CONTEXTO ANUAL)
  | 'THS';  // Histórico (>1 ano)

export const JANELAS_TEMPORAIS = {
  T24: { codigo: 'T24', descricao: 'Últimas 24h', peso: 0.9, uso: 'ALERTAS_OPERACIONAIS', cor: 'bg-red-100 text-red-800' },
  T7D: { codigo: 'T7D', descricao: 'Últimos 7d', peso: 0.7, uso: 'TENDENCIAS_CP', cor: 'bg-amber-100 text-amber-800' },
  TM1: { codigo: 'TM1', descricao: 'Mês atual', peso: 0.5, uso: 'ANALISE_ESTRUTURAL', cor: 'bg-blue-100 text-blue-800' },
  TQ1: { codigo: 'TQ1', descricao: 'Trimestre', peso: 0.3, uso: 'PADROES_SAZONAIS', cor: 'bg-cyan-100 text-cyan-800' },
  TY1: { codigo: 'TY1', descricao: 'Ano atual', peso: 0.2, uso: 'CONTEXTO_ANUAL', cor: 'bg-indigo-100 text-indigo-800' },
  THS: { codigo: 'THS', descricao: 'Histórico', peso: 0.1, uso: 'BASE_COMPARATIVA', cor: 'bg-slate-100 text-slate-800' }
} as const;

export interface MetadataTemporal {
  janela: JanelaTemporal;
  peso_temporal: number;
  validade_estimada_horas: number;
  idade_horas: number;
  timestamp_classificacao: string;
}

// ============================================================================
// LAYER 1: CLASSIFICADOR ONTOLÓGICO COMPLETO (V57)
// ============================================================================

export class ClippingServiceV52 {
  // ------------------------------------------------------------------------
  // LAYER 1.1: CLASSIFICAÇÃO TEMPORAL
  // ------------------------------------------------------------------------
  calcularMetadataTemporal(timestamp: string | Date): MetadataTemporal {
    const agora = new Date();
    const dataItem = new Date(timestamp);
    const diffHoras = (agora.getTime() - dataItem.getTime()) / (1000 * 60 * 60);
    const diffDias = diffHoras / 24;

    let janela: JanelaTemporal;
    let peso_temporal: number;
    let validade_estimada_horas: number;

    if (diffHoras <= 24) {
      janela = 'T24';
      peso_temporal = 0.9;
      validade_estimada_horas = 48;
    } else if (diffDias <= 7) {
      janela = 'T7D';
      peso_temporal = 0.7;
      validade_estimada_horas = 168;
    } else if (diffDias <= 30) {
      janela = 'TM1';
      peso_temporal = 0.5;
      validade_estimada_horas = 720;
    } else if (diffDias <= 90) {
      janela = 'TQ1';
      peso_temporal = 0.3;
      validade_estimada_horas = 2160;
    } else if (diffDias <= 365) {
      janela = 'TY1';
      peso_temporal = 0.2;
      validade_estimada_horas = 8760;
    } else {
      janela = 'THS';
      peso_temporal = 0.1;
      validade_estimada_horas = 17520;
    }

    return {
      janela,
      peso_temporal,
      validade_estimada_horas,
      idade_horas: diffHoras,
      timestamp_classificacao: new Date().toISOString()
    };
  }

  // ------------------------------------------------------------------------
  // LAYER 1.2: CLASSIFICAÇÃO POR TIER (FONTE)
  // ------------------------------------------------------------------------
  classifyTier(news: NewsItem): { tier: 1 | 2 | 3; fonteTier: FonteTier | null } {
    const fonteLower = news.fonte.toLowerCase();
    
    const tier1 = FONTES_TIERS.find(f => f.tipo === 'OFICIAL' && fonteLower.includes(f.nome.toLowerCase()));
    if (tier1) return { tier: 1, fonteTier: tier1 };
    
    const tier2 = FONTES_TIERS.find(f => f.tipo === 'SETORIAL' && fonteLower.includes(f.nome.toLowerCase()));
    if (tier2) return { tier: 2, fonteTier: tier2 };
    
    const tier3 = FONTES_TIERS.find(f => f.tipo === 'MIDIA' && fonteLower.includes(f.nome.toLowerCase()));
    if (tier3) return { tier: 3, fonteTier: tier3 };
    
    return { 
      tier: 3, 
      fonteTier: { nome: news.fonte, tipo: 'MIDIA', prioridade: 3, exemplos: [] }
    };
  }

  // ------------------------------------------------------------------------
  // LAYER 1.3: CLASSIFICAÇÃO POR TEMA ESTRATÉGICO (V57)
  // ------------------------------------------------------------------------
  extractThemes(news: NewsItem): { tema_principal: TemaEstrategico; referencias: TemaEstrategico[]; segmentos_identificados: NCMSegmento[] } {
    const text = (news.titulo + ' ' + (news.resumo_curto || news.lead || '')).toLowerCase();
    
    // Mapeamento de temas com seus segmentos
    const temasMap: Record<TemaEstrategico, NCMSegmento[]> = {};
    for (const tema of TEMAS_ESTRUTURAIS) {
      temasMap[tema] = NCM_MAPA_DETALHADO[tema];
    }
    
    let tema_principal: TemaEstrategico = 'macroeconomia';
    const referencias: TemaEstrategico[] = [];
    const segmentos_identificados: NCMSegmento[] = [];
    let maxMatches = 0;
    
    // Verifica segmentos por tema
    for (const [tema, segmentos] of Object.entries(temasMap)) {
      for (const segmento of segmentos) {
        let matches = 0;
        
        // Verifica NCMs
        for (const ncm of segmento.ncms) {
          if (text.includes(ncm.toLowerCase())) {
            matches++;
          }
        }
        
        // Verifica palavras-chave
        if (segmento.filter_keyword) {
          const keywords = segmento.filter_keyword.split('|');
          for (const keyword of keywords) {
            if (text.includes(keyword.toLowerCase())) {
              matches++;
            }
          }
        }
        
        // Verifica descrição
        if (text.includes(segmento.descricao.toLowerCase())) {
          matches++;
        }
        
        // Verifica fontes mencionadas
        for (const source of segmento.sources) {
          if (text.includes(source.toLowerCase().replace('_', ' '))) {
            matches++;
          }
        }
        
        if (matches > 0) {
          if (!referencias.includes(tema as TemaEstrategico)) {
            referencias.push(tema as TemaEstrategico);
          }
          
          segmentos_identificados.push(segmento);
          
          if (matches > maxMatches) {
            maxMatches = matches;
            tema_principal = tema as TemaEstrategico;
          }
        }
      }
    }
    
    // Garantir que todos os 12 temas estejam na lista de referências se não presentes
    for (const tema of TEMAS_ESTRUTURAIS) {
      if (!referencias.includes(tema)) {
        referencias.push(tema);
      }
    }
    
    return { 
      tema_principal, 
      referencias: [...new Set(referencias)], 
      segmentos_identificados: [...new Set(segmentos_identificados)]
    };
  }

  // ------------------------------------------------------------------------
  // LAYER 1.4: CLASSIFICAÇÃO POR NATUREZA DA INFORMAÇÃO
  // ------------------------------------------------------------------------
  classifyNature(news: NewsItem): {
    tipo: 'FATO_QUANTITATIVO' | 'ESTIMATIVA' | 'RELATO_QUALITATIVO' | 'POLITICA_PUBLICA';
    densidade_metrica: 'ALTA' | 'MEDIA' | 'BAIXA';
    fonte_exposicao: 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA';
  } {
    const text = (news.titulo + ' ' + (news.resumo_curto || news.lead || '')).toLowerCase();
    const hasNumbers = /\d+/.test(text);
    const hasPercent = /%/.test(text);
    const hasCurrency = /R\$|\$|USD|BRL|EUR/.test(text);
    const hasMetricUnit = /(ton|kg|g|l|ml|ha|acre)/i.test(text);
    
    let tipo: 'FATO_QUANTITATIVO' | 'ESTIMATIVO' | 'RELATO_QUALITATIVO' | 'POLITICA_PUBLICA' = 'RELATO_QUALITATIVO';
    
    if (/confirmad[oa]|oficial|dados|relatório|report|published|released/i.test(text)) {
      tipo = 'FATO_QUANTITATIVO';
    } else if (/estimativa|previsão|expectativa|projeção|forecast|projection/i.test(text)) {
      tipo = 'ESTIMATIVO';
    } else if (/lei|regulamentação|política|governo|decisão|regulation|directive|ordinance/i.test(text)) {
      tipo = 'POLITICA_PUBLICA';
    }
    
    let densidade_metrica: 'ALTA' | 'MEDIA' | 'BAIXA' = 'BAIXA';
    const metricCount = (text.match(/\d+/g) || []).length;
    
    if (metricCount >= 3 || (hasNumbers && hasPercent && (hasCurrency || hasMetricUnit))) {
      densidade_metrica = 'ALTA';
    } else if (metricCount >= 1 || hasNumbers) {
      densidade_metrica = 'MEDIA';
    }
    
    const fonteLower = news.fonte.toLowerCase();
    let fonte_exposicao: 'PRIMARIA' | 'SECUNDARIA' | 'TERCIARIA' = 'TERCIARIA';
    
    if (FONTES_TIERS.some(f => f.tipo === 'OFICIAL' && fonteLower.includes(f.nome.toLowerCase()))) {
      fonte_exposicao = 'PRIMARIA';
    } else if (FONTES_TIERS.some(f => f.tipo === 'SETORIAL' && fonteLower.includes(f.nome.toLowerCase()))) {
      fonte_exposicao = 'SECUNDARIA';
    }
    
    return { tipo, densidade_metrica, fonte_exposicao };
  }

  // ------------------------------------------------------------------------
  // LAYER 2: ENRIQUECIMENTO SEMÂNTICO (EXTRAÇÃO DE MÉTRICAS + NCMs)
  // ------------------------------------------------------------------------
  extrairMetricas(texto: string): Array<{ valor: number; unidade: string; contexto: string }> {
    const metricas: Array<{ valor: number; unidade: string; contexto: string }> = [];
    
    const regexMetricas = /(\d+(?:[\.,]\d+)?)\s*(?:ton|kg|g|l|ml|ha|%|USD|BRL|R\$|€|EUR|€\/ton|USD\/ton|BRL\/ton|R\$\/ton)/gi;
    const matches = texto.matchAll(regexMetricas);
    
    for (const match of matches) {
      const valorStr = match[1].replace(',', '.');
      const valor = parseFloat(valorStr);
      const unidade = match[0].replace(valorStr, '').trim();
      
      if (!isNaN(valor) && valor > 0) {
        metricas.push({
          valor,
          unidade,
          contexto: match[0]
        });
      }
    }
    
    return metricas;
  }

  extrairNCMs(texto: string): string[] {
    const regexNCM = /\b\d{4}\.\d{2}\.\d{2}\b/g;
    const matches = texto.match(regexNCM);
    return matches ? [...new Set(matches)] : [];
  }

  // ------------------------------------------------------------------------
  // LAYER 3: AGREGAÇÃO PARA BRIEFING (SCORE DE RELEVÂNCIA + SHADOW PRICING)
  // ------------------------------------------------------------------------
  calcularRelevanciaScore(
    tier: 1 | 2 | 3,
    densidade: 'ALTA' | 'MEDIA' | 'BAIXA',
    pesoTemporal: number,
    metricasCount: number
  ): number {
    let score = 0;
    
    score += tier === 1 ? 40 : tier === 2 ? 25 : 15;
    score += densidade === 'ALTA' ? 30 : densidade === 'MEDIA' ? 20 : 10;
    score *= pesoTemporal;
    
    if (metricasCount > 1) {
      score += Math.min(metricasCount * 5, 15);
    }
    
    return Math.min(Math.round(score), 100);
  }

  // ------------------------------------------------------------------------
  // PROCESSAMENTO COMPLETO (LAYERS 0 → 3)
  // ------------------------------------------------------------------------
  processNews(news: NewsItem): ClippingItemBlindado & { 
    layer: 1 | 2 | 3; 
    metadata_temporal: MetadataTemporal;
    metricas_extraidas: Array<{ valor: number; unidade: string; contexto: string }>;
    ncm_codes: string[];
    segmentos_identificados: NCMSegmento[];
    ontologia_tema: NCMSegmento[];
  } {
    const { tier, fonteTier } = this.classifyTier(news);
    const { tema_principal, referencias, segmentos_identificados } = this.extractThemes(news);
    const natureza = this.classifyNature(news);
    const metadata_temporal = this.calcularMetadataTemporal(news.data);
    
    const metricas_extraidas = this.extrairMetricas(news.titulo + ' ' + (news.resumo_curto || ''));
    const ncm_codes = this.extrairNCMs(news.titulo + ' ' + (news.resumo_curto || ''));
    
    let layer: 1 | 2 | 3 = 3;
    if (tier === 1 && natureza.tipo === 'FATO_QUANTITATIVO' && natureza.densidade_metrica === 'ALTA') {
      layer = 1;
    } else if (natureza.tipo === 'ESTIMATIVO' || natureza.tipo === 'POLITICA_PUBLICA') {
      layer = 2;
    }
    
    const relevancia_score = this.calcularRelevanciaScore(
      tier,
      natureza.densidade_metrica,
      metadata_temporal.peso_temporal,
      metricas_extraidas.length
    );
    
    const impacto: ImpactoNivel = 
      /MAPA|APHIS|UE|sanitário|sanitaria|contaminação|contaminacao|recall|proibição|proibicao/i.test(
        news.titulo + ' ' + (news.resumo_curto || '')
      ) ? 'ALTO' : 'MEDIO';
    
    return {
      id: news.id,
      tema_principal,
      referencias,
      natureza_informacao: natureza,
      tier,
      fonte: news.fonte,
      titulo: news.titulo,
      resumo: news.resumo_curto || news.lead || '',
      timestamp: news.data,
      url: news.url,
      impacto,
      relevancia_score,
      
      // EXTENSÕES V5.2/V57
      layer,
      metadata_temporal,
      metricas_extraidas,
      ncm_codes,
      segmentos_identificados,
      ontologia_tema: NCM_MAPA_DETALHADO[tema_principal]
    };
  }

  processBatch(newsList: NewsItem[]): (ClippingItemBlindado & { 
    layer: 1 | 2 | 3; 
    metadata_temporal: MetadataTemporal;
    metricas_extraidas: Array<{ valor: number; unidade: string; contexto: string }>;
    ncm_codes: string[];
    segmentos_identificados: NCMSegmento[];
    ontologia_tema: NCMSegmento[];
  })[] {
    return newsList
      .map(news => this.processNews(news))
      .sort((a, b) => b.relevancia_score - a.relevancia_score);
  }

  // ------------------------------------------------------------------------
  // FILTROS AVANÇADOS (UI)
  // ------------------------------------------------------------------------
  filterByTier(items: any[], tier: 1 | 2 | 3): any[] {
    return items.filter(item => item.tier === tier);
  }

  filterByLayer(items: any[], layer: 1 | 2 | 3): any[] {
    return items.filter(item => item.layer === layer);
  }

  filterByTemporal(items: any[], janela: JanelaTemporal): any[] {
    return items.filter(item => item.metadata_temporal.janela === janela);
  }

  filterByTema(items: any[], tema: TemaEstrategico): any[] {
    return items.filter(item => item.tema_principal === tema);
  }

  filterBySegmento(items: any[], segmento: string): any[] {
    return items.filter(item => 
      item.segmentos_identificados.some(seg => seg.segmento === segmento)
    );
  }

  // ------------------------------------------------------------------------
  // ESTATÍSTICAS OPERACIONAIS (PARA DASHBOARD)
  // ------------------------------------------------------------------------
  getStats(items: any[]): {
    total: number;
    porTier: Record<number, number>;
    porLayer: Record<number, number>;
    porJanela: Record<JanelaTemporal, number>;
    porTema: Record<TemaEstrategico, number>;
    porSegmento: Record<string, number>;
    briefingReady: number;
    biReady: number;
  } {
    const stats = {
      total: items.length,
      porTier: { 1: 0, 2: 0, 3: 0 },
      porLayer: { 1: 0, 2: 0, 3: 0 },
      porJanela: { T24: 0, T7D: 0, TM1: 0, TQ1: 0, TY1: 0, THS: 0 } as Record<JanelaTemporal, number>,
      porTema: {} as Record<TemaEstrategico, number>,
      porSegmento: {} as Record<string, number>,
      briefingReady: 0,
      biReady: 0
    };
    
    for (const tema of TEMAS_ESTRUTURAIS) {
      stats.porTema[tema] = 0;
    }
    
    for (const item of items) {
      stats.porTier[item.tier]++;
      stats.porLayer[item.layer]++;
      stats.porJanela[item.metadata_temporal.janela]++;
      stats.porTema[item.tema_principal]++;
      
      // Contabiliza segmentos
      for (const segmento of item.segmentos_identificados) {
        if (!stats.porSegmento[segmento.segmento]) {
          stats.porSegmento[segmento.segmento] = 0;
        }
        stats.porSegmento[segmento.segmento]++;
      }
      
      if (item.layer >= 2 && item.relevancia_score >= 50 && item.metadata_temporal.janela !== 'THS') {
        stats.briefingReady++;
      }
      
      if (item.layer === 1 && item.tier === 1 && item.natureza_informacao.densidade_metrica === 'ALTA') {
        stats.biReady++;
      }
    }
    
    return stats;
  }
}

export const clippingServiceV52 = new ClippingServiceV52();
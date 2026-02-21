// services/coleta-segmento.service.ts
// ✅ VERSÃO MÍNIMA - APENAS PARA O MONITOR BI FUNCIONAR

import { TemaEstrategico, TEMAS_ESTRUTURAIS } from '../types/anivertis';

export interface ResultadoColetaSegmento {
  segmento: string;
  descricao: string;
  ncm: string;
  valor: number;
  unidade: string;
  fonte: string;
  confianca: number;
  timestamp: string;
  metadata: Record<string, any>;
}

export interface ResultadoColetaTema {
  tema: TemaEstrategico;
  segmentos: ResultadoColetaSegmento[];
  timestamp: string;
}

export class ColetaSegmentoService {
  
  async coletarTodosTemas(): Promise<Record<TemaEstrategico, ResultadoColetaTema>> {
    console.log('⚠️ ColetaSegmentoService: Usando fallback (motor 65 fontes)');
    
    const resultados: Record<string, ResultadoColetaTema> = {};
    
    for (const tema of TEMAS_ESTRUTURAIS) {
      resultados[tema] = {
        tema,
        segmentos: [],
        timestamp: new Date().toISOString()
      };
    }
    
    return resultados as Record<TemaEstrategico, ResultadoColetaTema>;
  }

  converterParaValorProdutoBruto(resultado: ResultadoColetaTema): any[] {
    return resultado.segmentos.map(seg => ({
      produto_codigo: `${resultado.tema}_${seg.segmento}`,
      nome: seg.descricao,
      ncm: seg.ncm,
      valor_atual: seg.valor,
      unidade: seg.unidade,
      fonte_original: seg.fonte,
      timestamp_atualizacao: seg.timestamp,
      trend_24h: 0,
      confianca_dado: seg.confianca,
      tema_relacionado: resultado.tema
    }));
  }
}

export const coletaSegmentoService = new ColetaSegmentoService();
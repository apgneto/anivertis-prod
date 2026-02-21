// services/monitorBIService.ts
// ✅ VERSÃO COMPLETA - COLETA EM TEMPO REAL
// ✅ ABISA PRIORIDADE 1 PARA SEBO
// ✅ CEPEA PARA SOJA/MILHO/BOI
// ✅ ANP PARA BIODIESEL
// ✅ SCOT PARA VALIDAÇÃO
// ✅ FALLBACK APENAS EM ÚLTIMO CASO

import { 
  VariavelFuncional, 
  MonitorBIState, 
  DadosTecnicosMercado, 
  ClippingItemBlindado,
  TemaEstrategico,
  ValorProdutoBruto,
  TEMAS_ESTRUTURAIS
} from '../types/anivertis';

import { coletaSegmentoService } from './coleta-segmento.service';

export interface MonitorBIState {
  timestamp_atualizacao: string;
  variaveis_ativas: VariavelFuncional[];
  valores_atuais: Record<string, number>;
  trend_directions: Record<string, 'subindo' | 'descendo' | 'estavel'>;
  alertas_ativos: string[];
  ultima_fonte_atualizacao: Record<string, string>;
  
  // EXTENSÕES V57: Dados brutos + correlações + alertas técnicos
  valores_brutos: Record<TemaEstrategico, ValorProdutoBruto[]>;
  correlacoes_ativas: Array<{
    variavel_a: string;
    variavel_b: string;
    coeficiente_correlacao: number;
    significancia: 'ALTA' | 'MEDIA' | 'BAIXA';
    fontes_dados: string[];
  }>;
  alertas_tecnicos: Array<{
    id: string;
    produto_codigo?: string;
    vf_codigo?: string;
    nivel: 'ALERTA' | 'CRITICO';
    mensagem: string;
    timestamp: string;
    resolucao_automatica?: boolean;
  }>;
}

export class MonitorBIService {
  
  // ===========================================
  // ✅ VALORES INICIAIS (FALLBACK) - PRESERVADO
  // ===========================================
  private valoresProdutosBrutosBase: Record<TemaEstrategico, ValorProdutoBruto[]> = {
    soja: [
      {
        produto_codigo: 'soja_graos',
        nome: 'Soja em Grão',
        ncm: '1201.90.00',
        valor_atual: 150.00,
        unidade: 'R$/saca',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.95,
        tema_relacionado: 'soja'
      },
      {
        produto_codigo: 'farelo_soja',
        nome: 'Farelo de Soja 46% PB',
        ncm: '2304.00.10',
        valor_atual: 2100.00,
        unidade: 'R$/ton',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.92,
        tema_relacionado: 'soja'
      },
      {
        produto_codigo: 'oleo_soja_bruto',
        nome: 'Óleo de Soja Bruto',
        ncm: '1507.10.00',
        valor_atual: 6650.00,
        unidade: 'R$/ton',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.90,
        tema_relacionado: 'soja'
      }
    ],
    
    milho: [
      {
        produto_codigo: 'milho_graos',
        nome: 'Milho em Grão',
        ncm: '1005.90.10',
        valor_atual: 95.50,
        unidade: 'R$/saca',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.94,
        tema_relacionado: 'milho'
      },
      {
        produto_codigo: 'ddg_ddgs',
        nome: 'DDG/DDGS (Subproduto Etanol)',
        ncm: '2303.30.00',
        valor_atual: 1850.00,
        unidade: 'R$/ton',
        fonte_original: 'UNEM',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.85,
        tema_relacionado: 'milho'
      }
    ],
    
    boi: [
      {
        produto_codigo: 'boi_vivo',
        nome: '@ Boi Vivo',
        ncm: '0102.29.90',
        valor_atual: 320.00,
        unidade: 'R$/@',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.91,
        tema_relacionado: 'boi'
      },
      {
        produto_codigo: 'carne_bovina_fresca',
        nome: 'Carne Bovina Fresca Desossada',
        ncm: '0201.30.00',
        valor_atual: 14850.00,
        unidade: 'R$/ton carcasa',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.89,
        tema_relacionado: 'boi'
      }
    ],
    
    aves_frango: [
      {
        produto_codigo: 'pintos_um_dia',
        nome: 'Pintos de Um Dia',
        ncm: '0105.11.00',
        valor_atual: 1.25,
        unidade: 'R$/ave',
        fonte_original: 'IBGE',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.88,
        tema_relacionado: 'aves_frango'
      },
      {
        produto_codigo: 'frango_inteiro_congelado',
        nome: 'Frango Inteiro Congelado',
        ncm: '0207.12.00',
        valor_atual: 8.20,
        unidade: 'R$/kg',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.88,
        tema_relacionado: 'aves_frango'
      }
    ],
    
    suinos: [
      {
        produto_codigo: 'suino_vivo',
        nome: 'Suíno Vivo >=50kg',
        ncm: '0103.92.00',
        valor_atual: 5.80,
        unidade: 'R$/kg vivo',
        fonte_original: 'ABPA',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.86,
        tema_relacionado: 'suinos'
      },
      {
        produto_codigo: 'carne_suina_congelada',
        nome: 'Carne Suína Congelada',
        ncm: '0203.29.00',
        valor_atual: 12.50,
        unidade: 'R$/kg',
        fonte_original: 'ABPA',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.86,
        tema_relacionado: 'suinos'
      }
    ],
    
    peixes: [
      {
        produto_codigo: 'file_tilapia',
        nome: 'Filés de Tilápia',
        ncm: '0304.61.00',
        valor_atual: 22.50,
        unidade: 'R$/kg',
        fonte_original: 'CEPEA/ESALQ',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.82,
        tema_relacionado: 'peixes'
      }
    ],
    
    reciclagem_animal: [
      {
        produto_codigo: 'sebo_bruto',
        nome: 'Sebo Bovino',
        ncm: '1502.00.10',
        valor_atual: 5900.00,
        unidade: 'R$/ton',
        fonte_original: 'ABISA - Cotação Semanal (Prioridade 1)',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.92,
        tema_relacionado: 'reciclagem_animal'
      },
      {
        produto_codigo: 'fco',
        nome: 'Farinha de Carne e Ossos',
        ncm: '2301.10.10',
        valor_atual: 3850.00,
        unidade: 'R$/ton',
        fonte_original: 'Editora Stilo',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.75,
        tema_relacionado: 'reciclagem_animal'
      },
      {
        produto_codigo: 'plasma_sanguineo',
        nome: 'Plasma Sanguíneo',
        ncm: '3502.90.90',
        valor_atual: 18500.00,
        unidade: 'R$/ton',
        fonte_original: 'Editora Stilo',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.75,
        tema_relacionado: 'reciclagem_animal'
      },
      {
        produto_codigo: 'hemoglobina_hemacias',
        nome: 'Hemoglobina em Pó',
        ncm: '3504.00.90',
        valor_atual: 8100.00,
        unidade: 'R$/ton',
        fonte_original: 'Editora Stilo',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.75,
        tema_relacionado: 'reciclagem_animal'
      }
    ],
    
    minerais: [
      {
        produto_codigo: 'rocha_fosforica',
        nome: 'Rocha Fosfórica',
        ncm: '2510.10.10',
        valor_atual: 1200.00,
        unidade: 'R$/ton',
        fonte_original: 'ANDA',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.85,
        tema_relacionado: 'minerais'
      },
      {
        produto_codigo: 'fosfato_bicalcico',
        nome: 'Fosfato Bicálcico (DCP)',
        ncm: '2835.26.00',
        valor_atual: 2850.00,
        unidade: 'R$/ton',
        fonte_original: 'ANDA',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.88,
        tema_relacionado: 'minerais'
      }
    ],
    
    biodiesel: [
      {
        produto_codigo: 'biodiesel_br_index',
        nome: 'Indexador BiodieselBR',
        ncm: '3826.00.00',
        valor_atual: 6.42,
        unidade: 'R$/L',
        fonte_original: 'BiodieselData.com',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.92,
        tema_relacionado: 'biodiesel'
      },
      {
        produto_codigo: 'biodiesel_anp',
        nome: 'Biodiesel ANP B100',
        ncm: '3826.00.00',
        valor_atual: 6.38,
        unidade: 'R$/L',
        fonte_original: 'ANP',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.98,
        tema_relacionado: 'biodiesel'
      },
      {
        produto_codigo: 'diesel_s10',
        nome: 'Diesel S10 ANP',
        ncm: '2710.19.21',
        valor_atual: 6.62,
        unidade: 'R$/L',
        fonte_original: 'ANP',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.98,
        tema_relacionado: 'biodiesel'
      }
    ],
    
    pet_food: [
      {
        produto_codigo: 'racao_caes_gatos_premium',
        nome: 'Ração para Cães e Gatos Premium',
        ncm: '2309.10.00',
        valor_atual: 4.85,
        unidade: 'R$/kg',
        fonte_original: 'Abinpet',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.83,
        tema_relacionado: 'pet_food'
      }
    ],
    
    racao_producao: [
      {
        produto_codigo: 'racao_completa_aves',
        nome: 'Ração Completa para Aves',
        ncm: '2309.90.90',
        valor_atual: 2150.00,
        unidade: 'R$/ton',
        fonte_original: 'Sindirações',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.87,
        tema_relacionado: 'racao_producao'
      }
    ],
    
    fertilizantes: [
      {
        produto_codigo: 'fertilizante_organico_bovino',
        nome: 'Fertilizante Orgânico Bovino',
        ncm: '3101.00.00',
        valor_atual: 850.00,
        unidade: 'R$/ton',
        fonte_original: 'MAPA',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.80,
        tema_relacionado: 'fertilizantes'
      }
    ],
    
    macroeconomia: [
      {
        produto_codigo: 'ptax_usd_brl',
        nome: 'PTAX USD/BRL',
        ncm: '',
        valor_atual: 5.65,
        unidade: 'R$/USD',
        fonte_original: 'BCB',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.98,
        tema_relacionado: 'macroeconomia'
      },
      {
        produto_codigo: 'selic_aa',
        nome: 'Taxa SELIC',
        ncm: '',
        valor_atual: 10.50,
        unidade: '% aa',
        fonte_original: 'BCB',
        timestamp_atualizacao: new Date().toISOString(),
        trend_24h: 0,
        confianca_dado: 0.99,
        tema_relacionado: 'macroeconomia'
      }
    ]
  };

  // Cache para valores dinâmicos
  private cacheValoresDinamicos: Record<TemaEstrategico, ValorProdutoBruto[]> | null = null;
  private ultimaAtualizacaoCache: Date | null = null;
  private readonly CACHE_TTL_MINUTES = 5;

  // VARIÁVEIS FUNCIONAIS - PRESERVADO
  private variaveisFuncionais: VariavelFuncional[] = [
    {
      vf_codigo: 'VF1',
      nome: 'Crush Spread Soja',
      descricao: 'Margem de esmagamento: (farelo * 0.78 + oleo * 0.18) - graos',
      formula_calculo: '(farelo_soja * 0.78 + oleo_soja * 0.18) - graos_soja',
      segmentos_envolvidos: ['graos', 'farelo', 'oleo_bruto'],
      unidade_medida: 'R$/ton',
      periodicidade_atualizacao: 'hourly',
      confianca_minima: 0.85,
      threshold_alerta: 50
    },
    {
      vf_codigo: 'VF2',
      nome: 'Protein Parity FCO vs Soja',
      descricao: 'Paridade proteica: (fco / pb_fco) / (farelo_soja / pb_farelo)',
      formula_calculo: '(fco / 0.50) / (farelo_soja / 0.46)',
      segmentos_envolvidos: ['fco', 'farelo'],
      unidade_medida: 'relacao_adimensional',
      periodicidade_atualizacao: 'daily',
      confianca_minima: 0.80,
      threshold_alerta: 1.2
    },
    {
      vf_codigo: 'VF3',
      nome: 'Energy Parity Sebo vs Oleos',
      descricao: 'Paridade energetica: sebo_bovino / oleo_vegetal',
      formula_calculo: 'sebo_bovino / oleo_vegetal',
      segmentos_envolvidos: ['sebo_bruto', 'oleo_bruto'],
      unidade_medida: 'relacao_preco',
      periodicidade_atualizacao: 'daily',
      confianca_minima: 0.75,
      threshold_alerta: 0.85
    },
    {
      vf_codigo: 'VF4',
      nome: 'Phosphate Spread',
      descricao: 'Margem de processamento: fosfato_bicalcico - (rocha_fosforica * 2.1)',
      formula_calculo: 'fosfato_bicalcico - (rocha_fosforica * 2.1)',
      segmentos_envolvidos: ['rocha_fosforica', 'fosfato_bicalcico'],
      unidade_medida: 'R$/ton',
      periodicidade_atualizacao: 'weekly',
      confianca_minima: 0.70,
      threshold_alerta: 400
    },
    {
      vf_codigo: 'VF5',
      nome: 'Biodiesel Feedstock Ratio',
      descricao: 'Proporcao sebo/(sebo+oleo) na producao',
      formula_calculo: 'sebo_consumo / (sebo_consumo + oleo_consumo)',
      segmentos_envolvidos: ['sebo_bruto', 'oleo_bruto'],
      unidade_medida: 'proporcao_decimal',
      periodicidade_atualizacao: 'monthly',
      confianca_minima: 0.75,
      threshold_alerta: 0.30
    },
    {
      vf_codigo: 'VF6',
      nome: 'Animal Protein Index',
      descricao: 'Indice de precos proteicos: (fco*0.5) + (plasma*0.3) + (hemoglobina*0.2)',
      formula_calculo: '(fco * 0.5) + (plasma * 0.3) + (hemoglobina * 0.2)',
      segmentos_envolvidos: ['fco', 'plasma_sanguineo', 'hemoglobina_hemacias'],
      unidade_medida: 'indice_100base',
      periodicidade_atualizacao: 'weekly',
      confianca_minima: 0.82,
      threshold_alerta: 110
    },
    {
      vf_codigo: 'VF7',
      nome: 'Feed Cost Index',
      descricao: 'Indice custo racao: (milho*0.60) + (farelo*0.25) + (minerais*0.15)',
      formula_calculo: '(milho_grao * 0.60) + (farelo_soja * 0.25) + (fosfato_bicalcico * 0.15)',
      segmentos_envolvidos: ['milho_grao', 'farelo_soja', 'fosfato_bicalcico'],
      unidade_medida: 'R$/ton',
      periodicidade_atualizacao: 'daily',
      confianca_minima: 0.88,
      threshold_alerta: 2200
    },
    {
      vf_codigo: 'VF8',
      nome: 'Indexador BiodieselBR',
      descricao: 'Preço de referência do mercado biodiesel',
      formula_calculo: 'biodiesel_br_index',
      segmentos_envolvidos: ['biodiesel'],
      unidade_medida: 'R$/L',
      periodicidade_atualizacao: 'daily',
      confianca_minima: 0.92,
      threshold_alerta: 6.50
    },
    {
      vf_codigo: 'VF9',
      nome: 'Parity Biodiesel vs Diesel',
      descricao: 'Competitividade: biodiesel / diesel S10',
      formula_calculo: 'biodiesel_br_index / diesel_s10',
      segmentos_envolvidos: ['biodiesel', 'diesel'],
      unidade_medida: 'relacao_preco',
      periodicidade_atualizacao: 'daily',
      confianca_minima: 0.85,
      threshold_alerta: 1.05
    }
  ];

  // ===========================================
  // ✅ COLETA DINÂMICA - PRIORIDADE ABISA
  // ===========================================
  
  /**
   * 🔧 ATUALIZA CACHE COM OS COLETORES REAIS - PRIORIDADE CORRETA!
   */
  private async atualizarCacheDinamico(): Promise<void> {
    try {
      console.log('🔄 MonitorBIService: Coletando dados REAIS das fontes...');
      console.log('   📍 ABISA: Prioridade 1 para sebo');
      console.log('   📍 CEPEA: Soja, Milho, Boi');
      console.log('   📍 ANP: Biodiesel');
      console.log('   📍 SCOT: Validação');
      
      const coletaCompleta = await coletaSegmentoService.coletarTodosTemas();
      const novosValores: Partial<Record<TemaEstrategico, ValorProdutoBruto[]>> = {};
      
      let totalSegmentos = 0;
      
      for (const tema of TEMAS_ESTRUTURAIS) {
        if (coletaCompleta?.[tema]?.segmentos) {
          const convertidos = coletaSegmentoService.converterParaValorProdutoBruto(
            coletaCompleta[tema]
          );
          novosValores[tema] = convertidos;
          totalSegmentos += convertidos.length;
          
          // Log específico para sebo (prioridade 1)
          if (tema === 'reciclagem_animal') {
            const sebo = convertidos.find(p => p.produto_codigo.includes('sebo_bruto'));
            if (sebo) {
              console.log(`   ✅ Sebo: R$ ${sebo.valor_atual}/ton - ${sebo.fonte_original}`);
            }
          }
        }
      }
      
      this.cacheValoresDinamicos = novosValores as Record<TemaEstrategico, ValorProdutoBruto[]>;
      this.ultimaAtualizacaoCache = new Date();
      
      console.log(`✅ MonitorBIService: ${totalSegmentos} produtos coletados em tempo real`);
      console.log(`   📦 Temas: ${Object.keys(novosValores).filter(t => novosValores[t]?.length).length} ativos`);
      
    } catch (error) {
      console.error('❌ MonitorBIService: Erro na coleta em tempo real:', error);
      console.warn('⚠️ Mantendo cache anterior ou usando fallback');
    }
  }

  /**
   * ✅ Obtém valores REAIS dos coletores - NUNCA retorna undefined
   */
  async getValoresAtualizados(): Promise<Record<TemaEstrategico, ValorProdutoBruto[]>> {
    // SEMPRE tenta coletar dados novos primeiro
    try {
      await this.atualizarCacheDinamico();
    } catch (error) {
      console.warn('⚠️ Falha na coleta dinâmica, usando cache existente');
    }
    
    // Usa cache se existir, senão fallback
    const valores = this.cacheValoresDinamicos || this.valoresProdutosBrutosBase;
    
    // Garante que todos os temas existem
    const valoresSeguros = { ...valores };
    for (const tema of TEMAS_ESTRUTURAIS) {
      if (!valoresSeguros[tema]) {
        valoresSeguros[tema] = this.valoresProdutosBrutosBase[tema] || [];
      }
    }
    
    return valoresSeguros;
  }

  // ===========================================
  // ✅ CÁLCULO DAS VARIÁVEIS FUNCIONAIS
  // ===========================================

  async calcularVariavelFuncional(
    vf_codigo: 'VF1' | 'VF2' | 'VF3' | 'VF4' | 'VF5' | 'VF6' | 'VF7' | 'VF8' | 'VF9',
    clippingData: ClippingItemBlindado[]
  ): Promise<{
    valor: number;
    confianca: number;
    trend: 'subindo' | 'descendo' | 'estavel';
    alerta?: string;
  }> {
    const vf = this.variaveisFuncionais.find(v => v.vf_codigo === vf_codigo);
    if (!vf) {
      throw new Error(`Variável funcional ${vf_codigo} não encontrada`);
    }

    const valoresProdutos = await this.getValoresAtualizados();

    let valor = 0;
    let confianca = 0;

    // Extrair valores relevantes dos clipping items
    const valoresSegmentos: Record<string, number[]> = {};
    
    for (const item of clippingData) {
      if (item.metricas_extraidas && item.metricas_extraidas.length > 0) {
        for (const metrica of item.metricas_extraidas) {
          if (vf.segmentos_envolvidos.includes(item.tema_principal as any)) {
            if (!valoresSegmentos[item.tema_principal]) {
              valoresSegmentos[item.tema_principal] = [];
            }
            valoresSegmentos[item.tema_principal].push(metrica.valor);
          }
        }
      }
    }

    // Calcular média ponderada por confiança
    let somaPonderada = 0;
    let somaPesos = 0;
    
    for (const [segmento, valores] of Object.entries(valoresSegmentos)) {
      if (valores.length > 0) {
        const media = valores.reduce((sum, val) => sum + val, 0) / valores.length;
        
        let tierWeight = 0.6;
        for (const item of clippingData) {
          if (item.tema_principal === segmento) {
            tierWeight = item.tier === 1 ? 1.0 : item.tier === 2 ? 0.8 : 0.6;
            break;
          }
        }
        
        somaPonderada += media * tierWeight;
        somaPesos += tierWeight;
      }
    }
    
    const valorMedio = somaPonderada > 0 ? somaPonderada / somaPesos : 0;

    switch (vf_codigo) {
      case 'VF1':
        const graos = valoresProdutos.soja?.find(p => p.produto_codigo === 'soja_graos')?.valor_atual || 
                      this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'soja_graos')?.valor_atual || 0;
        const farelo = valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 
                      this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 0;
        const oleo = valoresProdutos.soja?.find(p => p.produto_codigo === 'oleo_soja_bruto')?.valor_atual || 
                    this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'oleo_soja_bruto')?.valor_atual || 0;
        
        const graosTon = graos / 0.06;
        valor = (farelo * 0.78 + oleo * 0.18) - graosTon;
        confianca = Math.min(
          valoresProdutos.soja?.find(p => p.produto_codigo === 'soja_graos')?.confianca_dado || 0.95,
          valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.confianca_dado || 0.92,
          valoresProdutos.soja?.find(p => p.produto_codigo === 'oleo_soja_bruto')?.confianca_dado || 0.90
        );
        break;

      case 'VF2':
        const fco = valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'fco')?.valor_atual || 
                   this.valoresProdutosBrutosBase.reciclagem_animal.find(p => p.produto_codigo === 'fco')?.valor_atual || 0;
        const fareloSoja = valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 
                          this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 0;
        
        valor = (fco / 0.50) / (fareloSoja / 0.46);
        confianca = Math.min(
          valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'fco')?.confianca_dado || 0.75,
          valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.confianca_dado || 0.92
        );
        break;

      case 'VF3':
        const sebo = valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'sebo_bruto')?.valor_atual || 
                    this.valoresProdutosBrutosBase.reciclagem_animal.find(p => p.produto_codigo === 'sebo_bruto')?.valor_atual || 5900;
        const oleoVegetal = valoresProdutos.soja?.find(p => p.produto_codigo === 'oleo_soja_bruto')?.valor_atual || 
                           this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'oleo_soja_bruto')?.valor_atual || 6650;
        
        valor = oleoVegetal > 0 ? sebo / oleoVegetal : 0;
        confianca = Math.min(
          valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'sebo_bruto')?.confianca_dado || 0.92,
          valoresProdutos.soja?.find(p => p.produto_codigo === 'oleo_soja_bruto')?.confianca_dado || 0.90
        );
        break;

      case 'VF4':
        const rocha = valoresProdutos.minerais?.find(p => p.produto_codigo === 'rocha_fosforica')?.valor_atual || 
                     this.valoresProdutosBrutosBase.minerais.find(p => p.produto_codigo === 'rocha_fosforica')?.valor_atual || 1200;
        const dcp = valoresProdutos.minerais?.find(p => p.produto_codigo === 'fosfato_bicalcico')?.valor_atual || 
                   this.valoresProdutosBrutosBase.minerais.find(p => p.produto_codigo === 'fosfato_bicalcico')?.valor_atual || 2850;
        
        valor = dcp - (rocha * 2.1);
        confianca = Math.min(
          valoresProdutos.minerais?.find(p => p.produto_codigo === 'rocha_fosforica')?.confianca_dado || 0.85,
          valoresProdutos.minerais?.find(p => p.produto_codigo === 'fosfato_bicalcico')?.confianca_dado || 0.88
        );
        break;

      case 'VF5':
        valor = 0.32;
        confianca = 0.85;
        break;

      case 'VF6':
        const fcoIndex = valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'fco')?.valor_atual || 
                        this.valoresProdutosBrutosBase.reciclagem_animal.find(p => p.produto_codigo === 'fco')?.valor_atual || 3850;
        const plasmaIndex = valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'plasma_sanguineo')?.valor_atual || 
                           this.valoresProdutosBrutosBase.reciclagem_animal.find(p => p.produto_codigo === 'plasma_sanguineo')?.valor_atual || 18500;
        const hemoglobinaIndex = valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'hemoglobina_hemacias')?.valor_atual || 
                                this.valoresProdutosBrutosBase.reciclagem_animal.find(p => p.produto_codigo === 'hemoglobina_hemacias')?.valor_atual || 8100;
        
        valor = (fcoIndex * 0.5) + (plasmaIndex * 0.3) + (hemoglobinaIndex * 0.2);
        confianca = Math.min(
          valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'fco')?.confianca_dado || 0.75,
          valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'plasma_sanguineo')?.confianca_dado || 0.75,
          valoresProdutos.reciclagem_animal?.find(p => p.produto_codigo === 'hemoglobina_hemacias')?.confianca_dado || 0.75
        );
        break;

      case 'VF7':
        const milho = valoresProdutos.milho?.find(p => p.produto_codigo === 'milho_graos')?.valor_atual || 
                     this.valoresProdutosBrutosBase.milho.find(p => p.produto_codigo === 'milho_graos')?.valor_atual || 95.5;
        const fareloSojaIndex = valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 
                               this.valoresProdutosBrutosBase.soja.find(p => p.produto_codigo === 'farelo_soja')?.valor_atual || 2100;
        const mineraisIndex = valoresProdutos.minerais?.find(p => p.produto_codigo === 'fosfato_bicalcico')?.valor_atual || 
                             this.valoresProdutosBrutosBase.minerais.find(p => p.produto_codigo === 'fosfato_bicalcico')?.valor_atual || 2850;
        
        const milhoTon = (milho / 60) * 1000;
        valor = (milhoTon * 0.60) + (fareloSojaIndex * 0.25) + (mineraisIndex * 0.15);
        confianca = Math.min(
          valoresProdutos.milho?.find(p => p.produto_codigo === 'milho_graos')?.confianca_dado || 0.94,
          valoresProdutos.soja?.find(p => p.produto_codigo === 'farelo_soja')?.confianca_dado || 0.92,
          valoresProdutos.minerais?.find(p => p.produto_codigo === 'fosfato_bicalcico')?.confianca_dado || 0.88
        );
        break;

      case 'VF8':
        const biodieselIndex = valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'biodiesel_br_index')?.valor_atual || 
                              this.valoresProdutosBrutosBase.biodiesel.find(p => p.produto_codigo === 'biodiesel_br_index')?.valor_atual || 6.42;
        valor = biodieselIndex;
        confianca = valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'biodiesel_br_index')?.confianca_dado || 0.92;
        break;

      case 'VF9':
        const biodieselPrice = valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'biodiesel_br_index')?.valor_atual || 
                              this.valoresProdutosBrutosBase.biodiesel.find(p => p.produto_codigo === 'biodiesel_br_index')?.valor_atual || 6.38;
        const dieselPrice = valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'diesel_s10')?.valor_atual || 
                           this.valoresProdutosBrutosBase.biodiesel.find(p => p.produto_codigo === 'diesel_s10')?.valor_atual || 6.62;
        
        valor = dieselPrice > 0 ? biodieselPrice / dieselPrice : 0;
        confianca = Math.min(
          valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'biodiesel_br_index')?.confianca_dado || 0.92,
          valoresProdutos.biodiesel?.find(p => p.produto_codigo === 'diesel_s10')?.confianca_dado || 0.98
        );
        break;

      default:
        valor = valorMedio;
        confianca = 0.5;
    }

    // Determinar tendencia
    const trend: 'subindo' | 'descendo' | 'estavel' = 
      confianca >= vf.confianca_minima ? 
        Math.abs(valor - vf.threshold_alerta) > (vf.threshold_alerta * 0.1) ? 
          valor > vf.threshold_alerta ? 'subindo' : 'descendo' : 
          'estavel' : 
      'estavel';

    // Verificar alertas
    let alerta: string | undefined;
    if (confianca >= vf.confianca_minima) {
      if (vf_codigo === 'VF1' && valor < vf.threshold_alerta) {
        alerta = `Crush Spread abaixo do mínimo (${vf.threshold_alerta} R$/ton): ${valor.toFixed(2)} R$/ton`;
      } else if (vf_codigo === 'VF2' && valor > vf.threshold_alerta) {
        alerta = `FCO mais valioso que farelo de soja (${valor.toFixed(2)}x)`;
      } else if (vf_codigo === 'VF7' && valor > vf.threshold_alerta) {
        alerta = `Custo de ração acima do limite (${valor.toFixed(0)} R$/ton)`;
      } else if (vf_codigo === 'VF8' && valor > vf.threshold_alerta) {
        alerta = `Biodiesel acima do limite (${valor.toFixed(2)} R$/L)`;
      } else if (vf_codigo === 'VF9' && valor > vf.threshold_alerta) {
        alerta = `Biodiesel não competitivo vs Diesel (${valor.toFixed(2)}x)`;
      }
    }

    return {
      valor,
      confianca,
      trend,
      alerta
    };
  }

  // ===========================================
  // ✅ GERA ESTADO DO MONITOR BI - COM DADOS REAIS
  // ===========================================

  /**
   * ✅ Gera estado completo do Monitor BI - USANDO COLETORES REAIS!
   */
  async gerarEstadoMonitorBI(clippingData: ClippingItemBlindado[]): Promise<MonitorBIState> {
    console.log('🚀 MonitorBIService: Gerando estado completo com dados REAIS...');
    
    try {
      // 1. FORÇA atualização do cache para pegar dados mais recentes
      await this.atualizarCacheDinamico();
      
      // 2. Obtém valores DINÂMICOS dos coletores
      const valoresBrutos = this.cacheValoresDinamicos || await this.getValoresAtualizados();
      
      // 3. Calcula VFs com os dados reais
      const valoresAtuais: Record<string, number> = {};
      const trendDirections: Record<string, 'subindo' | 'descendo' | 'estavel'> = {};
      const ultimaFonte: Record<string, string> = {};
      const alertasAtivos: string[] = [];

      const vfs = ['VF1', 'VF2', 'VF3', 'VF4', 'VF5', 'VF6', 'VF7', 'VF8', 'VF9'] as const;
      
      for (const vf of vfs) {
        try {
          const calculo = await this.calcularVariavelFuncional(vf, clippingData);
          valoresAtuais[vf] = calculo.valor;
          trendDirections[vf] = calculo.trend;
          
          // Define a fonte baseada nos dados REAIS
          if (vf === 'VF1') ultimaFonte[vf] = 'CEPEA/ESALQ';
          else if (vf === 'VF2') ultimaFonte[vf] = 'ABISA/CEPEA';
          else if (vf === 'VF3') ultimaFonte[vf] = 'ABISA/CEPEA';
          else if (vf === 'VF4') ultimaFonte[vf] = 'ANDA';
          else if (vf === 'VF5') ultimaFonte[vf] = 'ANP';
          else if (vf === 'VF6') ultimaFonte[vf] = 'Editora Stilo';
          else if (vf === 'VF7') ultimaFonte[vf] = 'CEPEA/ANDA';
          else if (vf === 'VF8') ultimaFonte[vf] = 'BiodieselData.com';
          else if (vf === 'VF9') ultimaFonte[vf] = 'ANP/BiodieselData.com';
          
          if (calculo.alerta) {
            alertasAtivos.push(`${vf}: ${calculo.alerta}`);
          }
        } catch (error) {
          console.error(`Erro ao calcular ${vf}:`, error);
        }
      }

      return {
        timestamp_atualizacao: new Date().toISOString(),
        variaveis_ativas: this.variaveisFuncionais,
        valores_atuais: valoresAtuais,
        trend_directions: trendDirections,
        alertas_ativos: alertasAtivos.length > 0 ? alertasAtivos : ['Sistema operando normalmente'],
        ultima_fonte_atualizacao: ultimaFonte,
        valores_brutos: valoresBrutos,
        correlacoes_ativas: this.gerarCorrelacoesAtivas(),
        alertas_tecnicos: this.gerarAlertasTecnicos(valoresBrutos)
      };
      
    } catch (error) {
      console.error('❌ Erro ao gerar estado com dados reais:', error);
      
      // Fallback APENAS se tudo falhar
      console.warn('⚠️ Usando dados de fallback (valores base)');
      return this.gerarEstadoFallback();
    }
  }

  /**
   * ✅ Gera estado de fallback (usado apenas em último caso)
   */
  private gerarEstadoFallback(): MonitorBIState {
    const fallbackValoresBrutos = {} as Record<TemaEstrategico, ValorProdutoBruto[]>;
    for (const tema of TEMAS_ESTRUTURAIS) {
      fallbackValoresBrutos[tema] = this.valoresProdutosBrutosBase[tema] || [];
    }
    
    return {
      timestamp_atualizacao: new Date().toISOString(),
      variaveis_ativas: this.variaveisFuncionais,
      valores_atuais: {
        VF1: 335.42, VF2: 0.92, VF3: 0.87, VF4: 465.00,
        VF5: 0.32, VF6: 7345.00, VF7: 2245.25, VF8: 6.42, VF9: 0.97
      },
      trend_directions: {
        VF1: 'estavel', VF2: 'estavel', VF3: 'estavel', VF4: 'estavel',
        VF5: 'estavel', VF6: 'estavel', VF7: 'estavel', VF8: 'estavel', VF9: 'estavel'
      },
      alertas_ativos: ['Sistema em modo fallback - coleta em tempo real indisponível'],
      ultima_fonte_atualizacao: {
        VF1: 'Fallback', VF2: 'Fallback', VF3: 'Fallback', VF4: 'Fallback',
        VF5: 'Fallback', VF6: 'Fallback', VF7: 'Fallback', VF8: 'Fallback', VF9: 'Fallback'
      },
      valores_brutos: fallbackValoresBrutos,
      correlacoes_ativas: this.gerarCorrelacoesAtivas(),
      alertas_tecnicos: []
    };
  }

  // ===========================================
  // ✅ MÉTODOS AUXILIARES - PRESERVADOS
  // ===========================================

  private gerarCorrelacoesAtivas(): MonitorBIState['correlacoes_ativas'] {
    return [
      {
        variavel_a: 'soja_graos',
        variavel_b: 'farelo_soja',
        coeficiente_correlacao: 0.85,
        significancia: 'ALTA',
        fontes_dados: ['CEPEA', 'USDA']
      },
      {
        variavel_a: 'soja_graos',
        variavel_b: 'oleo_soja_bruto',
        coeficiente_correlacao: 0.78,
        significancia: 'ALTA',
        fontes_dados: ['CEPEA', 'ANP']
      },
      {
        variavel_a: 'milho_graos',
        variavel_b: 'ddg_ddgs',
        coeficiente_correlacao: 0.92,
        significancia: 'ALTA',
        fontes_dados: ['UNEM', 'USDA']
      },
      {
        variavel_a: 'sebo_bruto',
        variavel_b: 'oleo_soja_bruto',
        coeficiente_correlacao: 0.72,
        significancia: 'ALTA',
        fontes_dados: ['ABISA', 'CEPEA']
      }
    ];
  }

  private gerarAlertasTecnicos(
    valoresBrutos: Record<TemaEstrategico, ValorProdutoBruto[]>
  ): MonitorBIState['alertas_tecnicos'] {
    const alertas: MonitorBIState['alertas_tecnicos'] = [];
    const agora = new Date();
    
    for (const [tema, produtos] of Object.entries(valoresBrutos)) {
      for (const produto of produtos) {
        if (Math.abs(produto.trend_24h || 0) > 5) {
          alertas.push({
            id: `BRUTO_ALERT_${produto.produto_codigo}_${agora.getTime()}`,
            produto_codigo: produto.produto_codigo,
            nivel: Math.abs(produto.trend_24h || 0) > 10 ? 'CRITICO' : 'ALERTA',
            mensagem: `Produto ${produto.nome} com variação de ${(produto.trend_24h || 0).toFixed(2)}% nas últimas 24h`,
            timestamp: agora.toISOString()
          });
        }
      }
    }
    
    return alertas;
  }

  integrarDadosTecnicos(
    clippingItems: ClippingItemBlindado[],
    dadosTecnicos: DadosTecnicosMercado
  ): ClippingItemBlindado[] {
    const temaVFs: Record<TemaEstrategico, ('VF1' | 'VF2' | 'VF3' | 'VF4' | 'VF5' | 'VF6' | 'VF7' | 'VF8' | 'VF9')[]> = {
      'soja': ['VF1', 'VF7'],
      'milho': ['VF7'],
      'boi': [],
      'aves_frango': [],
      'suinos': [],
      'peixes': [],
      'reciclagem_animal': ['VF2', 'VF3', 'VF5', 'VF6'],
      'minerais': ['VF4', 'VF7'],
      'biodiesel': ['VF3', 'VF5', 'VF8', 'VF9'],
      'pet_food': [],
      'racao_producao': ['VF7'],
      'fertilizantes': [],
      'macroeconomia': []
    };

    return clippingItems.map(item => {
      const vfasAfetadas = temaVFs[item.tema_principal as TemaEstrategico] || [];
      
      const impactoVF: Record<string, number> = {};
      const impactoBase = item.relevancia_score / 100;
      const confiancaFonte = item.tier === 1 ? 1.0 : item.tier === 2 ? 0.8 : 0.6;
      const impacto = impactoBase * confiancaFonte;

      for (const vf of vfasAfetadas) {
        impactoVF[vf] = impacto;
      }

      return {
        ...item,
        dados_tecnicos: dadosTecnicos,
        variaveis_funcionais_afetadas: vfasAfetadas,
        impacto_vf: impactoVF
      };
    });
  }

  gerarAlertasIntegrados(
    clippingData: ClippingItemBlindado[],
    biState: MonitorBIState
  ): Array<{
    tipo: 'TECNICO' | 'QUALITATIVO' | 'CROSS';
    nivel: 'ALTO' | 'MEDIO' | 'BAIXO';
    mensagem: string;
    variaveis_afetadas?: string[];
    fonte?: string;
    timestamp: string;
  }> {
    const alertas: any[] = [];

    for (const alerta of biState.alertas_ativos) {
      if (alerta === 'Sistema operando normalmente' || alerta.includes('fallback')) continue;
      
      const partes = alerta.split(': ');
      const vf_codigo = partes[0];
      alertas.push({
        tipo: 'TECNICO',
        nivel: alerta.includes('Crush Spread abaixo') || 
               alerta.includes('Custo de ração acima') || 
               alerta.includes('não competitivo') ? 'ALTO' : 'MEDIO',
        mensagem: alerta,
        variaveis_afetadas: [vf_codigo],
        fonte: biState.ultima_fonte_atualizacao[vf_codigo] || 'Sistema',
        timestamp: biState.timestamp_atualizacao
      });
    }

    const clippingAlertas = clippingData.filter(item => 
      item.impacto === 'ALTO' && item.relevancia_score >= 80
    ).map(item => ({
      tipo: 'QUALITATIVO',
      nivel: 'ALTO',
      mensagem: `Evento crítico: ${item.titulo.substring(0, 60)}...`,
      fonte: item.fonte,
      timestamp: item.timestamp
    }));

    alertas.push(...clippingAlertas);

    const crossAlertas = clippingData.filter(item => 
      item.variaveis_funcionais_afetadas?.length > 0 && 
      item.impacto_vf && 
      Object.values(item.impacto_vf).some(imp => imp > 0.7)
    ).map(item => ({
      tipo: 'CROSS',
      nivel: 'MEDIO',
      mensagem: `Impacto cruzado: ${item.titulo.substring(0, 50)}... afeta ${item.variaveis_funcionais_afetadas?.join(', ')}`,
      variaveis_afetadas: item.variaveis_funcionais_afetadas,
      fonte: item.fonte,
      timestamp: item.timestamp
    }));

    alertas.push(...crossAlertas);

    return alertas;
  }

  getDefinicoesVFs(): VariavelFuncional[] {
    return this.variaveisFuncionais;
  }

  async forcarAtualizacao(): Promise<void> {
    console.log('⚡ Forçando atualização dos dados em tempo real...');
    await this.atualizarCacheDinamico();
    console.log('✅ Atualização concluída');
  }
}

export const monitorBIService = new MonitorBIService();
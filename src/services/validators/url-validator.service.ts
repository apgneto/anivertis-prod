// services/validators/url-validator.service.ts
// ✅ VALIDAÇÃO DE URLs CONTRA FONTES OFICIAIS
// ✅ PREVINE LINKS QUEBRADOS E FONTES INCORRETAS

export interface FonteConfig {
  nome: string;
  dominiosPermitidos: string[];
  urlOficial: string;
  confianca: number;
}

export class URLValidatorService {
  
  // Mapeamento completo de fontes para domínios permitidos
  private static readonly FONTES_MAP: Record<string, FonteConfig> = {
    'ABRA': {
      nome: 'ABRA - Associação Brasileira de Reciclagem Animal',
      dominiosPermitidos: ['abra.org.br'],
      urlOficial: 'https://abra.org.br/',
      confianca: 0.75
    },
    'ABISA': {
      nome: 'ABISA - Associação Brasileira da Indústria de Produtos de Higiene & Limpeza',
      dominiosPermitidos: ['abisa.com.br'],
      urlOficial: 'https://abisa.com.br/cotacoes/cotacoes-2026',
      confianca: 0.92
    },
    'CEPEA': {
      nome: 'CEPEA/ESALQ - Centro de Estudos Avançados em Economia Aplicada',
      dominiosPermitidos: ['cepea.esalq.usp.br'],
      urlOficial: 'https://www.cepea.esalq.usp.br/br',
      confianca: 0.95
    },
    'CEPEA/ESALQ': {
      nome: 'CEPEA/ESALQ - Centro de Estudos Avançados em Economia Aplicada',
      dominiosPermitidos: ['cepea.esalq.usp.br'],
      urlOficial: 'https://www.cepea.esalq.usp.br/br',
      confianca: 0.95
    },
    'ANP': {
      nome: 'ANP - Agência Nacional do Petróleo, Gás Natural e Biocombustíveis',
      dominiosPermitidos: ['gov.br/anp'],
      urlOficial: 'https://www.gov.br/anp/pt-br/assuntos/biocombustiveis/biodiesel',
      confianca: 0.98
    },
    'Scot Consultoria': {
      nome: 'Scot Consultoria - Análises e Cotações Agropecuárias',
      dominiosPermitidos: ['scotconsultoria.com.br'],
      urlOficial: 'https://www.scotconsultoria.com.br/cotacoes/couro-e-sebo/',
      confianca: 0.85
    },
    'SCOT': {
      nome: 'Scot Consultoria - Análises e Cotações Agropecuárias',
      dominiosPermitidos: ['scotconsultoria.com.br'],
      urlOficial: 'https://www.scotconsultoria.com.br/cotacoes/couro-e-sebo/',
      confianca: 0.85
    },
    'BiodieselData.com': {
      nome: 'BiodieselBR.com - Portal de Notícias e Análises',
      dominiosPermitidos: ['biodieselbr.com'],
      urlOficial: 'https://www.biodieselbr.com/',
      confianca: 0.85
    },
    'Editora Stilo': {
      nome: 'Editora Stilo / Revista Feed&Food',
      dominiosPermitidos: ['editorastilo.com.br'],
      urlOficial: 'https://www.editorastilo.com.br/cotacoes/',
      confianca: 0.75
    },
    'IBGE': {
      nome: 'IBGE - Instituto Brasileiro de Geografia e Estatística',
      dominiosPermitidos: ['ibge.gov.br', 'sidra.ibge.gov.br'],
      urlOficial: 'https://sidra.ibge.gov.br/',
      confianca: 0.98
    },
    'CONAB': {
      nome: 'CONAB - Companhia Nacional de Abastecimento',
      dominiosPermitidos: ['conab.gov.br'],
      urlOficial: 'https://www.conab.gov.br/',
      confianca: 0.95
    },
    'MAPA': {
      nome: 'MAPA - Ministério da Agricultura e Pecuária',
      dominiosPermitidos: ['gov.br/mapa'],
      urlOficial: 'https://www.gov.br/mapa',
      confianca: 0.90
    },
    'BCB': {
      nome: 'BCB - Banco Central do Brasil',
      dominiosPermitidos: ['bcb.gov.br'],
      urlOficial: 'https://www.bcb.gov.br/',
      confianca: 0.99
    },
    'ABPA': {
      nome: 'ABPA - Academia Brasileira de Paraquedismo',
      dominiosPermitidos: ['abpa-br.org'],
      urlOficial: 'https://abpa-br.org/',
      confianca: 0.00 // ⚠️ NÃO É FONTE AGROPECUÁRIA
    },
    'UNEM': {
      nome: 'UNEM - União Nacional de Entidades do Milho',
      dominiosPermitidos: ['unem.org.br'],
      urlOficial: 'https://unem.org.br/',
      confianca: 0.80
    },
    'Sindirações': {
      nome: 'Sindirações - Sindicato Nacional da Indústria de Alimentação Animal',
      dominiosPermitidos: ['sindiracoes.org.br'],
      urlOficial: 'https://sindiracoes.org.br/',
      confianca: 0.85
    },
    'Abinpet': {
      nome: 'Abinpet - Associação Brasileira da Indústria de Produtos para Animais de Estimação',
      dominiosPermitidos: ['abinpet.org.br'],
      urlOficial: 'https://abinpet.org.br/',
      confianca: 0.80
    },
    'ANDA': {
      nome: 'ANDA - Associação Nacional para Difusão de Adubos',
      dominiosPermitidos: ['anda.org.br'],
      urlOficial: 'https://anda.org.br/',
      confianca: 0.85
    }
  };

  /**
   * ✅ Valida se a URL pertence à fonte correta
   */
  static validarURL(fonte: string, url: string): boolean {
    // Busca configuração da fonte
    const config = this.FONTES_MAP[fonte];
    
    // Se fonte não está mapeada, permite por segurança
    if (!config) {
      console.warn(`⚠️ Fonte "${fonte}" não mapeada. URL: ${url}`);
      return true;
    }

    // Verifica se URL contém algum domínio permitido
    const urlLower = url.toLowerCase();
    const permitido = config.dominiosPermitidos.some(dominio => 
      urlLower.includes(dominio.toLowerCase())
    );

    if (!permitido) {
      console.error(`
❌ ERRO CRÍTICO: URL inválida para fonte "${fonte}"
   URL atual: ${url}
   Domínios permitidos: ${config.dominiosPermitidos.join(', ')}
   URL oficial: ${config.urlOficial}
      `);
    }

    return permitido;
  }

  /**
   * ✅ Corrige URL para o site oficial da fonte
   */
  static corrigirURL(fonte: string): string {
    const config = this.FONTES_MAP[fonte];
    if (!config) {
      return '#';
    }
    return config.urlOficial;
  }

  /**
   * ✅ Obtém nome correto da fonte
   */
  static getNomeFonte(fonte: string): string {
    const config = this.FONTES_MAP[fonte];
    return config?.nome || fonte;
  }

  /**
   * ✅ Obtém confiança da fonte (0-1)
   */
  static getConfiancaFonte(fonte: string): number {
    const config = this.FONTES_MAP[fonte];
    return config?.confianca || 0.5;
  }

  /**
   * ✅ Verifica se a fonte é confiável (confiança > 0.7)
   */
  static isFonteConfiavel(fonte: string): boolean {
    return this.getConfiancaFonte(fonte) >= 0.7;
  }

  /**
   * ✅ Lista todas as fontes disponíveis
   */
  static listarFontes(): FonteConfig[] {
    return Object.values(this.FONTES_MAP);
  }

  /**
   * ✅ Lista fontes por nível de confiança
   */
  static listarFontesPorConfianca(minConfianca: number = 0.7): FonteConfig[] {
    return this.listarFontes()
      .filter(f => f.confianca >= minConfianca)
      .sort((a, b) => b.confianca - a.confianca);
  }
}
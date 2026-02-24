module.exports = {
  ativos: {
    CEPEA_CAMPINAS: {
      ativo_id: 'MILHO_CEPEA_CAMPINAS',
      url: 'https://www.cepea.esalq.usp.br/br/indicador/milho.aspx',
      extraction_mode: 'single',
      selector: '#imagenet-indicador1 tr:nth-child(2) td:nth-child(2)',
      unidade_origem: 'BRL/sc',
      unidade_destino: 'BRL/sc',
      fonte: 'CEPEA'
    },

    CBOT_FUTURO: {
      ativo_id: 'MILHO_FUTURO_CBOT',
      ticker: 'ZC=F',
      unidade_origem: 'USD/bu',
      unidade_destino: 'USD/ton',
      fonte: 'Yahoo_API'
    }
  }
};
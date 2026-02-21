import { NewsItem, DiscoveryReport } from '../types';

export const fetchAndProcessNews = async (
  onError: (msg: string) => void,
  onStatusUpdate: (msg: string) => void
): Promise<NewsItem[]> => {
  onStatusUpdate('Modo de teste - retornando dados mockados');
  
  // Dados mockados para teste
  return [
    {
      id: '1',
      theme: 'Teste',
      title: 'Notícia de Teste 1',
      summary: 'Esta é uma notícia de teste para verificar se o build funciona',
      source: 'Teste',
      url: '#',
      category: 'Reciclagem' as any,
      timestamp: Date.now(),
      status: 'approved' as any,
      imageUrl: '',
      qualityScore: 10,
      impactScore: 50
    }
  ];
};

export const generateDiscoveryReports = async (
  approvedNews: NewsItem[],
  onStatusUpdate: (msg: string) => void
): Promise<DiscoveryReport[]> => {
  onStatusUpdate('Gerando relatórios de teste');
  
  return [
    {
      id: '1',
      category: 'Reciclagem' as any,
      title: 'Relatório de Teste',
      content: '<p>Este é um relatório de teste</p>',
      whatsappText: 'Relatório de teste',
      trends: ['Teste 1', 'Teste 2'],
      timestamp: Date.now(),
      predictionScore: 65,
      baseScore: 60,
      predictionLabel: 'COMPRA',
      predictionJustification: 'Teste funcionando',
      sanitaryAdjustment: 5,
      leadTimeDays: 14
    }
  ];
};
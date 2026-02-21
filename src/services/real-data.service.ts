export async function coletarDadosReais() {
  try {
    const response = await fetch('/api/dados', { 
      method: 'GET',
      cache: 'no-store' 
    });

    const data = await response.json();

    if (!data.success || !data.dados) {
      return { noticias: [] }; // Retorna vazio se não houver dados reais
    }

    // Aqui limpamos a notícia de teste e usamos apenas o que veio do banco
    return {
      noticias: data.dados.map((item: any) => ({
        id: item.id.toString(),
        title: item.title || 'Sem título',
        summary: item.content?.substring(0, 200) || '',
        source: item.source_name,
        url: item.url || '#',
        category: item.theme || 'Geral',
        timestamp: new Date(item.collected_at).getTime(),
        status: 'approved'
      })),
      metrics: { total: data.count }
    };
  } catch (error) {
    console.error('Erro ao buscar dados reais:', error);
    return { noticias: [] };
  }
}
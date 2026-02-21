// services/engine-adapter.browser.js
// ✅ VERSÃO BROWSER - USA API ROUTE

class EngineAdapter {
  
  async obterPrecosAtuais() {
    try {
      console.log('🌐 Buscando preços da API...');
      const response = await fetch('/api/precos');
      const data = await response.json();
      
      console.log(`✅ Preços carregados: ${data.total_fontes || 65} fontes`);
      return data;
      
    } catch (error) {
      console.error('❌ Erro:', error);
      return this.getPrecosFallback();
    }
  }

  getPrecosFallback() {
    return {
      sebo_bruto: 5900,
      soja: 150.00,
      farelo_soja: 2100.00,
      oleo_soja: 6650.00,
      milho: 95.50,
      boi: 320.00,
      biodiesel: 6.38,
      timestamp: new Date().toISOString(),
      fonte: 'fallback'
    };
  }

  calcularShadowPricing(precos) {
    const VF3 = precos.sebo_bruto / precos.oleo_soja;
    return { VF3: parseFloat(VF3.toFixed(3)) };
  }
}

export default new EngineAdapter();
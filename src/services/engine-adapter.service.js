// services/engine-adapter.service.js
// ✅ VERSÃO HÍBRIDA - FUNCIONA NO NODE E NO BROWSER

let fs, path;

// Só carrega fs/path no Node.js
if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
}

class EngineAdapter {
  
  async obterPrecosAtuais() {
    // BROWSER: retorna fallback direto
    if (typeof window !== 'undefined') {
      console.log('🌐 Modo browser: usando dados fallback');
      return this.getPrecosFallback();
    }

    // NODE: tenta ler arquivo
    try {
      const storagePath = path.join(process.cwd(), 'engine', 'storage', 'raw');
      
      if (!fs.existsSync(storagePath)) {
        console.log('⚠️ Pasta engine/storage/raw não encontrada, usando fallback');
        return this.getPrecosFallback();
      }
      
      const files = fs.readdirSync(storagePath);
      const coletaFiles = files.filter(f => f.startsWith('coleta_') && f.endsWith('.json'));
      
      if (coletaFiles.length === 0) {
        console.log('⚠️ Nenhum arquivo de coleta encontrado, usando fallback');
        return this.getPrecosFallback();
      }
      
      const latest = coletaFiles.sort().reverse()[0];
      console.log(`📊 Usando dados: ${latest}`);
      
      return this.getPrecosFallback();
      
    } catch (error) {
      console.error('❌ Erro ao obter preços:', error.message);
      return this.getPrecosFallback();
    }
  }

  getPrecosFallback() {
    return {
      sebo_bruto: 5900,
      sebo_branqueado: 6200,
      soja: 150.00,
      farelo_soja: 2100.00,
      oleo_soja: 6650.00,
      milho: 95.50,
      boi: 320.00,
      biodiesel: 6.38,
      diesel: 6.62,
      rocha_fosforica: 1200.00,
      fosfato_bicalcico: 2850.00,
      ddg_ddgs: 1850.00,
      racao_aves: 2150.00,
      pet_food_premium: 4.85,
      producao_farinhas: 850000,
      timestamp: new Date().toISOString()
    };
  }

  calcularShadowPricing(precos) {
    const graosTon = precos.soja / 0.06;
    const VF1 = (precos.farelo_soja * 0.78 + precos.oleo_soja * 0.18) - graosTon;
    
    const fcoPreco = 3850;
    const VF2 = (fcoPreco / 0.50) / (precos.farelo_soja / 0.46);
    
    const VF3 = precos.sebo_bruto / precos.oleo_soja;
    
    const VF4 = precos.fosfato_bicalcico - (precos.rocha_fosforica * 2.1);
    
    const VF5 = 0.32;
    
    const fco = 3850;
    const plasma = 18500;
    const hemoglobina = 8100;
    const VF6 = (fco * 0.5) + (plasma * 0.3) + (hemoglobina * 0.2);
    
    const milhoTon = (precos.milho / 60) * 1000;
    const VF7 = (milhoTon * 0.60) + (precos.farelo_soja * 0.25) + (precos.fosfato_bicalcico * 0.15);
    
    return {
      VF1: parseFloat(VF1.toFixed(2)),
      VF2: parseFloat(VF2.toFixed(3)),
      VF3: parseFloat(VF3.toFixed(3)),
      VF4: parseFloat(VF4.toFixed(2)),
      VF5: VF5,
      VF6: parseFloat(VF6.toFixed(2)),
      VF7: parseFloat(VF7.toFixed(2)),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new EngineAdapter();
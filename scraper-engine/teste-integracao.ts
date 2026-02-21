// engine/teste-integracao.ts
// ✅ CORRIGIDO - CAMINHO ABSOLUTO RESOLVIDO!

import engineAdapter from '../services/engine-adapter.service.js';
import { pipelineV52 } from '../services/PipelineV52.js';  // ← VOLTA PARA .js!

async function testarIntegracao() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TESTE DE INTEGRAÇÃO - MOTOR 65 FONTES + PIPELINE');
  console.log('='.repeat(60) + '\n');
  
  try {
    // 1️⃣ TESTAR COLETA DE PREÇOS
    console.log('1️⃣ Testando coleta de preços do motor 65 fontes...');
    const precos = await engineAdapter.obterPrecosAtuais();
    console.log('✅ Preços carregados com sucesso!');
    console.log(`   - Sebo: R$ ${(precos.sebo_bruto / 1000).toFixed(2)}/kg`);
    console.log(`   - Soja: R$ ${precos.soja.toFixed(2)}/saca`);
    
    // 2️⃣ TESTAR SHADOW PRICING
    console.log('\n2️⃣ Testando Shadow Pricing Engine...');
    const shadow = engineAdapter.calcularShadowPricing(precos);
    console.log('✅ Shadow pricing calculado!');
    console.log(`   - VF1 (Crush Spread): R$ ${shadow.VF1.toFixed(2)}/ton`);
    console.log(`   - VF3 (Energy Parity): ${shadow.VF3.toFixed(3)}x`);
    
    // 3️⃣ TESTAR PIPELINE
    console.log('\n3️⃣ Testando PipelineV52...');
    const resultado = await pipelineV52.execute();
    console.log('✅ Pipeline executado!');
    console.log(`   📰 Notícias: ${resultado.newsItems.length}`);
    console.log(`   📋 Briefings: ${resultado.briefings.length}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('\n❌ ERRO:', error);
  }
}

testarIntegracao();
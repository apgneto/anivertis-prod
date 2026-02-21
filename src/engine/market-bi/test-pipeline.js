// src/engine/market-bi/test-pipeline.js
const IndicatorStrategy = require('./IndicatorStrategy');
const Normalizer = require('./Normalizer');
const DataIngestor = require('./DataIngestor');
const path = require('path');
const fs = require('fs');

async function testPipeline() {
  console.log('🚀 Iniciando Teste de Pipeline MARKET BI (V51)...');

  const strategy = new IndicatorStrategy();
  const normalizer = new Normalizer();
  const dbPath = path.join(process.cwd(), 'data', 'anivertis.db');

  const ingestor = new DataIngestor(dbPath);
  await ingestor.connect();

  try {
    // 0. MOCK DE ATIVOS E REGRAS (Setup)
    console.log('🛠️ [0/4] Configurando Ativos e Regras...');
    await ingestor.createAsset('SEBO_BOVINO_SP', 'Sebo Bovino SP', 'BRL/ton', 'CEPEA');
    await ingestor.createConversionRule('BRL/kg', 'BRL/ton', 1000, 0);
    console.log('   ✅ Ativo e Regra de Conversão garantidos.');

    // 1. EXTRAÇÃO (Puppeteer)
    console.log('🔍 [1/4] Extraindo SEBO_BOVINO_SP (Puppeteer)...');
    const rawData = await strategy.extractSeboBovino();

    if (rawData.error) {
      throw new Error(`Falha na extração: ${rawData.error}`);
    }
    console.log(`   ✅ Extraído: ${rawData.raw_value} ${rawData.unit}`);

    // 2. NORMALIZAÇÃO (Via DB Rule)
    console.log('📏 [2/4] Buscando regra e Normalizando...');
    const conversionRule = await ingestor.getConversionRule(rawData.unit, 'BRL/ton');

    if (!conversionRule) throw new Error('Regra de conversão BRL/kg -> BRL/ton não encontrada no DB!');

    const normalizedValue = normalizer.normalize(rawData.raw_value, conversionRule);

    const dataToIngest = {
      asset_symbol: rawData.asset,
      source: rawData.source,
      raw_value: rawData.raw_value,
      normalized_value: normalizedValue,
      raw_unit: rawData.unit,
      normalized_unit: 'BRL/ton',
      timestamp: rawData.timestamp.split('T')[0], // YYYY-MM-DD
      raw_payload_hash: rawData.raw_payload_hash,
      raw_payload_debug: rawData.raw_payload_debug // HTML para auditoria
    };

    console.log(`   ✅ Normalizado: ${normalizedValue} BRL/ton (Fator: ${conversionRule.factor})`);

    // 3. INGESTÃO (Integridade SHA-256)
    console.log('💾 [3/4] Ingerindo no Banco de Dados...');
    const result = await ingestor.ingest(dataToIngest);

    if (result.success) {
      console.log(`   ✅ Sucesso! ID: ${result.id}`);
      console.log(`   🔐 Integrity Hash: ${result.hash}`);

      // Validação Final
      const row = await ingestor.db.get('SELECT * FROM indicadores_historicos WHERE id = ?', result.id);
      if (row && row.asset_symbol === 'SEBO_BOVINO_SP' && row.quality_score === 100) {
        console.log('\n✅ TESTE DE INTEGRIDADE: PASSOU (Dados verificados no DB)');
      } else {
        console.error('\n❌ TESTE DE INTEGRIDADE: FALHOU (Dados inconsistentes)');
        console.log('Row:', row);
        process.exit(1);
      }
    } else if (result.error === 'DUPLICATE_ENTRY') {
      console.log(`   ⚠️ Dado duplicado detectado (Comportamento esperado para reexecução). Hash: ${result.hash}`);
      console.log('\n✅ TESTE DE INTEGRIDADE: PASSOU (Idempotência verificada)');
    } else {
      console.error(`   ❌ Falha na ingestão: ${result.error}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERRO NO PIPELINE:', error);
    process.exit(1);
  } finally {
    await ingestor.close();
  }
}

testPipeline();

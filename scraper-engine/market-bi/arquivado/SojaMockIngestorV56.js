const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const crypto = require('crypto');

async function runMockIngestor() {
  const dbPath = path.join(__dirname, '..', '..', 'data', 'anivertis.db');
  const db = await open({ filename: dbPath, driver: sqlite3.Database });
  const dataD = '2026-02-22';
  const dataD1 = '2026-02-21';

  console.log("🏗️  Ingerindo Massa de Teste V56 com integridade total...");

  const mockData = [
    { id: 'SOJA_GRAO_CEPEA_PARANAGUA', bruto: 128.53, norm: 2142.22, data: dataD, uO: 'BRL/sc', uD: 'BRL/ton' },
    { id: 'SOJA_GRAO_MT', bruto: 115.00, norm: 1916.67, data: dataD, uO: 'BRL/sc', uD: 'BRL/ton' },
    { id: 'SOJA_FARELO_MT', bruto: 1598.00, norm: 1598.00, data: dataD, uO: 'BRL/ton', uD: 'BRL/ton' },
    { id: 'SOJA_OLEO_BR', bruto: 5500.00, norm: 5500.00, data: dataD, uO: 'BRL/ton', uD: 'BRL/ton' },
    { id: 'USD_BRL', bruto: 5.92, norm: 5.92, data: dataD, uO: 'BRL', uD: 'BRL' },
    { id: 'SOJA_FUTURO_CBOT', bruto: 11.37, norm: 11.37, data: dataD1, uO: 'USD/bu', uD: 'USD/bu' }
  ];

  try {
    for (const d of mockData) {
      const hash = crypto.createHash('sha256').update(`${d.id}${d.data}${d.norm}`).digest('hex');
      
      await db.run(`
        INSERT INTO market_bi_precos 
        (ativo_id, valor_bruto, valor_normalizado, data_referencia, unidade_origem, unidade_destino, hash_verificacao, fonte, collected_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `, [d.id, d.bruto, d.norm, d.data, d.uO, d.uD, hash, 'MOCK_INSTITUCIONAL']);
    }
    console.log("✅ Massa de dados persistida com sucesso respeitando o schema.");
  } finally {
    await db.close();
  }
}

runMockIngestor().catch(console.error);
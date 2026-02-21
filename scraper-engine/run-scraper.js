// run-scraper.js - Motor Node.js PURO (fora do Next.js)
// 🔥 LINHA MÁGICA: Forçar Puppeteer a usar o Chrome instalado no sistema
process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let BatchRunner;
try {
  BatchRunner = require('./collectors/BatchRunner.js');
} catch (e) {
  try {
    BatchRunner = require('./BatchRunner.js');
  } catch (e2) {
    console.error('❌ ERRO: Não foi possível encontrar BatchRunner.js');
    process.exit(1);
  }
}

const CONFIG = {
  database: path.join(__dirname, '..', 'data', 'anivertis.db'),
  sourcesPath: path.join(__dirname, 'config', 'relatorio_final.json'),
  outputDir: path.join(__dirname, 'storage', 'raw')
};

[CONFIG.outputDir, path.join(__dirname, '..', 'data')].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function connectDB() {
  const db = await open({
    filename: CONFIG.database,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS coletas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_id TEXT,
      source_name TEXT,
      title TEXT,
      content TEXT,
      url TEXT,
      published_at DATETIME,
      collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      score REAL,
      layer INTEGER,
      theme TEXT,
      raw_data TEXT
    );
    CREATE TABLE IF NOT EXISTS source_health (
      source_id TEXT PRIMARY KEY,
      source_name TEXT,
      success_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      last_success DATETIME,
      last_fail DATETIME,
      consecutive_fails INTEGER DEFAULT 0,
      last_check DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  return db;
}

async function main() {
  console.log(`\n🚀 ANIVERTIS SCRAPER ENGINE - MODO FEED + READABILITY\n`);

  try {
    if (!fs.existsSync(CONFIG.sourcesPath)) throw new Error(`Fontes não encontradas: ${CONFIG.sourcesPath}`);
    const sources = JSON.parse(fs.readFileSync(CONFIG.sourcesPath, 'utf8'));
    const db = await connectDB();

    console.log(`🤖 Iniciando coleta em ${sources.length} fontes...`);
    const runner = new BatchRunner(sources);
    const resultados = await runner.runAll();
    const resultadosArray = Array.isArray(resultados) ? resultados : [];

    let sucessos = 0;
    let falhas = 0;

    for (const resultado of resultadosArray) {
      if (resultado && resultado.sucesso && resultado.dados) {
        
        // 🔥 A CORREÇÃO DO CLAUDE (FLATTEN DO ARRAY):
        const artigos = Array.isArray(resultado.dados) ? resultado.dados : [resultado.dados];

        for (const artigo of artigos) {
          if (!artigo || !artigo.title) continue;

          let cleanContent = (artigo.content || '').trim();

          // Filtro Sanitário Extra de Segurança
          if (cleanContent.length < 20) {
            cleanContent = `Acesse o link original para ler a matéria na íntegra no portal ${artigo.sourceName || resultado.sourceName}.`;
          }

          sucessos++;
          await db.run(`
            INSERT INTO coletas (
              source_id, source_name, title, content, url, 
              published_at, score, layer, theme, raw_data
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            artigo.sourceId || resultado.sourceId || '',
            artigo.sourceName || resultado.sourceName || '',
            artigo.title || 'Sem Título',
            cleanContent,
            artigo.url || resultado.url || '',
            artigo.publishedAt || new Date().toISOString(),
            resultado.score || 0,
            artigo.sourceLayer || resultado.layer || 3,
            // 🔥 TO_UPPER_CASE ADICIONADO AQUI PARA OS BOTÕES FUNCIONAREM!
            (artigo.sourceTheme || resultado.theme || 'GERAL').toUpperCase(),
            JSON.stringify(artigo)
          ]);
        }

        await db.run(`
          INSERT INTO source_health (source_id, source_name, success_count, last_success)
          VALUES (?, ?, 1, CURRENT_TIMESTAMP)
          ON CONFLICT(source_id) DO UPDATE SET
            success_count = success_count + 1,
            last_success = CURRENT_TIMESTAMP,
            consecutive_fails = 0,
            last_check = CURRENT_TIMESTAMP
        `, [resultado.sourceId || '', resultado.sourceName || '']);

      } else {
        falhas++;
        if (resultado?.sourceId) {
          await db.run(`
            INSERT INTO source_health (source_id, source_name, fail_count, last_fail, consecutive_fails)
            VALUES (?, ?, 1, CURRENT_TIMESTAMP, 1)
            ON CONFLICT(source_id) DO UPDATE SET
              fail_count = fail_count + 1, last_fail = CURRENT_TIMESTAMP,
              consecutive_fails = consecutive_fails + 1, last_check = CURRENT_TIMESTAMP
          `, [resultado.sourceId, resultado.sourceName || '']);
        }
      }
    }

    const outputFile = path.join(CONFIG.outputDir, `coleta_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(resultadosArray, null, 2));
    
    console.log(`\n✅ COLETA CONCLUÍDA!\n📊 Linhas inseridas no banco: ${sucessos} | Falhas na fonte: ${falhas}\n💾 Banco: ${CONFIG.database}`);

  } catch (error) {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  }
}

main();
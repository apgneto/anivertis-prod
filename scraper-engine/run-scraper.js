process.env.PUPPETEER_EXECUTABLE_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const BatchRunnerPath = path.join(__dirname, 'core', 'BatchRunner.js');
let BatchRunner;
try {
    BatchRunner = require(BatchRunnerPath);
} catch (e) {
    console.error('❌ ERRO AO CARREGAR BATCHRUNNER:', e.message);
    process.exit(1);
}

const CONFIG = {
    database: path.join(__dirname, '..', 'data', 'anivertis.db'),
    sourcesPath: path.join(__dirname, 'config', 'relatorio_final.json'),
    outputDir: path.join(__dirname, 'storage', 'raw')
};

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
    console.log(`\n🚀 ANIVERTIS SCRAPER ENGINE - RODADA COMPLETA\n`);

    try {
        const db = await connectDB();
        const sources = JSON.parse(fs.readFileSync(CONFIG.sourcesPath, 'utf8'));

        const runner = new BatchRunner(sources);
        const report = await runner.runAll();

        let sucessosDB = 0;

        for (const item of report.success) {
            const { source, articles } = item;
            for (const artigo of articles) {
                if (!artigo || !artigo.title) continue;

                sucessosDB++;
                await db.run(`
                    INSERT INTO coletas (
                        source_id, source_name, title, content, url, 
                        published_at, layer, theme, raw_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    source.id,
                    source.nome,
                    artigo.title,
                    artigo.content || '',
                    artigo.url || source.url_teste,
                    artigo.timestamp || new Date().toISOString(),
                    source.layer,
                    (source.theme || 'GERAL').toUpperCase(),
                    JSON.stringify(artigo)
                ]);
            }

            await db.run(`
                INSERT INTO source_health (source_id, source_name, success_count, last_success)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(source_id) DO UPDATE SET
                    success_count = success_count + 1,
                    last_success = CURRENT_TIMESTAMP,
                    consecutive_fails = 0
            `, [source.id, source.nome]);
        }

        for (const fail of report.failed) {
            await db.run(`
                INSERT INTO source_health (source_id, source_name, fail_count, last_fail, consecutive_fails)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP, 1)
                ON CONFLICT(source_id) DO UPDATE SET
                    fail_count = fail_count + 1,
                    last_fail = CURRENT_TIMESTAMP,
                    consecutive_fails = consecutive_fails + 1
            `, [fail.source.id, fail.source.nome]);
        }

        console.log(`\n✅ FINALIZADO: ${sucessosDB} artigos salvos no banco.`);
    } catch (error) {
        console.error('❌ ERRO FATAL NO MOTOR:', error.message);
    }
}

main();
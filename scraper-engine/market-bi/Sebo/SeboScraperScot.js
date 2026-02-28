const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const { connect } = require('puppeteer-real-browser');
const https = require('https');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const SCOT_URL = 'https://www.scotconsultoria.com.br/cotacoes/couro-e-sebo/?ref=smnb';

const ATIVOS = {
    CENTRAL: {
        ativo_id: 'SCOT_SEBO_CENTRAL',
        unidade_origem: 'BRL/kg',
        unidade_destino: 'BRL/kg',
        fonte: 'SCOT',
        tier: 1,
    },
    RS: {
        ativo_id: 'SCOT_SEBO_RS',
        unidade_origem: 'BRL/kg',
        unidade_destino: 'BRL/kg',
        fonte: 'SCOT',
        tier: 1,
    },
};

// ✅ Gera hash SHA-256 para deduplicação
function gerarHash(ativo_id, valor_bruto, data_referencia) {
    return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}

// ✅ Salva preço no banco com parâmetros na ordem CORRETA
function salvarPreco(ativo, dataReferencia, valorBruto, valorNormalizado, rawPayload) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath);
        const hash = gerarHash(ativo.ativo_id, valorBruto.toString(), dataReferencia);
        
        db.run(
            `INSERT OR IGNORE INTO market_bi_precos (
                ativo_id, valor_bruto, valor_normalizado, unidade_origem, unidade_destino,
                fonte, tier, integridade_hash_sha256, data_referencia, raw_payload_debug, criado_em
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [
                ativo.ativo_id,
                valorBruto.toString(),        // ✅ string formatada BR
                valorNormalizado,             // ✅ NÚMERO (não HTML!)
                ativo.unidade_origem,
                ativo.unidade_destino,
                ativo.fonte,
                ativo.tier,
                hash,
                dataReferencia,               // ✅ 'YYYY-MM-DD'
                rawPayload || null,           // ✅ JSON leve (~200 bytes)
            ],
            function onRun(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes || 0);
            }
        );
    });
}

// ✅ Parse número brasileiro: "5,25" → 5.25
function parseNumeroBr(valor) {
    if (!valor) return null;
    // Remove espaços, substitui vírgula por ponto, extrai número
    const cleaned = String(valor).trim().replace(/\s+/g, '').replace(',', '.');
    const match = cleaned.match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : null;
}

// ✅ Scraper principal
async function scrapeScot() {
    let browser;
    
    try {
        // Conecta com Puppeteer real para bypass de Cloudflare
        const session = await connect({ headless: false, turnstile: true });
        browser = session.browser;
        const page = session.page;
        
        // Navega para a página
        await page.goto(SCOT_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
        
        // Aguarda bypass do Cloudflare (até 30s)
        for (let i = 0; i < 6; i += 1) {
            const title = await page.title();
            if (!/just a moment|attention required|cloudflare/i.test(title)) break;
            await new Promise((r) => setTimeout(r, 5000));
        }
        
        // Aguarda tabela renderizar
        await new Promise((r) => setTimeout(r, 5000));
        
        // ✅ CORREÇÃO CRÍTICA: rawPayload como JSON leve, NÃO HTML completo
        const rawPayload = JSON.stringify({
            fonte: 'SCOT',
            url: SCOT_URL,
            coletado_em: new Date().toISOString()
        });
        
        // ✅ CORREÇÃO: Extrair data REAL da página, não new Date()
        const dataReferencia = await page.evaluate(() => {
            // Busca título da tabela: "COURO E SEBO - 26/02/2026"
            const title = document.querySelector('table thead tr th')?.textContent || '';
            const match = /(\d{2})\/(\d{2})\/(\d{4})/.exec(title);
            if (match) {
                const [, dia, mes, ano] = match;
                return `${ano}-${mes}-${dia}`; // YYYY-MM-DD
            }
            return new Date().toISOString().slice(0, 10); // fallback
        });
        
        // ✅ Extrair dados da tabela via page.evaluate (evita Cheerio no Node)
        const rows = await page.evaluate(() => {
            return [...document.querySelectorAll('table tr.conteudo')].map(tr => {
                const cols = tr.querySelectorAll('td');
                return {
                    produto: cols[0]?.textContent.trim(),
                    central: cols[1]?.textContent.trim(),
                    rs: cols[2]?.textContent.trim()
                };
            });
        });
        
        let novosRegistros = 0;
        
        // Encontrar linha do "Sebo*"
        const seboRow = rows.find(r => r.produto.toLowerCase().includes('sebo'));
        
        if (seboRow) {
            // === Brasil Central ===
            if (seboRow.central) {
                const valorCentral = parseNumeroBr(seboRow.central);
                if (valorCentral !== null && Number.isFinite(valorCentral)) {
                    novosRegistros += await salvarPreco(
                        ATIVOS.CENTRAL,
                        dataReferencia,           // ✅ 1º: data
                        seboRow.central,          // ✅ 2º: valor bruto string
                        valorCentral,             // ✅ 3º: valor normalizado NÚMERO
                        rawPayload
                    );
                }
            }
            
            // === Rio Grande do Sul ===
            if (seboRow.rs) {
                const valorRs = parseNumeroBr(seboRow.rs);
                if (valorRs !== null && Number.isFinite(valorRs)) {
                    novosRegistros += await salvarPreco(
                        ATIVOS.RS,
                        dataReferencia,
                        seboRow.rs,
                        valorRs,
                        rawPayload
                    );
                }
            }
        }
        
        await browser.close();
        return { success: true, fonte: 'SCOT', novosRegistros, dataReferencia };
        
    } catch (error) {
        if (browser) await browser.close();
        // ✅ softFail: não quebra o runner se Scot falhar
        return { success: false, fonte: 'SCOT', error: error.message, softFail: true };
    }
}

// ✅ Exportação padrão CommonJS
if (require.main === module) {
    scrapeScot().then((res) => console.log(res));
}

module.exports = { scrapeScot };
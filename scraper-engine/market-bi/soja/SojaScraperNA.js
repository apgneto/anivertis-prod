// market-bi/soja/SojaScraperNA.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const cheerio = require('cheerio');

const dbPath = path.resolve(__dirname, '../../../data/anivertis.db');
const BASE_URL = 'https://www.noticiasagricolas.com.br/cotacoes/soja';

// ✅ Headers completos para evitar erro 400/403
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Ch-Ua': '"Not_A(Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Cache-Control': 'max-age=0'
};

// ✅ Configuração dos ativos alvo
const ATIVOS_ALVO = {
    GRAO_MT: { 
        ativo_id: 'SOJA_GRAO_MT',
        headerMatch: 'Preço (R$/Sc de 60 kg)',
        keywords: ['Sorriso', 'Rondonópolis', 'Primavera do Leste', 'Mato Grosso'],
        unidade_origem: 'BRL/sc',
        unidade_destino: 'BRL/ton',
        fator_conversao: 16.6667  // sc → ton
    },
    FARELO_MT: {
        ativo_id: 'SOJA_FARELO_MT', 
        headerMatch: 'Cotação Atual (R$/t)',
        keywords: ['Mato Grosso', 'IMEA'],
        unidade_origem: 'BRL/ton',
        unidade_destino: 'BRL/ton',
        fator_conversao: 1  // já está em ton
    }
};

// Gera hash SHA-256 para deduplicação
function gerarHash(ativo_id, valor_bruto, data_referencia) {
    return crypto.createHash('sha256').update(`${ativo_id}|${valor_bruto}|${data_referencia}`).digest('hex');
}

// Salva preço no banco
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
                valorBruto.toString(),
                valorNormalizado,  // ✅ DEVE SER O VALOR CONVERTIDO
                ativo.unidade_origem,
                ativo.unidade_destino,
                ativo.fonte,
                ativo.tier,
                hash,
                dataReferencia,
                rawPayload || null
            ],
            function onRun(err) {
                db.close();
                if (err) reject(err);
                else resolve(this.changes || 0);
            }
        );
    });
}

// ✅ Parse de número brasileiro: "1.590,03" → 1590.03
function parseNumeroBr(valor) {
    if (!valor) return null;
    return parseFloat(String(valor).trim().replace(/\./g, '').replace(',', '.'));
}

// ✅ Encontra tabela pelo texto do header (não por ID bugado)
function encontrarTabelaPorHeader($, headerMatch) {
    let tabelaEncontrada = null;
    
    $('table').each((_, table) => {
        const headerText = $(table).find('thead th').eq(1).text().trim();
        if (headerText.includes(headerMatch)) {
            tabelaEncontrada = $(table);
            return false; // break
        }
    });
    
    return tabelaEncontrada;
}

async function scrapeNA() {
    let novosRegistros = 0;
    const resultados = [];
    const dataReferencia = new Date().toISOString().slice(0, 10);

    try {
        console.log(`📄 Acessando Notícias Agrícolas...`);
        
        const response = await axios.get(BASE_URL, {
            timeout: 45000,
            headers: HEADERS,
            maxRedirects: 5,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: true })
        });

        if (response.status !== 200) {
            throw new Error(`HTTP ${response.status}`);
        }

        console.log(`✅ HTML carregado: ${response.data.length} bytes`);

        const $ = cheerio.load(response.data);
        const rawPayload = JSON.stringify({
            fonte: 'NoticiasAgricolas',
            url: BASE_URL,
            coletado_em: new Date().toISOString(),
            status: response.status
        });

        // ✅ Itera sobre cada ativo alvo
        for (const [chave, alvo] of Object.entries(ATIVOS_ALVO)) {
            console.log(`\n🔍 Buscando tabela para: ${alvo.ativo_id}`);
            
            const tabela = encontrarTabelaPorHeader($, alvo.headerMatch);
            
            if (!tabela || tabela.length === 0) {
                console.log(`⚠️ Tabela não encontrada para ${alvo.ativo_id} (header: "${alvo.headerMatch}")`);
                continue;
            }

            console.log(`✅ Tabela encontrada para ${alvo.ativo_id}`);

            // ✅ Encontra linha por palavra-chave (prioriza primeira match)
            let valorBruto = null;
            let localidade = null;
            
            tabela.find('tbody tr').each((_, tr) => {
                const texto = $(tr).text().toLowerCase();
                if (alvo.keywords.some(k => texto.includes(k.toLowerCase()))) {
                    valorBruto = $(tr).find('td').eq(1).text().trim();
                    localidade = $(tr).find('td').eq(0).text().trim();
                    return false; // break na primeira match
                }
            });

            if (!valorBruto) {
                console.log(`⚠️ Valor não encontrado para ${alvo.ativo_id}`);
                continue;
            }

            console.log(`📍 ${localidade}: ${valorBruto}`);

            const valorNumerico = parseNumeroBr(valorBruto);
            if (valorNumerico === null || !Number.isFinite(valorNumerico)) {
                console.log(`⚠️ Não foi possível parsear valor: "${valorBruto}"`);
                continue;
            }

            // ✅ CORREÇÃO CRÍTICA: Aplicar conversão e usar o valor convertido
            const valorConvertido = parseFloat((valorNumerico * alvo.fator_conversao).toFixed(2));
            
            console.log(`📊 ${alvo.unidade_origem} → ${alvo.unidade_destino}: ${valorNumerico} × ${alvo.fator_conversao} = ${valorConvertido}`);

            // ✅ CORREÇÃO: Salvar o valor CONVERTIDO, não o valor bruto
            const changes = await salvarPreco(
                { 
                    ...alvo, 
                    fonte: 'NoticiasAgricolas', 
                    tier: 2 
                },
                dataReferencia,
                valorBruto,
                valorConvertido,  // ✅ AGORA USA O VALOR CONVERTIDO
                rawPayload
            );

            if (changes > 0) {
                novosRegistros += changes;
                resultados.push({
                    ativo: alvo.ativo_id,
                    localidade,
                    valor_bruto: valorBruto,
                    valor_normalizado: valorConvertido,
                    unidade: alvo.unidade_destino,
                    data: dataReferencia
                });
                console.log(`✅ ${alvo.ativo_id}: ${valorBruto} → R$${valorConvertido}/${alvo.unidade_destino}`);
            } else {
                console.log(`⚠️ ${alvo.ativo_id}: Dado já existe (deduplicado)`);
            }
        }

        return { success: true, fonte: 'NoticiasAgricolas', novosRegistros, resultados };

    } catch (error) {
        console.error('❌ Erro no scraper NA:', error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
        }
        return { 
            success: false, 
            fonte: 'NoticiasAgricolas', 
            error: error.message, 
            softFail: true,
            code: error.response?.status 
        };
    }
}

if (require.main === module) scrapeNA().then(res => console.log(res));
module.exports = { scrapeNA };
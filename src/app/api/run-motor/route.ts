// src/app/api/dados/route.ts
import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// 🔥 FORÇAR NODE.JS RUNTIME (NÃO EDGE)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Caminho absoluto para o banco
    const dbPath = path.join(process.cwd(), 'data', 'anivertis.db');
    console.log('📁 Tentando acessar banco em:', dbPath);

    // Verificar se o arquivo existe
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({
        success: false,
        error: 'Banco de dados não encontrado. Execute o scraper primeiro.',
        dados: [],
        health: []
      }, { status: 404 });
    }

    // Conectar com timeout e modo readonly para evitar locks
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY // 🔥 APENAS LEITURA
    });

    // Buscar últimas 50 notícias
    const dados = await db.all(`
      SELECT 
        id, source_name, title, content, url, 
        published_at, collected_at, score, layer, theme
      FROM coletas 
      ORDER BY collected_at DESC 
      LIMIT 50
    `);

    await db.close();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: dados.length,
      dados,
      health: await getSourceHealth(dbPath)
    });

  } catch (error: any) {
    console.error('❌ Erro na API:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      dados: [],
      health: []
    }, { status: 500 });
  }
}

async function getSourceHealth(dbPath: string) {
  try {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
      mode: sqlite3.OPEN_READONLY
    });
    
    const health = await db.all(`
      SELECT * FROM source_health 
      ORDER BY last_check DESC 
      LIMIT 20
    `);
    
    await db.close();
    return health;
  } catch {
    return [];
  }
}
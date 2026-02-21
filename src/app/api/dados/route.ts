import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const theme = searchParams.get('theme');
    const source = searchParams.get('source');

    // Caminho absoluto para o banco de dados
    const dbPath = path.join(process.cwd(), 'data', 'anivertis.db');
    
    // Verificar se o banco existe
    const fs = require('fs');
    if (!fs.existsSync(dbPath)) {
      return NextResponse.json({
        success: false,
        error: 'Banco de dados ainda não foi criado. Execute o scraper primeiro.',
        dados: [],
        health: []
      });
    }

    // Conectar ao banco SQLite
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    // Buscar últimas coletas
    let query = `
      SELECT 
        id, source_name, title, content, url, 
        published_at, collected_at, score, layer, theme
      FROM coletas 
      WHERE 1=1
    `;
    const params: any[] = [];

    if (theme) {
      query += ` AND theme = ?`;
      params.push(theme);
    }

    if (source) {
      query += ` AND source_name LIKE ?`;
      params.push(`%${source}%`);
    }

    query += ` ORDER BY collected_at DESC LIMIT ?`;
    params.push(limit);

    const dados = await db.all(query, params);

    // Buscar health das fontes
    const health = await db.all(`
      SELECT * FROM source_health 
      ORDER BY last_check DESC 
      LIMIT 20
    `);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      count: dados.length,
      dados,
      health
    });

  } catch (error: any) {
    console.error('Erro na API:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      dados: [],
      health: []
    }, { status: 500 });
  }
}
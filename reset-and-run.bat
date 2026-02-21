@echo off
title ANIVERTIS - RESET COMPLETO
color 0A
echo ========================================
echo 🔄 ANIVERTIS - RESET COMPLETO
echo ========================================
echo.

echo 1️⃣ Apagando banco de dados...
if exist "C:\Users\apgne\anivertis-prod\data\anivertis.db" (
  del /q "C:\Users\apgne\anivertis-prod\data\anivertis.db"
  echo ✅ Banco de dados apagado
) else (
  echo ⏭️ Banco de dados não encontrado
)
echo.

echo 2️⃣ Apagando cache do Next...
if exist "C:\Users\apgne\anivertis-prod\.next" (
  rmdir /s /q "C:\Users\apgne\anivertis-prod\.next"
  echo ✅ Cache do Next apagado
) else (
  echo ⏭️ Cache do Next não encontrado
)
echo.

echo 3️⃣ Verificando dependências...
cd C:\Users\apgne\anivertis-prod\scraper-engine
node -v >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ Node.js não encontrado! Instale Node.js primeiro.
  pause
  exit /b
)

echo ✅ Node.js encontrado
echo.

echo 4️⃣ Instalando cheerio (se necessário)...
npm list cheerio >nul 2>&1
if %errorlevel% neq 0 (
  echo 📦 Instalando cheerio...
  npm install cheerio
) else (
  echo ✅ Cheerio já instalado
)
echo.

echo 5️⃣ Executando scraper com limpeza ativada...
echo.
echo ⏳ Isso pode levar alguns minutos...
echo.
node run-scraper.js

echo.
echo ========================================
echo ✅ PROCESSO CONCLUÍDO!
echo ========================================
echo.
echo Agora execute no terminal:
echo   cd C:\Users\apgne\anivertis-prod
echo   npm run dev -- -p 3005
echo.
echo Depois no navegador:
echo   1. F12 → Application → Local Storage
echo   2. Delete "anivertis_v51_data"
echo   3. F5 e clique em "ATUALIZAR INTEL"
echo.
pause
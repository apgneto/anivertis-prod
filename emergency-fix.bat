@echo off
title ANIVERTIS - RECUPERAÇÃO DE EMERGÊNCIA
color 0C
echo ========================================
echo 🚨 RECUPERAÇÃO DE EMERGÊNCIA - TURBOPACK
echo ========================================
echo.

cd C:\Users\apgne\anivertis-prod

echo 1️⃣ Matando processos Node...
taskkill /F /IM node.exe 2>nul
timeout /t 2 >nul

echo 2️⃣ Removendo cache corrompido...
if exist ".next" (
  echo ⚠️ Forçando remoção da pasta .next...
  attrib -r -s -h .next /s /d 2>nul
  rmdir /s /q .next
  if exist ".next" (
    echo ❌ Falha na remoção! Executando comando de força...
    takeown /f .next /r /d y >nul 2>&1
    icacls .next /grant %username%:F /t /q >nul 2>&1
    rmdir /s /q .next
  )
)

echo 3️⃣ Recriando estrutura básica...
mkdir .next\cache 2>nul

echo 4️⃣ Desativando Turbopack e iniciando...
echo.
echo ✅ Iniciando site em modo compatível...
echo.
start http://localhost:3005
npx next dev -p 3005 --turbo=false

pause
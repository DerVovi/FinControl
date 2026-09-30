@echo off
title FinControl - Conexao Celular Cloudflare
cd /d "%~dp0"
echo ===================================================
echo   FinControl - Conectar Celular via Cloudflare
echo ===================================================
node scripts/start-tunnel.js
pause

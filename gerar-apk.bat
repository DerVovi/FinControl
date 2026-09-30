@echo off
title FinControl - Gerador de APK
echo ====================================================
echo       FINCONTROL - GERAR APK (ANDROID NATIVO)
echo ====================================================
echo.
cd /d "%~dp0mobile"

:: Habilita o modo sem Git para empacotar o projeto diretamente
set EAS_NO_VCS=1

echo [1/2] Verificando login Expo / EAS...
call npx eas whoami
if errorlevel 1 (
    echo.
    echo [!] Voce precisa fazer login na sua conta Expo.
    echo Fazendo login agora...
    call npx eas login
)

echo.
echo [2/2] Iniciando compilacao do APK no EAS Cloud (perfil preview)...
echo Isso vai gerar o arquivo .apk instalavel para o seu Android.
echo Ao terminar, um link e QR Code para baixar o .apk serao exibidos.
echo.
call npx eas build -p android --profile preview

echo.
pause

@echo off
echo Iniciando OpenShorts...
cd /d "%~dp0"
docker compose up -d
echo Abriendo OpenShorts en tu navegador...
timeout /t 3 /nobreak >nul
start http://localhost:5175
echo Listo! OpenShorts esta corriendo en http://localhost:5175

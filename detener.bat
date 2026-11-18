@echo off
echo Deteniendo OpenShorts...
cd /d "%~dp0"
docker compose stop
echo OpenShorts ha sido detenido correctamente.
pause

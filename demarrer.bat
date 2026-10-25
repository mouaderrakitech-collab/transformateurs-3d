@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Transformateurs 3D - poste de developpement
where node >/dev/null 2>/dev/null || (echo Node.js est requis sur ce poste : https://nodejs.org & echo Pour un PC sans Node.js, utiliser la version portable : npm run build:portable & pause & exit /b 1)
if not exist node_modules (echo Installation des dependances... & call npm ci || (pause & exit /b 1))
if not exist dist\index.html (echo Construction... & call npm run build || (pause & exit /b 1))
node launcher\launcher.mjs --dir dist --open
pause

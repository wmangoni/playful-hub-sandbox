@echo off
echo Iniciando servidor local do jogo...
start http://localhost:8000/game.html
python -m http.server 8000

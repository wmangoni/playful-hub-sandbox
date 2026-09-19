@echo off
echo =======================================================
echo   GASOMETRO 3D FPS - DEFESA DA ORLA DE PORTO ALEGRE
echo =======================================================
echo Iniciando servidor local do jogo...
start http://localhost:8000/game_fps.html
echo Servidor ativo em http://localhost:8000
echo Abrindo jogo FPS: http://localhost:8000/game_fps.html
echo (Para o jogo do Reino Celestial acesse: http://localhost:8000/game.html)
echo.
python -m http.server 8000

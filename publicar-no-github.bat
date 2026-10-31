@echo off
title Publicando Neon Pomodoro no GitHub
cd /d "%~dp0"
echo ========================================================
echo       Publicando Neon Pomodoro no GitHub
echo       Repositorio: https://github.com/thallysmrdev/neonPomodoro.git
echo ========================================================
echo.
git push -u origin main
echo.
echo ========================================================
echo Processo finalizado! Pressione qualquer tecla para fechar.
pause > nul
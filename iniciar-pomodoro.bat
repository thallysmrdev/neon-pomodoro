@echo off
cd /d "%~dp0"
title Neon Pomodoro
start "" "%~dp0node_modules\electron\dist\electron.exe" .
exit

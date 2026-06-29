@echo off
setlocal
chcp 65001 >nul
set NO_COLOR=1
set FORCE_COLOR=0
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\run-vite.ps1" -Mode dev -StartPort 5173
exit /b %ERRORLEVEL%

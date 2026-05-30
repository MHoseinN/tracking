@echo off
setlocal
set "ROOT=%~dp0"
powershell -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"%ROOT%scripts\remove-weekly-backup-task.ps1\"'"
endlocal
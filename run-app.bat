@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"

if not exist "%BACKEND%\node_modules" (
  pushd "%BACKEND%"
  call npm install
  popd
)

if not exist "%FRONTEND%\node_modules" (
  pushd "%FRONTEND%"
  call npm install
  popd
)

start "Tracking Backend" cmd /k "cd /d ""%BACKEND%"" && npm start"
start "Tracking Frontend" cmd /k "cd /d ""%FRONTEND%"" && npm run dev"

endlocal
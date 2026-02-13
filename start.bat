@echo off
setlocal

REM Simple launcher for the offline Electron kiosk.
REM Optional argument: "rebuild" forces a fresh next build.

cd /d "%~dp0"

echo [Start] Ensuring dependencies are installed...
if not exist "node_modules" (
  call npm install
  if errorlevel 1 goto :error
)

set NEED_BUILD=0
if not exist ".next" set NEED_BUILD=1
if /I "%~1"=="rebuild" set NEED_BUILD=1
if /I "%~1"=="--rebuild" set NEED_BUILD=1

if %NEED_BUILD%==1 (
  echo [Start] Building Next.js output...
  call npm run build
  if errorlevel 1 goto :error
)

echo [Start] Launching Electron shell...
call npx electron electron/main.js
if errorlevel 1 goto :error

echo [Start] Electron closed. Bye!
exit /b 0

:error
echo.
echo [Start] An error occurred. See logs above.
exit /b 1

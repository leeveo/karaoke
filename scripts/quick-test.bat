@echo off
REM ============================================================
REM Quick Test - Test rapide sans rebuild complet
REM ============================================================
REM 
REM Usage:
REM   quick-test.bat           - Teste avec le build existant
REM   quick-test.bat --rebuild - Force un rebuild avant le test
REM   quick-test.bat --copy    - Copie juste server.js et electron/
REM
REM Temps estimé:
REM   - Premier lancement: ~2-3 min (copie du build)
REM   - Lancements suivants: ~10 sec
REM ============================================================

cd /d "%~dp0.."
echo.
echo [QuickTest] Demarrage du test rapide...
echo.

node scripts\quick-test.js %*

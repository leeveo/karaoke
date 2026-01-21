@echo off
echo ========================================
echo TEST DU PACKAGE KARAOKE OFFLINE
echo ========================================
echo.

:: Test 1: Vérifier Node.js
echo [TEST 1] Vérification Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
  echo ❌ ECHEC: Node.js non installé!
  goto :error
) else (
  echo ✅ Node.js OK: 
  node --version
)
echo.

:: Test 2: Vérifier le ZIP existant
echo [TEST 2] Vérification du package ZIP...
if not exist ".packages\output\karaoke-6c88be73-1157-422f-bd69-c436005cc807.zip" (
  echo ❌ ECHEC: Fichier ZIP manquant!
  goto :error
) else (
  echo ✅ ZIP existe
)
echo.

:: Test 3: Extraire et vérifier le contenu
echo [TEST 3] Test extraction ZIP...
set TEMP_TEST=test-extract-%RANDOM%
mkdir %TEMP_TEST% 2>nul
cd %TEMP_TEST%
tar -xf "..\.packages\output\karaoke-6c88be73-1157-422f-bd69-c436005cc807.zip" 2>nul
if %errorlevel% neq 0 (
  echo ❌ ECHEC: Impossible d'extraire le ZIP!
  cd ..
  rmdir /s /q %TEMP_TEST% 2>nul
  goto :error
)

echo ✅ Extraction OK
echo.

:: Test 4: Vérifier les fichiers critiques
echo [TEST 4] Vérification contenu...
if not exist "start.bat" (
  echo ❌ ECHEC: start.bat manquant!
  goto :cleanup_error
)
echo ✅ start.bat présent

if not exist "package.json" (
  echo ❌ ECHEC: package.json manquant!
  goto :cleanup_error
)
echo ✅ package.json présent

if not exist "node_modules" (
  echo ❌ ECHEC: node_modules manquant!
  goto :cleanup_error
)
echo ✅ node_modules présent

if not exist "node_modules\@aws-sdk\client-s3" (
  echo ❌ ECHEC: @aws-sdk/client-s3 manquant!
  goto :cleanup_error
)
echo ✅ AWS SDK présent

if not exist ".next" (
  echo ❌ ECHEC: .next manquant!
  goto :cleanup_error
)
echo ✅ .next présent

echo.
echo [TEST 5] Test start.bat...
echo Contenu du script start.bat:
echo ----------------------------------------
type start.bat
echo ----------------------------------------
echo.

:: Nettoyage
cd ..
rmdir /s /q %TEMP_TEST% 2>nul

echo ========================================
echo ✅ TOUS LES TESTS PASSÉS!
echo ✅ Le package est prêt pour transfert!
echo ========================================
echo.
echo Sur l'autre machine:
echo 1. Extraire le ZIP
echo 2. Double-cliquer start.bat
echo 3. Lire les messages qui s'affichent
echo.
pause
exit /b 0

:cleanup_error
cd ..
rmdir /s /q %TEMP_TEST% 2>nul

:error
echo.
echo ========================================
echo ❌ TESTS ÉCHOUÉS!
echo ❌ Le package doit être corrigé!
echo ========================================
echo.
pause
exit /b 1
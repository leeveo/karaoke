@echo off
echo.
echo ======================================================
echo  Export des chansons MP3 - Categorie ALL
echo ======================================================
echo.

REM Vérifier si Node.js est installé
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Node.js depuis https://nodejs.org/
    pause
    exit /b 1
)

REM Vérifier si le fichier .env.local existe
if not exist ".env.local" (
    echo ERREUR: Le fichier .env.local est manquant
    echo Assurez-vous que votre configuration AWS est presente dans .env.local
    echo.
    echo Variables requises:
    echo - NEXT_PUBLIC_AWS_ACCESS_KEY_ID
    echo - NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY
    echo - NEXT_PUBLIC_AWS_REGION
    echo - NEXT_PUBLIC_AWS_S3_BUCKET
    pause
    exit /b 1
)

echo Chargement de la configuration depuis .env.local...
REM Charger les variables d'environnement depuis .env.local
for /f "delims== tokens=1,2" %%G in (.env.local) do (
    if not "%%H"=="" (
        set "%%G=%%H"
    )
)

echo.
echo Configuration detectee:
echo - Bucket: %NEXT_PUBLIC_AWS_S3_BUCKET%
echo - Region: %NEXT_PUBLIC_AWS_REGION%
echo.

echo Demarrage de l'export...
echo.

REM Exécuter le script Node.js
node export-mp3-list.js

if %errorlevel% equ 0 (
    echo.
    echo ======================================================
    echo  Export termine avec succes!
    echo ======================================================
    echo.
    echo Le fichier de liste a ete cree dans le repertoire courant.
    echo Vous pouvez maintenant l'ouvrir avec n'importe quel editeur de texte.
) else (
    echo.
    echo ======================================================
    echo  Erreur lors de l'export
    echo ======================================================
    echo.
    echo Verifiez votre configuration AWS et votre connexion internet.
)

echo.
pause
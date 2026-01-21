#!/usr/bin/env node
/**
 * Script pour générer un package Electron standalone
 * Usage: node scripts/generate-package.js <eventId>
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const eventId = process.argv[2];
if (!eventId) {
  console.error('Usage: node scripts/generate-package.js <eventId>');
  process.exit(1);
}

const PACKAGE_DIR = path.join(process.cwd(), '.packages');
const TEMP_DIR = path.join(PACKAGE_DIR, `temp-${Date.now()}`);
const OUTPUT_DIR = path.join(PACKAGE_DIR, 'output');
const OFFLINE_PACKAGES_DIR = path.join(process.cwd(), 'offline-packages');
const OFFLINE_EVENT_DIR = path.join(OFFLINE_PACKAGES_DIR, eventId);

if (!fs.existsSync(OFFLINE_EVENT_DIR)) {
  console.error(`[Package] Missing offline assets for event ${eventId}. Run build-offline-package.js first.`);
  process.exit(1);
}

if (!fs.existsSync(PACKAGE_DIR)) fs.mkdirSync(PACKAGE_DIR, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

console.log(`[Package] 🎤 Generating Electron package for event: ${eventId}`);

async function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  
  const files = fs.readdirSync(src);
  for (const file of files) {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    const stat = fs.statSync(srcFile);
    if (stat.isDirectory()) {
      await copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  }
}

async function generatePackage() {
  try {
    // 1. Copier l'app compilée + Electron + node_modules
    console.log('[Package] 📦 Copying app files...');
    await copyDir(path.join(__dirname, '../.next'), path.join(TEMP_DIR, '.next'));
    await copyDir(path.join(__dirname, '../public'), path.join(TEMP_DIR, 'public'));
    await copyDir(path.join(__dirname, '../electron'), path.join(TEMP_DIR, 'electron'));
    await copyDir(OFFLINE_EVENT_DIR, path.join(TEMP_DIR, 'offline-data', eventId));
    
    // CRITICAL: Copier tous les modules Node.js nécessaires
    console.log('[Package] 📦 Copying node_modules... (This may take a few minutes)');
    await copyDir(path.join(__dirname, '../node_modules'), path.join(TEMP_DIR, 'node_modules'));

    // 2. Copier server.js
    console.log('[Package] 🔧 Copying server.js...');
    fs.copyFileSync(
      path.join(__dirname, '../server.js'),
      path.join(TEMP_DIR, 'server.js')
    );

    // 2.5. Copier le fichier .env.local (variables d'environnement)
    console.log('[Package] 🔐 Copying .env.local...');
    const envLocalPath = path.join(__dirname, '../.env.local');
    if (fs.existsSync(envLocalPath)) {
      fs.copyFileSync(envLocalPath, path.join(TEMP_DIR, '.env.local'));
      console.log('[Package] ✓ .env.local copied successfully');
    } else {
      console.warn('[Package] ⚠️  .env.local not found - email sending may not work');
    }

    // 3. Créer package.json Electron
    console.log('[Package] 📋 Creating package.json...');
    const packageJson = {
      name: `karaoke-offline-${eventId}`,
      version: '1.0.0',
      description: 'Karaoke Offline',
      main: 'electron/main.js',
      homepage: './',
      scripts: {
        start: 'electron electron/main.js',
        server: 'node server.js'
      },
      dependencies: {
        electron: '^33.0.0',
        express: '^4.21.1',
        next: '15.5.9',
        react: '^19.0.0',
        'react-dom': '^19.0.0',
        '@aws-sdk/client-s3': '^3.0.0',
        'aws-sdk': '^2.0.0'
      },
      devDependencies: {
        'electron-builder': '^25.1.1'
      }
    };
    fs.writeFileSync(
      path.join(TEMP_DIR, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    writeStartScripts(eventId);

    // 4. Créer README simple
    console.log('[Package] 📝 Creating README...');
    fs.writeFileSync(
      path.join(TEMP_DIR, 'README.md'),
      `# Karaoke Offline - Événement ${eventId}

## Démarrage

1. Extraire ce dossier zipé vers un emplacement local (ex: C:/Karaoke/${eventId})
2. Windows → double-cliquez sur **start.bat**
   macOS/Linux → \`chmod +x start.sh && ./start.sh\`
3. La première exécution installe automatiquement les dépendances (connexion internet requise uniquement pour cette étape)
4. Une fenêtre Electron s'ouvre et charge l'événement sélectionné en mode 100% offline

## Structure du dossier
- offline-data/${eventId}: manifest.json + MP4/Images pré-téléchargés
- electron/: shell multi-plateforme
- server.js: serveur Next.js autonome

Vous pouvez copier ce dossier sur autant de postes que nécessaire, aucune connexion internet n'est requise pendant l'événement. 🎤`
    );

    // 5. Créer le ZIP
    console.log('[Package] 📦 Creating ZIP...');
    const zipPath = path.join(OUTPUT_DIR, `karaoke-${eventId}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 6 } });

    await new Promise((resolve, reject) => {
      output.on('close', () => {
        const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
        console.log(`[Package] ✅ ZIP created: ${sizeInMB} MB`);
        resolve();
      });
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(TEMP_DIR, '');
      archive.finalize();
    });

    console.log(`[Package] ✨ Done! Output: ${zipPath}`);
    
  } catch (error) {
    console.error('[Package] ❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(TEMP_DIR)) {
      fs.rmSync(TEMP_DIR, { recursive: true, force: true });
    }
  }
}

generatePackage();

function writeStartScripts(eventLabel) {
  const windowsScript = [
    '@echo off',
    'setlocal',
    '',
    ':: DIAGNOSTIC SCRIPT - Tout est loggé dans debug.log',
    'echo ======================================== > debug.log',
    'echo [DEBUG] Script start.bat lance a %date% %time% >> debug.log',
    'echo ======================================== >> debug.log',
    'echo. >> debug.log',
    '',
    ':: Changer vers le dossier du script',
    'echo [DEBUG] Changement vers dossier script... >> debug.log',
    'cd /d "%~dp0" 2>> debug.log',
    'echo [DEBUG] Dossier actuel: %CD% >> debug.log',
    'echo. >> debug.log',
    '',
    ':: Afficher a l\'ecran ET dans le log',
    'echo ========================================',
    'echo [Karaoke Offline] Demarrage...',
    'echo ========================================',
    'echo [DEBUG] Affichage initial OK >> debug.log',
    'echo.',
    '',
    ':: Test 1: Verifier Node.js',
    'echo [TEST 1] Verification Node.js... >> debug.log',
    'echo [TEST 1] Verification Node.js...',
    'node --version >nul 2>>debug.log',
    'if %errorlevel% neq 0 (',
    '  echo [ERREUR] Node.js non installe ou introuvable! >> debug.log',
    '  echo ❌ ERREUR: Node.js non installe ou introuvable!',
    '  echo Veuillez installer Node.js depuis https://nodejs.org',
    '  echo Consultez debug.log pour plus de details.',
    '  echo.',
    '  echo Appuyez sur une touche pour fermer...',
    '  pause >nul',
    '  exit /b 1',
    ')',
    '',
    'echo [DEBUG] Node.js detecte >> debug.log',
    'node --version >> debug.log 2>&1',
    'echo ✅ Node.js detecte:',
    'node --version',
    'echo.',
    '',
    ':: Test 2: Verifier package.json',
    'echo [TEST 2] Verification package.json... >> debug.log',
    'echo [TEST 2] Verification package.json...',
    'if not exist package.json (',
    '  echo [ERREUR] package.json manquant! >> debug.log',
    '  echo ❌ ERREUR: package.json manquant!',
    '  echo Consultez debug.log pour plus de details.',
    '  pause >nul',
    '  exit /b 1',
    ')',
    'echo [DEBUG] package.json present >> debug.log',
    'echo ✅ package.json present',
    'echo.',
    '',
    ':: Test 3: Verifier node_modules',
    'echo [TEST 3] Verification node_modules... >> debug.log',
    'echo [TEST 3] Verification node_modules...',
    'if not exist node_modules (',
    '  echo [ERREUR] Dossier node_modules manquant! >> debug.log',
    '  echo ❌ ERREUR: Dossier node_modules manquant!',
    '  echo Ce ZIP ne contient pas les dependances necessaires.',
    '  echo Consultez debug.log pour plus de details.',
    '  pause >nul',
    '  exit /b 1',
    ')',
    'echo [DEBUG] node_modules present >> debug.log',
    'echo ✅ Dependances detectees.',
    'echo.',
    '',
    ':: Test 4: Verifier AWS SDK',
    'echo [TEST 4] Verification AWS SDK... >> debug.log',
    'echo [TEST 4] Verification AWS SDK...',
    'if not exist "node_modules\\@aws-sdk\\client-s3" (',
    '  echo [ERREUR] AWS SDK manquant! >> debug.log',
    '  echo ❌ ERREUR: AWS SDK manquant!',
    '  echo Consultez debug.log pour plus de details.',
    '  pause >nul',
    '  exit /b 1',
    ')',
    'echo [DEBUG] AWS SDK present >> debug.log',
    'echo ✅ AWS SDK present.',
    'echo.',
    '',
    ':: Configuration',
    'echo [DEBUG] Configuration variables... >> debug.log',
    'set KARAOKE_OFFLINE_PORT=3210',
    `set EVENT_ID=${eventLabel}`,
    'echo Port: %KARAOKE_OFFLINE_PORT%',
    'echo Event ID: %EVENT_ID%',
    'echo [DEBUG] Port: %KARAOKE_OFFLINE_PORT% >> debug.log',
    'echo [DEBUG] Event ID: %EVENT_ID% >> debug.log',
    'echo.',
    '',
    ':: Lancer l\'application',
    'echo [DEBUG] Tentative lancement npm run start... >> debug.log',
    'echo [Karaoke Offline] Lancement de l\'application...',
    'echo Si ca plante, consultez debug.log pour les details.',
    'echo.',
    '',
    'npm run start 2>> debug.log',
    'set EXIT_CODE=%errorlevel%',
    'echo [DEBUG] npm run start termine avec code: %EXIT_CODE% >> debug.log',
    '',
    'if %EXIT_CODE% neq 0 (',
    '  echo. >> debug.log',
    '  echo [ERREUR] Echec lancement application! >> debug.log',
    '  echo Code erreur: %EXIT_CODE% >> debug.log',
    '  echo.',
    '  echo ❌ ERREUR lors du lancement de l\'application!',
    '  echo Code d\'erreur: %EXIT_CODE%',
    '  echo.',
    '  echo !! CONSULTEZ le fichier debug.log pour les details !!',
    '  echo.',
    '  echo Appuyez sur une touche pour fermer...',
    '  pause >nul',
    '  exit /b %EXIT_CODE%',
    ')',
    '',
    'echo [DEBUG] Application lancee avec succes! >> debug.log',
    'echo ✅ Application lancee avec succes!',
    '',
    'endlocal',
    'echo.',
    'echo Appuyez sur une touche pour fermer...',
    'pause >nul',
    '',
  ].join('\r\n');

  fs.writeFileSync(path.join(TEMP_DIR, 'start.bat'), windowsScript, 'utf-8');

  const unixScriptLines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
       'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
       'cd "$SCRIPT_DIR"',
       'echo "[Karaoke Offline] Starting with pre-installed dependencies..."',
    'export KARAOKE_OFFLINE_PORT=3210',
    `export EVENT_ID=${eventLabel}`,
    'npm run start',
    '',
  ];

  fs.writeFileSync(path.join(TEMP_DIR, 'start.sh'), unixScriptLines.join('\n'), {
    encoding: 'utf-8',
    mode: 0o755,
  });
}

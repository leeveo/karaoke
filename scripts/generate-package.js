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
    // 1. Copier l'app compilée + Electron
    console.log('[Package] 📦 Copying app files...');
    await copyDir(path.join(__dirname, '../.next'), path.join(TEMP_DIR, '.next'));
    await copyDir(path.join(__dirname, '../public'), path.join(TEMP_DIR, 'public'));
    await copyDir(path.join(__dirname, '../electron'), path.join(TEMP_DIR, 'electron'));
    await copyDir(OFFLINE_EVENT_DIR, path.join(TEMP_DIR, 'offline-data', eventId));

    // 2. Copier server.js
    console.log('[Package] 🔧 Copying server.js...');
    fs.copyFileSync(
      path.join(__dirname, '../server.js'),
      path.join(TEMP_DIR, 'server.js')
    );

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
        'react-dom': '^19.0.0'
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
    'cd /d %~dp0',
    'if not exist node_modules (',
    '  echo [Karaoke Offline] Installing dependencies...',
    '  npm install --omit=dev',
    ')',
    'set KARAOKE_OFFLINE_PORT=3210',
    `set EVENT_ID=${eventLabel}`,
    'npm run start',
    'endlocal',
    '',
  ].join('\r\n');

  fs.writeFileSync(path.join(TEMP_DIR, 'start.bat'), windowsScript, 'utf-8');

  const unixScriptLines = [
    '#!/usr/bin/env bash',
    'set -euo pipefail',
       'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"',
       'cd "$SCRIPT_DIR"',
       'if [ ! -d node_modules ]; then',
       '  echo "[Karaoke Offline] Installing dependencies..."',
    '  npm install --omit=dev',
    'fi',
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

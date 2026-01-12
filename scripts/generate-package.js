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
        start: 'electron .',
        dev: 'electron .'
      },
      dependencies: {
        next: '15.5.9',
        react: '^19.0.0',
        'react-dom': '^19.0.0'
      },
      devDependencies: {
        electron: '^33.0.0',
        'electron-builder': '^25.1.1'
      }
    };
    fs.writeFileSync(
      path.join(TEMP_DIR, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );

    // 4. Créer README simple
    console.log('[Package] 📝 Creating README...');
    fs.writeFileSync(
      path.join(TEMP_DIR, 'README.md'),
      `# Karaoke Offline - Événement ${eventId}

## Démarrage

1. Extraire le ZIP
2. \`npm install\`
3. \`npm start\`

L'application se lance automatiquement !

## Systèmes supportés
- Windows 7+
- macOS 10.11+
- Linux

Amusez-vous bien ! 🎤`
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

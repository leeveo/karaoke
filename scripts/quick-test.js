#!/usr/bin/env node
/**
 * Quick Test Script - Test offline mode without full rebuild
 * 
 * Ce script permet de tester rapidement les changements sans rebuilder tout le projet.
 * Il réutilise le build existant et lance directement Electron.
 * 
 * Usage:
 *   node scripts/quick-test.js          - Lance le test (réutilise le build existant)
 *   node scripts/quick-test.js --rebuild - Force un nouveau build Next.js avant le test
 *   node scripts/quick-test.js --copy    - Copie juste les fichiers modifiés (electron/, server.js)
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

const ROOT = process.cwd();
const TEST_DIR = path.join(ROOT, '.packages', 'test-offline');
const NEXT_BUILD = path.join(ROOT, '.next');

const args = process.argv.slice(2);
const forceRebuild = args.includes('--rebuild');
const copyOnly = args.includes('--copy');

function log(msg) {
  console.log(`[QuickTest] ${msg}`);
}

function fileExists(p) {
  return fs.existsSync(p);
}

function copyFileSync(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  log('='.repeat(60));
  log('Quick Test - Mode test rapide sans rebuild complet');
  log('='.repeat(60));

  // 1. Vérifier si le build Next.js existe
  if (!fileExists(NEXT_BUILD) || forceRebuild) {
    if (forceRebuild) {
      log('🔨 --rebuild demandé, reconstruction du build Next.js...');
    } else {
      log('⚠️  Pas de build Next.js trouvé, construction...');
    }
    try {
      execSync('npm run build', { stdio: 'inherit', cwd: ROOT });
    } catch (err) {
      log('❌ Build échoué!');
      process.exit(1);
    }
  } else {
    log('✅ Build Next.js existant trouvé, réutilisation...');
  }

  // 2. Vérifier si le dossier test existe
  if (!fileExists(TEST_DIR)) {
    log('⚠️  Dossier test non trouvé, création...');
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // 3. Copier les fichiers essentiels (toujours, car ils peuvent avoir changé)
  log('📁 Copie des fichiers modifiés...');
  
  // Fichiers de config et serveur
  const filesToCopy = [
    'server.js',
    'package.json',
    'next.config.js',
  ];
  
  for (const file of filesToCopy) {
    if (fileExists(path.join(ROOT, file))) {
      copyFileSync(path.join(ROOT, file), path.join(TEST_DIR, file));
      log(`   ✓ ${file}`);
    }
  }

  // Dossier electron/
  if (fileExists(path.join(ROOT, 'electron'))) {
    copyDirSync(path.join(ROOT, 'electron'), path.join(TEST_DIR, 'electron'));
    log('   ✓ electron/');
  }

  // 4. Copier le build Next.js (seulement si nécessaire)
  const testNextBuild = path.join(TEST_DIR, '.next');
  if (!fileExists(testNextBuild) || forceRebuild || !copyOnly) {
    log('📦 Copie du build Next.js...');
    if (fileExists(testNextBuild)) {
      fs.rmSync(testNextBuild, { recursive: true, force: true });
    }
    copyDirSync(NEXT_BUILD, testNextBuild);
    log('   ✓ .next/');
  }

  // 5. Copier le dossier public
  const publicDir = path.join(ROOT, 'public');
  const testPublic = path.join(TEST_DIR, 'public');
  if (fileExists(publicDir)) {
    if (!fileExists(testPublic) || forceRebuild) {
      log('📦 Copie du dossier public...');
      copyDirSync(publicDir, testPublic);
      log('   ✓ public/');
    }

    // Always refresh critical service worker to pick up cache tweaks
    const swSource = path.join(publicDir, 'offline-worker.js');
    const swDest = path.join(testPublic, 'offline-worker.js');
    if (fileExists(swSource)) {
      copyFileSync(swSource, swDest);
      log('   ↺ offline-worker.js mis à jour');
    }
  }

  // 6. Vérifier si offline-data existe
  const offlineDataSrc = path.join(ROOT, 'offline-packages');
  const offlineDataDest = path.join(TEST_DIR, 'offline-data');
  
  if (fileExists(offlineDataSrc)) {
    // Trouver le premier dossier d'événement
    const events = fs.readdirSync(offlineDataSrc).filter(f => 
      fs.statSync(path.join(offlineDataSrc, f)).isDirectory()
    );
    
    if (events.length > 0) {
      const eventDir = path.join(offlineDataSrc, events[0]);
      if (!fileExists(offlineDataDest) || forceRebuild) {
        log(`📦 Copie des données offline (${events[0]})...`);
        fs.mkdirSync(offlineDataDest, { recursive: true });
        copyDirSync(eventDir, path.join(offlineDataDest, events[0]));
        log('   ✓ offline-data/');
      } else {
        log('✅ Données offline existantes, réutilisation...');
      }
    } else {
      log('⚠️  Pas de données offline trouvées dans offline-packages/');
    }
  }

  // 7. Installer node_modules si nécessaire
  const testNodeModules = path.join(TEST_DIR, 'node_modules');
  const electronModule = path.join(testNodeModules, 'electron');
  
  if (!fileExists(testNodeModules)) {
    log('📦 Installation des dépendances (npm install)...');
    execSync('npm install', { stdio: 'inherit', cwd: TEST_DIR });
  } else if (!fileExists(electronModule)) {
    log('📦 Installation d\'Electron...');
    execSync('npm install electron@33.0.0', { stdio: 'inherit', cwd: TEST_DIR });
  }

  log('');
  log('📍 Étapes suivantes:');
  log('   1. cd .packages/test-offline');
  log('   2. Lancer LANCER-KARAOKE.bat pour tester offline');
  log('');
}

main().catch((err) => {
  console.error('[QuickTest] Erreur fatale:', err);
  process.exit(1);
});

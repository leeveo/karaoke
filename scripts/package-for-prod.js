#!/usr/bin/env node
/**
 * Package for Production - Crée un zip portable pour déploiement rapide
 * 
 * Usage:
 *   node scripts/package-for-prod.js
 * 
 * Le zip résultant peut être copié sur une machine de production et lancé avec:
 *   1. Extraire le zip
 *   2. npm install (seulement la première fois)
 *   3. npx electron electron/main.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = process.cwd();
const TEST_DIR = path.join(ROOT, '.packages', 'test-offline');
const OUTPUT_DIR = path.join(ROOT, '.packages', 'production');
const args = process.argv.slice(2);
const includeNodeModules = args.includes('--with-modules');
const TIMESTAMP = new Date().toISOString().slice(0, 10).replace(/-/g, '');

function log(msg) {
  console.log(`[PackageProd] ${msg}`);
}

function copyDirSync(src, dest, exclude = []) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    if (exclude.includes(entry.name)) continue;
    
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  log('='.repeat(60));
  log('Package for Production - Création du package portable');
  log('='.repeat(60));

  // Vérifier que test-offline existe
  if (!fs.existsSync(TEST_DIR)) {
    log('❌ Dossier test-offline non trouvé!');
    log('   Lancez d\'abord: node scripts/quick-test.js');
    process.exit(1);
  }

  // Créer le dossier de sortie
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // Nom du package
  const packageName = `karaoke-offline-${TIMESTAMP}`;
  const packageDir = path.join(OUTPUT_DIR, packageName);

  // Supprimer l'ancien package si existant
  if (fs.existsSync(packageDir)) {
    fs.rmSync(packageDir, { recursive: true, force: true });
  }

  log(`📦 Création du package: ${packageName}`);
  if (includeNodeModules) {
    log('   (avec node_modules inclus - démarrage instantané)');
  }

  // Copier les fichiers
  log('📁 Copie des fichiers...');
  const excludeList = includeNodeModules ? [] : ['node_modules'];
  copyDirSync(TEST_DIR, packageDir, excludeList);
  
  if (includeNodeModules) {
    log('   ✓ node_modules inclus (peut prendre quelques minutes)');
  }

  // Créer un package.json simplifié pour la prod
  const prodPackageJson = {
    name: "karaoke-offline-prod",
    version: "1.0.0",
    main: "electron/main.js",
    scripts: {
      start: "electron electron/main.js",
      "start:debug": "electron electron/main.js --enable-logging"
    },
    dependencies: {
      "next": "15.5.9",
      "react": "^19.1.0",
      "react-dom": "^19.1.0",
      "express": "^4.21.2"
    },
    devDependencies: {
      "electron": "33.0.0"
    }
  };

  fs.writeFileSync(
    path.join(packageDir, 'package.json'),
    JSON.stringify(prodPackageJson, null, 2)
  );

  // Créer un script de lancement Windows
  const launchBat = `@echo off
echo ========================================
echo   Karaoke Offline - Lancement
echo ========================================
echo.

REM Verifier si node_modules existe
if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
    echo.
)

echo Lancement de l'application...
call npx electron electron/main.js

pause
`;

  fs.writeFileSync(path.join(packageDir, 'START.bat'), launchBat);

  // Créer un script de lancement PowerShell
  const launchPs1 = `# Karaoke Offline - Lancement
Write-Host "========================================"
Write-Host "  Karaoke Offline - Lancement"
Write-Host "========================================"
Write-Host ""

# Verifier si node_modules existe
if (-not (Test-Path "node_modules")) {
    Write-Host "Installation des dependances..."
    npm install
    Write-Host ""
}

Write-Host "Lancement de l'application..."
npx electron electron/main.js
`;

  fs.writeFileSync(path.join(packageDir, 'START.ps1'), launchPs1);

  // Créer README
  const readme = `# Karaoke Offline - Package Production

## Prérequis
- Node.js 18+ installé sur la machine

## Installation (première fois uniquement)
\`\`\`bash
npm install
\`\`\`

## Lancement
### Windows (double-clic)
- Double-cliquez sur \`START.bat\`

### Ligne de commande
\`\`\`bash
npx electron electron/main.js
\`\`\`

### Avec logs de debug
\`\`\`bash
npx electron electron/main.js --enable-logging
\`\`\`

## Structure
- \`.next/\` - Build Next.js précompilé
- \`electron/\` - Configuration Electron
- \`offline-data/\` - Données de l'événement (vidéos, images, manifest)
- \`public/\` - Assets publics
- \`server.js\` - Serveur Express/Next.js

## Dépannage
Si l'application ne démarre pas:
1. Vérifiez que Node.js est installé: \`node --version\`
2. Réinstallez les dépendances: \`npm install\`
3. Lancez avec debug: \`npx electron electron/main.js --enable-logging\`
`;

  fs.writeFileSync(path.join(packageDir, 'README.md'), readme);

  // Créer le ZIP
  log('🗜️  Création du fichier ZIP...');
  const zipPath = path.join(OUTPUT_DIR, `${packageName}.zip`);
  
  try {
    // Utiliser PowerShell pour créer le zip (Windows)
    execSync(
      `powershell -Command "Compress-Archive -Path '${packageDir}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: 'inherit' }
    );
    log(`✅ ZIP créé: ${zipPath}`);
  } catch (err) {
    log('⚠️  Impossible de créer le ZIP automatiquement');
    log(`   Vous pouvez zipper manuellement: ${packageDir}`);
  }

  // Afficher les instructions
  log('');
  log('='.repeat(60));
  log('✅ Package créé avec succès!');
  log('='.repeat(60));
  log('');
  log('📂 Dossier du package:');
  log(`   ${packageDir}`);
  log('');
  log('📦 Fichier ZIP:');
  log(`   ${zipPath}`);
  log('');
  log('🚀 Pour déployer sur une machine de production:');
  log('   1. Copiez le ZIP sur la machine cible');
  log('   2. Extrayez le contenu');
  log('   3. Ouvrez un terminal dans le dossier extrait');
  log('   4. Exécutez: npm install');
  log('   5. Exécutez: npx electron electron/main.js');
  log('');
  log('   Ou simplement double-cliquez sur START.bat (Windows)');
  log('');
}

main().catch((err) => {
  console.error('[PackageProd] Erreur fatale:', err);
  process.exit(1);
});

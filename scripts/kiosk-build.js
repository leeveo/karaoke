#!/usr/bin/env node
/**
 * Orchestrates the full offline kiosk build pipeline end-to-end.
 * Usage examples:
 *   npm run kiosk:build -- 6c88be73-1157-422f-bd69-c436005cc807
 *   node scripts/kiosk-build.js --event 6c88be73-... --skip-next-build
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT_DIR = process.cwd();
const OFFLINE_PACKAGES_DIR = path.join(ROOT_DIR, 'offline-packages');
const DEFAULT_OUTPUT_DIR = path.join(ROOT_DIR, '.packages', 'output');
const REQUIRED_ENV = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

function loadEnv() {
  const envCandidates = [path.join(ROOT_DIR, '.env.local'), path.join(ROOT_DIR, '.env')];
  let loaded = false;
  envCandidates.forEach((candidate) => {
    if (fs.existsSync(candidate)) {
      dotenv.config({ path: candidate, override: false });
      loaded = true;
    }
  });
  if (!loaded) {
    dotenv.config();
  }
}

function parseArgs() {
  const rawArgs = process.argv.slice(2);
  const options = {
    eventId: null,
    skipOfflineAssets: false,
    skipNextBuild: false,
  };

  let i = 0;
  while (i < rawArgs.length) {
    const arg = rawArgs[i];
    if (arg === '--skip-offline-assets') {
      options.skipOfflineAssets = true;
      i += 1;
    } else if (arg === '--skip-next-build') {
      options.skipNextBuild = true;
      i += 1;
    } else if (arg === '--only-package') {
      options.skipOfflineAssets = true;
      options.skipNextBuild = true;
      i += 1;
    } else if (arg === '--event' || arg === '-e') {
      options.eventId = rawArgs[i + 1];
      i += 2;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      options.eventId = arg;
      i += 1;
    }
  }

  if (!options.eventId) {
    throw new Error('Missing eventId. Usage: npm run kiosk:build -- <eventId>');
  }

  return options;
}

function ensureEnvVars() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

async function runStep(label, command, args) {
  console.log(`\n[OfflineKiosk] ▶ ${label}`);
  await runCommand(command, args);
  console.log(`[OfflineKiosk] ✅ ${label}`);
}

function runCommand(command, args) {
  const useShell = process.platform === 'win32';
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      shell: useShell,
    });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });
}

function ensureOfflineFolder(eventId) {
  const target = path.join(OFFLINE_PACKAGES_DIR, eventId);
  if (!fs.existsSync(target)) {
    throw new Error(`offline-packages/${eventId} not found. Run without --skip-offline-assets.`);
  }
}

async function main() {
  try {
    loadEnv();
    const options = parseArgs();
    ensureEnvVars();

    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

    if (!options.skipOfflineAssets) {
      await runStep(
        'Préparation des assets offline',
        npmCmd,
        ['run', 'build:offline-package', '--', options.eventId]
      );
    } else {
      ensureOfflineFolder(options.eventId);
      console.log('[OfflineKiosk] ⏭️ Assets offline déjà présents, étape sautée.');
    }

    if (!options.skipNextBuild) {
      await runStep('Compilation Next.js', npxCmd, ['next', 'build']);
    } else {
      console.log('[OfflineKiosk] ⏭️ Compilation Next.js sautée.');
    }

    await runStep(
      'Packaging Electron',
      'node',
      ['scripts/generate-package.js', options.eventId]
    );

    const zipPath = path.join(DEFAULT_OUTPUT_DIR, `karaoke-${options.eventId}.zip`);
    console.log(`\n[OfflineKiosk] 🎉 Package prêt: ${zipPath}`);
    console.log('[OfflineKiosk] Vous pouvez copier ce ZIP sur vos kiosques.');
  } catch (error) {
    console.error('\n[OfflineKiosk] ❌ Échec:', error.message);
    process.exit(1);
  }
}

main();

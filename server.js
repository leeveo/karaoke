#!/usr/bin/env node
/**
 * Minimal Next.js production server aware of offline packages.
 * - Serves the prebuilt .next output
 * - Exposes offline manifest and static assets when available
 */

const fs = require('fs');
const path = require('path');
const url = require('url');
const express = require('express');
const next = require('next');

function resolveOfflineRoot() {
  const explicit = process.env.OFFLINE_PACKAGE_ROOT;
  if (explicit) {
    const target = path.resolve(explicit);
    if (fs.existsSync(target)) {
      return target;
    }
  }

  const baseDir = path.join(process.cwd(), 'offline-data');
  if (!fs.existsSync(baseDir)) {
    return null;
  }

  const candidates = fs
    .readdirSync(baseDir)
    .map((name) => path.join(baseDir, name))
    .filter((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory());

  return candidates[0] || null;
}

function loadManifest(rootDir) {
  const manifestPath = path.join(rootDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(manifestPath, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[OfflineServer] Unable to read manifest:', error.message);
    return null;
  }
}

async function startServer({ port, dir, offlineRoot } = {}) {
  const resolvedPort = Number(port || process.env.PORT || 3210);
  const resolvedDir = dir || process.cwd();
  const resolvedOfflineRoot = offlineRoot || resolveOfflineRoot();

  if (resolvedOfflineRoot && !process.env.OFFLINE_MANIFEST_PATH) {
    process.env.OFFLINE_MANIFEST_PATH = path.join(resolvedOfflineRoot, 'manifest.json');
  }

  console.log('[OfflineServer] Booting Next.js server...');
  const app = next({ dev: false, dir: resolvedDir });
  const handle = app.getRequestHandler();

  const manifest = resolvedOfflineRoot ? loadManifest(resolvedOfflineRoot) : null;
  const assetsDir = resolvedOfflineRoot ? path.join(resolvedOfflineRoot, 'assets') : null;

  await app.prepare();

  const server = express();

  // Servir le dossier public pour les style packs, images, etc.
  const publicDir = path.join(resolvedDir, 'public');
  if (fs.existsSync(publicDir)) {
    console.log('[OfflineServer] Serving public directory:', publicDir);
    server.use(express.static(publicDir, {
      maxAge: '1d',
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
      },
    }));
  }

  if (manifest && assetsDir && fs.existsSync(assetsDir)) {
    console.log('[OfflineServer] Offline package detected:', resolvedOfflineRoot);
    server.get('/api/offline/manifest', (_req, res) => {
      res.json(manifest);
    });

    server.use('/_offline/assets', express.static(assetsDir, {
      fallthrough: false,
      index: false,
      setHeaders(res) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      },
    }));
  } else {
    console.log('[OfflineServer] No offline package found. Running in online mode.');
  }

  server.all('*', (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    return handle(req, res, parsedUrl);
  });

  return new Promise((resolve) => {
    const listener = server.listen(resolvedPort, () => {
      console.log(`[OfflineServer] Ready on http://localhost:${resolvedPort}`);
      resolve(listener);
    });
  });
}

module.exports = { startServer };

if (require.main === module) {
  startServer().catch((error) => {
    console.error('[OfflineServer] Failed to start:', error);
    process.exit(1);
  });
}

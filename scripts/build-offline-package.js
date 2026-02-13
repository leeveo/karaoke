#!/usr/bin/env node
/**
 * Build a fully offline-ready package for a specific event.
 * Downloads event metadata, categories, songs (video + cover images)
 * and generates a manifest consumable by the kiosk shell (Electron/Tauri).
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { createClient } = require('@supabase/supabase-js');
const {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} = require('@aws-sdk/client-s3');

// Load environment variables (prefer .env.local if available)
const dotenv = require('dotenv');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const eventId = process.argv[2];
if (!eventId) {
  console.error('Usage: node scripts/build-offline-package.js <eventId>');
  process.exit(1);
}

const REQUIRED_ENV = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const awsRegion = process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3';
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
const awsSecretKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;

if (!awsAccessKeyId || !awsSecretKey) {
  console.error('Missing AWS credentials. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.');
  process.exit(1);
}

const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage';
const BASE_PATH = process.env.OFFLINE_S3_BASE_PATH || 'karaokesaas';

const s3Client = new S3Client({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretKey,
  },
});

const ROOT_DIR = path.join(process.cwd(), 'offline-packages', eventId);
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const SONGS_DIR = path.join(ASSETS_DIR, 'songs');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const EVENT_ASSETS_DIR = path.join(ASSETS_DIR, 'event');

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function cleanOutputDir() {
  await fs.promises.rm(ROOT_DIR, { recursive: true, force: true });
  await ensureDir(SONGS_DIR);
  await ensureDir(IMAGES_DIR);
  await ensureDir(EVENT_ASSETS_DIR);
}

function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9_.-]/gi, '_');
}

async function fetchEventMetadata(id) {
  console.log(`[OfflinePackage] Fetching event ${id} from Supabase...`);
  const { data, error } = await supabase
    .from('events')
    .select(`*, customization: event_customizations (*)`)
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`Unable to fetch event ${id}: ${error.message}`);
  }

  return data;
}

async function downloadSupabaseAsset(subfolder, filename, targetFile) {
  if (!filename) return null;
  const storagePath = `${subfolder}/${filename}`;
  console.log(`[OfflinePackage] Downloading Supabase asset ${storagePath}`);
  const { data, error } = await supabase.storage
    .from('karaokestorage')
    .download(storagePath);

  if (error) {
    console.warn(`[OfflinePackage] Failed to download ${storagePath}: ${error.message}`);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await ensureDir(path.dirname(targetFile));
  await fs.promises.writeFile(targetFile, buffer);
  return targetFile;
}

async function listCategories() {
  console.log('[OfflinePackage] Listing categories from S3...');
  const categories = new Set();
  let continuationToken;

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${BASE_PATH}/`,
      Delimiter: '/',
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    (response.CommonPrefixes || []).forEach((prefix) => {
      if (prefix.Prefix) {
        const clean = prefix.Prefix
          .replace(`${BASE_PATH}/`, '')
          .replace(/\/$/, '')
          .trim();
        if (clean) categories.add(clean);
      }
    });
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const result = Array.from(categories);
  console.log(`[OfflinePackage] Found ${result.length} categories`);
  return result;
}

async function listSongsForCategory(category) {
  console.log(`[OfflinePackage] Listing songs for category ${category}...`);
  const fileMap = new Map();
  let continuationToken;

  const prefix = `${BASE_PATH}/${category}/`;

  const addObject = (item) => {
    if (!item.Key || item.Key.endsWith('/')) return;
    const fileName = path.basename(item.Key);
    if (fileName.startsWith('.')) return;
    const baseName = fileName.replace(/\.(mp4|png|jpg|jpeg)$/i, '');
    const ext = path.extname(fileName).toLowerCase();

    if (!fileMap.has(baseName)) {
      fileMap.set(baseName, {});
    }

    const entry = fileMap.get(baseName);
    if (ext === '.mp4') {
      entry.video = {
        key: item.Key,
        size: item.Size || 0,
        lastModified: item.LastModified ? new Date(item.LastModified).toISOString() : null,
      };
    } else if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      if (!entry.image || ext === '.jpg' || ext === '.jpeg') {
        entry.image = {
          key: item.Key,
          ext,
        };
      }
    }
  };

  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });
    const response = await s3Client.send(command);
    (response.Contents || []).forEach(addObject);
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  const songs = [];
  for (const [baseName, info] of fileMap.entries()) {
    if (!info.video) continue;
    const titleArtist = parseFileName(baseName);
    songs.push({
      key: info.video.key,
      title: titleArtist.title,
      artist: titleArtist.artist,
      size: info.video.size,
      lastModified: info.video.lastModified,
      imageKey: info.image?.key || null,
      category,
    });
  }

  console.log(`[OfflinePackage] ${songs.length} songs queued for ${category}`);
  return songs;
}

function parseFileName(fileName) {
  const parts = fileName.split('-');
  if (parts.length >= 2) {
    const title = parts[0].trim();
    const artist = parts[1].trim().split('_')[0];
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      artist: artist.charAt(0).toUpperCase() + artist.slice(1),
    };
  }
  return { title: fileName, artist: 'Artiste inconnu' };
}

async function downloadS3Object(key, destination) {
  const command = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key });
  const response = await s3Client.send(command);
  if (!response.Body) {
    throw new Error(`S3 object ${key} has no body`);
  }
  await ensureDir(path.dirname(destination));
  const writeStream = fs.createWriteStream(destination);
  await pipeline(response.Body, writeStream);
  return destination;
}

async function downloadSongAssets(song) {
  const videoFileName = sanitizeFileName(path.basename(song.key));
  const videoTarget = path.join(SONGS_DIR, song.category, videoFileName);
  await downloadS3Object(song.key, videoTarget);

  let imageRelative = null;
  if (song.imageKey) {
    const imageFileName = sanitizeFileName(path.basename(song.imageKey));
    const imageTarget = path.join(IMAGES_DIR, song.category, imageFileName);
    await downloadS3Object(song.imageKey, imageTarget);
    imageRelative = path.relative(ROOT_DIR, imageTarget).replace(/\\/g, '/');
  }

  const videoRelative = path.relative(ROOT_DIR, videoTarget).replace(/\\/g, '/');
  return {
    key: song.key,
    title: song.title,
    artist: song.artist,
    size: song.size,
    lastModified: song.lastModified,
    videoPath: videoRelative,
    imagePath: imageRelative,
  };
}

async function createManifest(eventMeta, categoriesPayload) {
  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify({
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      event: eventMeta,
      categories: categoriesPayload,
    }, null, 2)
  );
  return manifestPath;
}

async function main() {
  console.log(`[OfflinePackage] Starting offline bundle generation for ${eventId}`);
  await cleanOutputDir();

  const event = await fetchEventMetadata(eventId);
  const eventAssets = {
    logoPath: null,
    backgroundPath: null,
  };

  if (event.customization?.logo) {
    const logoExt = path.extname(event.customization.logo) || '.png';
    const logoTarget = path.join(EVENT_ASSETS_DIR, `logo${logoExt}`);
    const downloaded = await downloadSupabaseAsset('logos', event.customization.logo, logoTarget);
    if (downloaded) {
      eventAssets.logoPath = path.relative(ROOT_DIR, downloaded).replace(/\\/g, '/');
    }
  }

  if (event.customization?.background_image) {
    const bgExt = path.extname(event.customization.background_image) || '.jpg';
    const bgTarget = path.join(EVENT_ASSETS_DIR, `background${bgExt}`);
    const downloaded = await downloadSupabaseAsset('backgrounds', event.customization.background_image, bgTarget);
    if (downloaded) {
      eventAssets.backgroundPath = path.relative(ROOT_DIR, downloaded).replace(/\\/g, '/');
    }
  }

  const categories = await listCategories();
  const categoriesPayload = [];

  for (const category of categories) {
    const songs = await listSongsForCategory(category);
    const offlineSongs = [];
    for (const song of songs) {
      try {
        const offlineSong = await downloadSongAssets(song);
        offlineSongs.push(offlineSong);
      } catch (error) {
        console.warn(`[OfflinePackage] Failed to download song ${song.key}: ${error.message}`);
      }
    }
    categoriesPayload.push({
      id: category,
      label: category,
      songs: offlineSongs,
    });
  }

  const manifestEvent = {
    id: event.id,
    name: event.name,
    description: event.description || '',
    date: event.date,
    customization: {
      primary_color: event.customization?.primary_color,
      secondary_color: event.customization?.secondary_color,
      style_pack: event.customization?.style_pack || '2sevres',
    },
    assets: eventAssets,
  };

  await createManifest(manifestEvent, categoriesPayload);

  await fs.promises.writeFile(
    path.join(ROOT_DIR, 'README.md'),
    `# Offline Package for Event ${event.name || eventId}

Generated at ${new Date().toISOString()}.

Structure:
- assets/event → logo/background
- assets/songs → MP4 files organized by category
- assets/images → cover images organized by category
- manifest.json → metadata consumed by the kiosk shell.

You can now point the Electron/Tauri shell to this folder to operate fully offline.
`
  );

  console.log(`[OfflinePackage] ✅ Offline assets ready in ${ROOT_DIR}`);
}

main().catch((err) => {
  console.error('[OfflinePackage] ❌ Fatal error:', err);
  process.exit(1);
});

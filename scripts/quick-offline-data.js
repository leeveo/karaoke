#!/usr/bin/env node
/**
 * Quick Offline Data Generator - Génère des données offline pour un événement
 * avec seulement les catégories spécifiées (pour des tests rapides)
 * 
 * Usage:
 *   node scripts/quick-offline-data.js <eventId> [categories...]
 *   node scripts/quick-offline-data.js 6c88be73-1157-422f-bd69-c436005cc807 rock
 */

const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');

// Load environment variables
const dotenv = require('dotenv');
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const eventId = process.argv[2];
const requestedCategories = process.argv.slice(3);

if (!eventId) {
  console.error('Usage: node scripts/quick-offline-data.js <eventId> [categories...]');
  console.error('Example: node scripts/quick-offline-data.js 6c88be73-... rock');
  process.exit(1);
}

// Default to just 'rock' if no categories specified
const categoriesToDownload = requestedCategories.length > 0 ? requestedCategories : ['rock'];

console.log(`[QuickData] Event: ${eventId}`);
console.log(`[QuickData] Categories: ${categoriesToDownload.join(', ')}`);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const s3Client = new S3Client({
  region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage';
const BASE_PATH = process.env.OFFLINE_S3_BASE_PATH || 'karaokesaas';

// Output to .packages/test-offline/offline-data for quick testing
const TEST_DIR = path.join(process.cwd(), '.packages', 'test-offline');
const ROOT_DIR = path.join(TEST_DIR, 'offline-data', eventId);
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
  console.log(`[QuickData] Fetching event ${id} from Supabase...`);
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
  console.log(`[QuickData] Downloading Supabase asset ${storagePath}`);
  const { data, error } = await supabase.storage
    .from('karaokestorage')
    .download(storagePath);

  if (error) {
    console.warn(`[QuickData] Failed to download ${storagePath}: ${error.message}`);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await ensureDir(path.dirname(targetFile));
  await fs.promises.writeFile(targetFile, buffer);
  return targetFile;
}

async function listSongsForCategory(category, maxSongs = 3) {
  console.log(`[QuickData] Listing songs for category ${category} (max ${maxSongs})...`);
  const prefix = `${BASE_PATH}/${category}/`;

  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: prefix,
    MaxKeys: 100,
  });

  const response = await s3Client.send(command);
  const contents = response.Contents || [];

  const songs = contents
    .filter((obj) => obj.Key && obj.Key.endsWith('.mp4'))
    .slice(0, maxSongs) // Limit for quick testing
    .map((obj) => {
      const key = obj.Key;
      const fileName = path.basename(key, '.mp4');
      const parts = fileName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Unknown';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : fileName;

      const imageKey = key.replace('.mp4', '.jpg');
      const hasImage = contents.some((c) => c.Key === imageKey);

      return {
        key,
        title,
        artist,
        size: obj.Size,
        lastModified: obj.LastModified?.toISOString(),
        category,
        imageKey: hasImage ? imageKey : null,
      };
    });

  console.log(`[QuickData] Found ${songs.length} songs for ${category}`);
  return songs;
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
  
  console.log(`[QuickData] Downloading: ${song.title}`);
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

async function main() {
  console.log(`[QuickData] ============================================================`);
  console.log(`[QuickData] Quick Offline Data Generator`);
  console.log(`[QuickData] ============================================================`);
  
  await cleanOutputDir();

  const event = await fetchEventMetadata(eventId);
  const eventAssets = { logoPath: null, backgroundPath: null };

  // Download event assets (logo, background)
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

  // Download songs for each requested category
  const categoriesPayload = [];
  
  for (const category of categoriesToDownload) {
    const songs = await listSongsForCategory(category, 3); // Max 3 songs per category for speed
    const offlineSongs = [];
    
    for (const song of songs) {
      try {
        const offlineSong = await downloadSongAssets(song);
        offlineSongs.push(offlineSong);
      } catch (error) {
        console.warn(`[QuickData] Failed to download song ${song.key}: ${error.message}`);
      }
    }
    
    categoriesPayload.push({
      id: category,
      label: category,
      songs: offlineSongs,
    });
  }

  // Create manifest
  const manifestEvent = {
    id: event.id,
    name: event.name,
    description: event.description || '',
    date: event.date,
    customization: {
      primary_color: event.customization?.primary_color || '#0334b9',
      secondary_color: event.customization?.secondary_color || '#2fb9db',
    },
    assets: eventAssets,
  };

  const manifestPath = path.join(ROOT_DIR, 'manifest.json');
  await fs.promises.writeFile(
    manifestPath,
    JSON.stringify({
      version: '1.0.0',
      generatedAt: new Date().toISOString(),
      event: manifestEvent,
      categories: categoriesPayload,
    }, null, 2)
  );

  console.log(`[QuickData] ============================================================`);
  console.log(`[QuickData] ✅ Done! Offline data ready in:`);
  console.log(`[QuickData]    ${ROOT_DIR}`);
  console.log(`[QuickData] `);
  console.log(`[QuickData] To test, run:`);
  console.log(`[QuickData]    npm run test:quick`);
  console.log(`[QuickData] ============================================================`);
}

main().catch((err) => {
  console.error('[QuickData] ❌ Fatal error:', err);
  process.exit(1);
});

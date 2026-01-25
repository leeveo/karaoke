#!/usr/bin/env node
/**
 * Full Offline Data Generator - Génère les données offline COMPLÈTES
 * Télécharge TOUTES les catégories et TOUTES les chansons
 * 
 * Usage:
 *   node scripts/full-offline-data.js <eventId>
 *   node scripts/full-offline-data.js 6c88be73-1157-422f-bd69-c436005cc807
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

const eventId = process.argv[2] || '6c88be73-1157-422f-bd69-c436005cc807';

console.log(`[FullData] ============================================================`);
console.log(`[FullData] FULL Offline Data Generator - ALL CATEGORIES, ALL SONGS`);
console.log(`[FullData] Event: ${eventId}`);
console.log(`[FullData] ============================================================`);

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

// Output to .packages/test-offline/offline-data
const TEST_DIR = path.join(process.cwd(), '.packages', 'test-offline');
const ROOT_DIR = path.join(TEST_DIR, 'offline-data', eventId);
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const SONGS_DIR = path.join(ASSETS_DIR, 'songs');
const IMAGES_DIR = path.join(ASSETS_DIR, 'images');
const EVENT_ASSETS_DIR = path.join(ASSETS_DIR, 'event');

// Progress tracking
let totalSongsToDownload = 0;
let downloadedSongs = 0;
let failedSongs = 0;

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function cleanOutputDir() {
  console.log(`[FullData] Cleaning output directory...`);
  await fs.promises.rm(ROOT_DIR, { recursive: true, force: true });
  await ensureDir(SONGS_DIR);
  await ensureDir(IMAGES_DIR);
  await ensureDir(EVENT_ASSETS_DIR);
}

function sanitizeFileName(name) {
  return name.replace(/[^a-z0-9_.-]/gi, '_');
}

async function fetchEventMetadata(id) {
  console.log(`[FullData] Fetching event ${id} from Supabase...`);
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
  console.log(`[FullData] Downloading Supabase asset ${storagePath}`);
  const { data, error } = await supabase.storage
    .from('karaokestorage')
    .download(storagePath);

  if (error) {
    console.warn(`[FullData] Failed to download ${storagePath}: ${error.message}`);
    return null;
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  await ensureDir(path.dirname(targetFile));
  await fs.promises.writeFile(targetFile, buffer);
  return targetFile;
}

async function listAllCategories() {
  console.log(`[FullData] Discovering all categories in S3...`);
  const command = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: `${BASE_PATH}/`,
    Delimiter: '/',
  });

  const response = await s3Client.send(command);
  const categories = (response.CommonPrefixes || [])
    .map(p => p.Prefix.replace(`${BASE_PATH}/`, '').replace('/', ''))
    .filter(c => c && c !== 'all'); // Exclude 'all' as it's a meta-category

  console.log(`[FullData] Found ${categories.length} categories: ${categories.join(', ')}`);
  return categories;
}

async function listAllSongsForCategory(category) {
  console.log(`[FullData] Listing ALL songs for category: ${category}...`);
  const prefix = `${BASE_PATH}/${category}/`;
  
  let allContents = [];
  let continuationToken = undefined;
  
  // Paginate through all objects in the category
  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    allContents = allContents.concat(response.Contents || []);
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  const songs = allContents
    .filter((obj) => obj.Key && obj.Key.endsWith('.mp4'))
    .map((obj) => {
      const key = obj.Key;
      const fileName = path.basename(key, '.mp4');
      const parts = fileName.split(' - ');
      const artist = parts.length > 1 ? parts[0].trim() : 'Unknown';
      const title = parts.length > 1 ? parts.slice(1).join(' - ').trim() : fileName;

      const imageKey = key.replace('.mp4', '.jpg');
      const hasImage = allContents.some((c) => c.Key === imageKey);

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

  console.log(`[FullData] Found ${songs.length} songs in ${category}`);
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

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

async function downloadSongAssets(song) {
  const videoFileName = sanitizeFileName(path.basename(song.key));
  const videoTarget = path.join(SONGS_DIR, song.category, videoFileName);
  
  downloadedSongs++;
  const progress = `[${downloadedSongs}/${totalSongsToDownload}]`;
  const size = formatSize(song.size || 0);
  console.log(`${progress} Downloading: ${song.artist} - ${song.title} (${size})`);
  
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
  const startTime = Date.now();
  
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

  // Get all categories
  const categories = await listAllCategories();
  
  // First pass: count all songs
  console.log(`\n[FullData] Counting all songs...`);
  const categorySongs = {};
  for (const category of categories) {
    const songs = await listAllSongsForCategory(category);
    categorySongs[category] = songs;
    totalSongsToDownload += songs.length;
  }
  
  console.log(`\n[FullData] ============================================================`);
  console.log(`[FullData] Total songs to download: ${totalSongsToDownload}`);
  console.log(`[FullData] ============================================================\n`);

  // Second pass: download all songs
  const categoriesPayload = [];
  
  for (const category of categories) {
    console.log(`\n[FullData] === Processing category: ${category.toUpperCase()} ===`);
    const songs = categorySongs[category];
    const offlineSongs = [];
    
    for (const song of songs) {
      try {
        const offlineSong = await downloadSongAssets(song);
        offlineSongs.push(offlineSong);
      } catch (error) {
        failedSongs++;
        console.error(`[FullData] ❌ Failed to download: ${song.title} - ${error.message}`);
      }
    }
    
    categoriesPayload.push({
      id: category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
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

  const elapsed = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
  const successRate = totalSongsToDownload > 0 
    ? ((downloadedSongs - failedSongs) / totalSongsToDownload * 100).toFixed(1)
    : 100;

  console.log(`\n[FullData] ============================================================`);
  console.log(`[FullData] ✅ COMPLETE!`);
  console.log(`[FullData]    Time: ${elapsed} minutes`);
  console.log(`[FullData]    Songs: ${downloadedSongs - failedSongs}/${totalSongsToDownload} (${successRate}% success)`);
  console.log(`[FullData]    Categories: ${categories.length}`);
  console.log(`[FullData]    Output: ${ROOT_DIR}`);
  console.log(`[FullData] ============================================================`);
  
  if (failedSongs > 0) {
    console.log(`[FullData] ⚠️  ${failedSongs} songs failed to download`);
  }
}

main().catch((err) => {
  console.error('[FullData] ❌ Fatal error:', err);
  process.exit(1);
});

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from 'node:fs';
import path from 'node:path';

// Configuration du client S3 côté serveur (sécurisé)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  requestHandler: {
    requestTimeout: 10000, // Timeout de 10 secondes
  },
  maxAttempts: 3, // Retry jusqu'à 3 fois
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage';
const BASE_PATH = 'karaokesaas';
let offlineManifestCache: OfflineManifest | null = null;
let offlineManifestMtime = 0;
let offlineManifestPath: string | null = null;

// Configuration pour Next.js
export const maxDuration = 30; // 30 secondes max
export const dynamic = 'force-dynamic';

interface Song {
  key: string;
  title: string;
  artist: string;
  size?: number;
  lastModified?: Date;
  imageUrl?: string;
  categoryId?: string;
}

function parseFileName(fileName: string): { title: string; artist: string } {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const parts = nameWithoutExt.split('-');
  
  if (parts.length >= 2) {
    const title = parts[0].trim();
    const artist = parts[1].trim().split('_')[0];
    
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      artist: artist.charAt(0).toUpperCase() + artist.slice(1)
    };
  }
  
  return {
    title: nameWithoutExt,
    artist: 'Artiste inconnu'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const category = searchParams.get('category');
    const songKey = searchParams.get('key');
    const offlineManifest = getOfflineManifest();

    console.log(`[API Songs] Action: ${action}, Category: ${category}, Key: ${songKey}`);
    console.log(`[API Songs] AWS Config - Region: ${process.env.AWS_REGION}, Bucket: ${BUCKET_NAME}`);
    console.log(`[API Songs] AWS Credentials - AccessKeyId présent: ${!!process.env.AWS_ACCESS_KEY_ID}`);

    if (offlineManifest) {
      if (action === 'categories') {
        const categories = getOfflineCategories(offlineManifest);
        return NextResponse.json(categories.length ? categories : ['pop', 'rock', 'rap', 'français', 'anglais', 'latino']);
      }

      if (action === 'songs' && category) {
        const songs = getOfflineSongsForCategory(offlineManifest, category);
        if (!songs) {
          return NextResponse.json(
            { error: `Catégorie ${category} introuvable dans le manifest offline` },
            { status: 404 }
          );
        }
        return NextResponse.json(songs);
      }

      if (action === 'url' && songKey) {
        const offlineUrl = getOfflineSongUrl(offlineManifest, songKey);
        if (!offlineUrl) {
          return NextResponse.json(
            { error: 'Chanson introuvable dans le manifest offline' },
            { status: 404 }
          );
        }
        return NextResponse.json({ url: offlineUrl });
      }
    }

    // Headers de cache pour améliorer les performances (30 minutes)
    const cacheHeaders = {
      'Cache-Control': 'public, max-age=1800, stale-while-revalidate=3600',
    };

    // Action: Récupérer les catégories
    if (action === 'categories') {
      console.log(`[API Songs] Récupération des catégories...`);
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: BASE_PATH + '/',
        Delimiter: '/'
      });

      const response = await s3Client.send(command);
      const categories: string[] = [];

      if (response.CommonPrefixes && response.CommonPrefixes.length > 0) {
        for (const prefix of response.CommonPrefixes) {
          if (prefix.Prefix) {
            const cat = prefix.Prefix.replace(BASE_PATH + '/', '').replace('/', '');
            if (cat) {
              categories.push(cat);
            }
          }
        }
      }

      if (categories.length === 0) {
        console.log(`[API Songs] Aucune catégorie trouvée, utilisation des valeurs par défaut`);
        return NextResponse.json(['pop', 'rock', 'rap', 'français', 'anglais', 'latino'], { headers: cacheHeaders });
      }

      console.log(`[API Songs] ${categories.length} catégories trouvées:`, categories);
      return NextResponse.json(categories, { headers: cacheHeaders });
    }

    // Action: Récupérer les chansons d'une catégorie
    if (action === 'songs' && category) {
      console.log(`[API Songs] Récupération des chansons pour: ${category}`);
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${BASE_PATH}/${category}/`
      });

      const response = await s3Client.send(command);
      const songs: Song[] = [];
      const fileMap = new Map<string, { video?: { Key?: string; LastModified?: Date; Size?: number }; image?: string }>();

      // Premier passage : regrouper les fichiers vidéo et image
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key && 
              item.Key !== `${BASE_PATH}/${category}/` && 
              !item.Key.split('/').pop()?.startsWith('.')) {
            
            const fileName = item.Key.split('/').pop() || '';
            const baseName = fileName.replace(/\.(mp4|png|jpg|jpeg)$/i, '');
            
            if (!fileMap.has(baseName)) {
              fileMap.set(baseName, {});
            }
            
            const fileData = fileMap.get(baseName)!;
            
            if (fileName.match(/\.mp4$/i)) {
              fileData.video = {
                Key: item.Key,
                LastModified: item.LastModified,
                Size: item.Size
              };
            } else if (fileName.match(/\.(jpg|jpeg|png)$/i)) {
              // Construire l'URL de l'image - donner la priorité aux JPG
              const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${item.Key}`;
              
              // Ne remplacer l'image que si c'est un JPG/JPEG ou si on n'a pas encore d'image
              if (fileName.match(/\.(jpg|jpeg)$/i) || !fileData.image) {
                fileData.image = imageUrl;
              }
            }
          }
        }
      }

      // Deuxième passage : créer les objets Song
      for (const [baseName, fileData] of fileMap.entries()) {
        if (fileData.video && fileData.video.Key) {
          const { title, artist } = parseFileName(baseName);
          
          songs.push({
            key: fileData.video.Key,
            title,
            artist,
            size: fileData.video.Size,
            lastModified: fileData.video.LastModified,
            imageUrl: fileData.image,
            categoryId: category
          });
        }
      }

      console.log(`[API Songs] ${songs.length} chansons trouvées pour ${category}`);
      return NextResponse.json(songs, { headers: cacheHeaders });
    }

    // Action: Obtenir une URL signée pour une chanson
    if (action === 'url' && songKey) {
      console.log(`[API Songs] Génération d'URL signée pour: ${songKey}`);
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: songKey,
      });

      // Générer une URL signée valide pour 1 heure
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log(`[API Songs] URL signée générée avec succès`);
      
      return NextResponse.json({ url: signedUrl });
    }

    console.warn(`[API Songs] Action non valide: ${action}`);
    return NextResponse.json(
      { error: 'Action non valide' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const err = error as Error & { $metadata?: { httpStatusCode?: number; requestId?: string }; message?: string };
    console.error('[API Songs] Erreur:', err);
    console.error('[API Songs] Détails:', {
      name: err.name,
      message: err.message,
      code: err.$metadata?.httpStatusCode,
      requestId: err.$metadata?.requestId
    });
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des données',
        details: err.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function resolveOfflineManifestPath() {
  const explicit = process.env.OFFLINE_MANIFEST_PATH;
  if (explicit && fs.existsSync(explicit)) {
    return explicit;
  }

  const packageRoot = process.env.OFFLINE_PACKAGE_ROOT
    ? path.resolve(process.env.OFFLINE_PACKAGE_ROOT)
    : null;

  const candidates: string[] = [];

  if (packageRoot && fs.existsSync(packageRoot)) {
    candidates.push(path.join(packageRoot, 'manifest.json'));
  }

  const offlineDataDir = path.join(process.cwd(), 'offline-data');
  if (fs.existsSync(offlineDataDir) && fs.statSync(offlineDataDir).isDirectory()) {
    const nested = fs
      .readdirSync(offlineDataDir)
      .map((entry) => path.join(offlineDataDir, entry, 'manifest.json'));
    candidates.push(...nested);
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getOfflineManifest(): OfflineManifest | null {
  const manifestPath = resolveOfflineManifestPath();
  if (!manifestPath) {
    return null;
  }

  try {
    const stats = fs.statSync(manifestPath);
    const hasChanged =
      manifestPath !== offlineManifestPath ||
      !offlineManifestCache ||
      stats.mtimeMs !== offlineManifestMtime;

    if (hasChanged) {
      const raw = fs.readFileSync(manifestPath, 'utf-8');
      offlineManifestCache = JSON.parse(raw) as OfflineManifest;
      offlineManifestMtime = stats.mtimeMs;
      offlineManifestPath = manifestPath;
    }
    return offlineManifestCache;
  } catch (error) {
    console.warn('[API Songs] Impossible de charger le manifest offline:', (error as Error).message);
    return null;
  }
}

function getOfflineCategories(manifest: OfflineManifest) {
  const categories = manifest.categories?.map((cat) => cat.label || cat.id).filter(Boolean) as string[] | undefined;
  if (!categories || !categories.length) {
    return [] as string[];
  }
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const category of categories) {
    const normalized = normalizeCategory(category);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      deduped.push(category);
    }
  }
  return deduped;
}

function getOfflineSongsForCategory(manifest: OfflineManifest, category: string) {
  const target = findOfflineCategory(manifest, category);
  if (!target) {
    return null;
  }

  return (target.songs || []).map((song, index) => {
    const key = song.key || song.videoPath || `${target.id || target.label || 'category'}-${index}`;
    return {
      key,
      title: song.title || 'Titre inconnu',
      artist: song.artist || 'Artiste inconnu',
      size: song.size || undefined,
      lastModified: song.lastModified ? new Date(song.lastModified) : undefined,
      imageUrl: toOfflineUrl(song.imagePath),
      categoryId: target.id || target.label || category,
    };
  });
}

function getOfflineSongUrl(manifest: OfflineManifest, key: string) {
  for (const category of manifest.categories || []) {
    for (const song of category.songs || []) {
      if (song.key === key || song.videoPath === key) {
        const url = toOfflineUrl(song.videoPath);
        if (url) {
          return url;
        }
      }
    }
  }
  return null;
}

function findOfflineCategory(manifest: OfflineManifest, category: string) {
  const normalized = normalizeCategory(category);
  return (manifest.categories || []).find((cat) => {
    const matchesId = cat.id && normalizeCategory(cat.id) === normalized;
    const matchesLabel = cat.label && normalizeCategory(cat.label) === normalized;
    return matchesId || matchesLabel;
  });
}

function normalizeCategory(input?: string | null) {
  return (input || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();
}

function toOfflineUrl(assetPath?: string | null) {
  if (!assetPath) {
    return undefined;
  }

  const sanitized = assetPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/^assets\//, '');

  return `/_offline/assets/${sanitized}`;
}

type OfflineManifest = {
  categories?: Array<{ id?: string; label?: string; songs?: Array<OfflineManifestSong> }>;
};

type OfflineManifestSong = {
  key?: string;
  title?: string;
  artist?: string;
  size?: number;
  lastModified?: string;
  videoPath?: string | null;
  imagePath?: string | null;
};

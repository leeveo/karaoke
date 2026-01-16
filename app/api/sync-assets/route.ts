import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import fs from 'node:fs';

let offlineManifestCache: OfflineManifest | null = null;
let offlineManifestMtime = 0;
let offlineManifestPath: string | null = null;

export async function POST(request: NextRequest) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Missing eventId' },
        { status: 400 }
      );
    }

    const offlinePayload = getOfflinePayload(eventId);
    if (offlinePayload) {
      return NextResponse.json(offlinePayload);
    }

    const { data: eventSongs, error: songsError } = await supabase
      .from('event_songs')
      .select('id, title, video_url, artist')
      .eq('event_id', eventId);

    if (songsError) {
      console.error('Error fetching songs:', songsError);
      return NextResponse.json(
        { error: 'Failed to fetch songs' },
        { status: 500 }
      );
    }

    const { data: customization, error: customError } = await supabase
      .from('event_customization')
      .select('logo, background_image, logoUrl, backgroundImageUrl')
      .eq('event_id', eventId)
      .single();

    if (customError && customError.code !== 'PGRST116') {
      console.error('Error fetching customization:', customError);
    }

    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error fetching event:', eventError);
    }

    const assets = {
      songs: (eventSongs || []).map(song => ({
        id: song.id,
        title: song.title,
        artist: song.artist,
        url: song.video_url,
        type: 'video/mp4',
      })),
      images: [] as Array<{ id: string; url: string; type: 'logo' | 'background' }>,
      metadata: {
        eventId,
        eventName: event?.name || 'Karaoke Event',
        totalSongs: (eventSongs || []).length,
        generatedAt: new Date().toISOString(),
      },
    };

    if (customization?.logoUrl || customization?.logo) {
      const logoUrl = customization.logoUrl || customization.logo;
      if (logoUrl && logoUrl.startsWith('http')) {
        assets.images.push({
          id: 'logo',
          url: logoUrl,
          type: 'logo',
        });
      }
    }

    if (customization?.backgroundImageUrl || customization?.background_image) {
      const bgUrl = customization.backgroundImageUrl || customization.background_image;
      if (bgUrl && bgUrl.startsWith('http')) {
        assets.images.push({
          id: 'background',
          url: bgUrl,
          type: 'background',
        });
      }
    }

    return NextResponse.json({
      success: true,
      assets,
      totalAssets: assets.songs.length + assets.images.length,
      estimatedSize: calculateEstimatedSize(assets.songs.length),
    });
  } catch (error) {
    console.error('Sync assets error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function calculateEstimatedSize(songCount: number): string {
  const sizeInMB = songCount * 10 + 5;
  return `${sizeInMB.toFixed(1)}MB`;
}

function getOfflinePayload(eventId: string) {
  const manifest = getOfflineManifest();
  if (!manifest) {
    return null;
  }

  if (manifest.event?.id && manifest.event.id !== eventId) {
    console.warn('[OfflineSync] Manifest event does not match requested event. Continuing with manifest data.');
  }

  const songs: Array<{ id: string; title: string; artist: string; url: string; type: string }> = [];
  let totalBytes = 0;

  manifest.categories?.forEach((category) => {
    const categoryId = category.id || category.label || 'category';
    category.songs?.forEach((song, index) => {
      const normalizedPath = normalizeAssetPath(song.videoPath);
      if (!normalizedPath) {
        return;
      }
      totalBytes += song.size || 0;
      songs.push({
        id: `${categoryId}-${song.key || index}`,
        title: song.title,
        artist: song.artist,
        url: `/_offline/assets/${normalizedPath}`,
        type: 'video/mp4',
      });
    });
  });

  const images = buildOfflineImages(manifest.event?.assets);

  return {
    success: true,
    assets: {
      songs,
      images,
      metadata: {
        eventId: manifest.event?.id || eventId,
        eventName: manifest.event?.name || 'Karaoke Event',
        totalSongs: songs.length,
        generatedAt: manifest.generatedAt || new Date().toISOString(),
      },
    },
    totalAssets: songs.length + images.length,
    estimatedSize: formatOfflineSize(totalBytes, songs.length),
  };
}

function getOfflineManifest(): OfflineManifest | null {
  const manifestPath = process.env.OFFLINE_MANIFEST_PATH || null;
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
    console.warn('[OfflineSync] Unable to read offline manifest:', (error as Error).message);
    return null;
  }
}

function buildOfflineImages(assets?: OfflineEventAssets | null) {
  if (!assets) {
    return [] as Array<{ id: string; url: string; type: 'logo' | 'background' }>;
  }

  const output: Array<{ id: string; url: string; type: 'logo' | 'background' }> = [];
  const logoPath = normalizeAssetPath(assets.logoPath);
  if (logoPath) {
    output.push({ id: 'logo', url: `/_offline/assets/${logoPath}`, type: 'logo' });
  }

  const backgroundPath = normalizeAssetPath(assets.backgroundPath);
  if (backgroundPath) {
    output.push({ id: 'background', url: `/_offline/assets/${backgroundPath}`, type: 'background' });
  }

  return output;
}

function normalizeAssetPath(rawPath?: string | null) {
  if (!rawPath) {
    return null;
  }

  const sanitized = rawPath
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/^\/+/, '');

  return sanitized.startsWith('assets/') ? sanitized.slice('assets/'.length) : sanitized;
}

function formatOfflineSize(totalBytes: number, songCount: number) {
  if (totalBytes > 0) {
    return `${(totalBytes / (1024 * 1024)).toFixed(1)}MB`;
  }
  const fallbackMb = songCount * 10 + 5;
  return `${fallbackMb.toFixed(1)}MB`;
}

type OfflineManifest = {
  generatedAt?: string;
  event?: {
    id?: string;
    name?: string;
    assets?: OfflineEventAssets;
  };
  categories?: Array<{
    id?: string;
    label?: string;
    songs?: OfflineManifestSong[];
  }>;
};

type OfflineEventAssets = {
  logoPath?: string | null;
  backgroundPath?: string | null;
};

type OfflineManifestSong = {
  key?: string;
  title: string;
  artist: string;
  videoPath?: string | null;
  size?: number;
};

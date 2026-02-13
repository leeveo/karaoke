import { fetchEventById } from '@/lib/supabase/events';
import { getOfflineEvent, OfflineEvent } from '@/lib/offline/db';
import { Event } from '@/types/event';
import { DEFAULT_STYLE_PACK_ID } from '@/lib/stylePacks';

const FALLBACK_PRIMARY = '#8b7355';
const FALLBACK_SECONDARY = '#c9a875';
const OFFLINE_ASSET_PREFIX = '/_offline/assets/';

interface OfflineManifestAssets {
  logoPath?: string | null;
  backgroundPath?: string | null;
}

interface OfflineManifestCustomization {
  primary_color?: string;
  secondary_color?: string;
  style_pack?: string;
}

interface OfflineManifestEvent {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  customization?: OfflineManifestCustomization;
  assets?: OfflineManifestAssets;
}

interface OfflineManifestSong {
  key: string;
  title?: string;
  artist?: string;
  size?: number;
  videoPath?: string;
  imagePath?: string;
}

interface OfflineManifestCategory {
  id: string;
  label: string;
  songs: OfflineManifestSong[];
}

interface OfflineManifestResponse {
  event?: OfflineManifestEvent;
  categories?: OfflineManifestCategory[];
}

const isBrowser = typeof window !== 'undefined';

const createBlobUrl = (blob?: Blob | null): string | undefined => {
  if (!blob || !isBrowser) {
    return undefined;
  }

  try {
    return URL.createObjectURL(blob);
  } catch (error) {
    console.warn('[EventLoader] Unable to create blob URL:', error);
    return undefined;
  }
};

const normalizeOfflineAssetPath = (rawPath?: string | null): string | null => {
  if (!rawPath) {
    return null;
  }

  return rawPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/^assets\//, '');
};

const toOfflineAssetUrl = (rawPath?: string | null): string | undefined => {
  const normalized = normalizeOfflineAssetPath(rawPath);
  if (!normalized) {
    return undefined;
  }
  return `${OFFLINE_ASSET_PREFIX}${normalized}`;
};

const isAbsoluteUrl = (value?: string | null): boolean => {
  if (!value) {
    return false;
  }
  return /^(https?:)?\/\//i.test(value) || value.startsWith('blob:') || value.startsWith('/_offline/');
};

const resolveAssetUrl = (rawValue?: string | null): string | undefined => {
  if (!rawValue) {
    return undefined;
  }

  if (isAbsoluteUrl(rawValue)) {
    return rawValue;
  }

  return toOfflineAssetUrl(rawValue) || rawValue;
};

const buildEventFromManifest = (manifestEvent: OfflineManifestEvent, fallbackId: string): Event => {
  const now = new Date().toISOString();
  const customization = manifestEvent.customization || {};
  const assets = manifestEvent.assets || {};

  return {
    id: manifestEvent.id || fallbackId,
    name: manifestEvent.name || 'Karaoke Offline',
    description: manifestEvent.description || '',
    date: manifestEvent.date || now,
    location: 'Offline',
    created_at: now,
    user_id: 'offline',
    is_active: true,
    customization: {
      primary_color: customization.primary_color || FALLBACK_PRIMARY,
      secondary_color: customization.secondary_color || FALLBACK_SECONDARY,
      background_image: null,
      backgroundImageUrl: toOfflineAssetUrl(assets.backgroundPath),
      logo: null,
      logoUrl: toOfflineAssetUrl(assets.logoPath),
      style_pack: customization.style_pack || DEFAULT_STYLE_PACK_ID,
    },
  };
};

const buildEventFromOfflineRecord = (offlineEvent: OfflineEvent): Event => {
  const now = new Date().toISOString();
  const customization = offlineEvent.customization || {
    primary_color: FALLBACK_PRIMARY,
    secondary_color: FALLBACK_SECONDARY,
  };

  const backgroundImageUrl =
    createBlobUrl(customization.backgroundImageBlob)
    || createBlobUrl(customization.backgroundBlob)
    || resolveAssetUrl(customization.background_image);

  const logoUrl = createBlobUrl(customization.logoBlob) || resolveAssetUrl(customization.logo);

  return {
    id: offlineEvent.id,
    name: offlineEvent.name,
    description: offlineEvent.description || '',
    date: now,
    location: 'Offline',
    created_at: now,
    user_id: 'offline',
    is_active: true,
    customization: {
      primary_color: customization.primary_color || FALLBACK_PRIMARY,
      secondary_color: customization.secondary_color || FALLBACK_SECONDARY,
      background_image: customization.background_image || null,
      backgroundImageUrl,
      logo: customization.logo || null,
      logoUrl,
      style_pack: customization.style_pack || DEFAULT_STYLE_PACK_ID,
    },
  };
};

const ensureCustomizationDefaults = (eventData: Event | null): Event | null => {
  if (!eventData) {
    return null;
  }

  if (!eventData.customization) {
    eventData.customization = {
      primary_color: FALLBACK_PRIMARY,
      secondary_color: FALLBACK_SECONDARY,
    };
    return eventData;
  }

  eventData.customization.primary_color = eventData.customization.primary_color || FALLBACK_PRIMARY;
  eventData.customization.secondary_color = eventData.customization.secondary_color || FALLBACK_SECONDARY;
  eventData.customization.style_pack = eventData.customization.style_pack || DEFAULT_STYLE_PACK_ID;

  if (!eventData.customization.backgroundImageUrl && eventData.customization.background_image) {
    const resolved = resolveAssetUrl(eventData.customization.background_image);
    if (resolved) {
      eventData.customization.backgroundImageUrl = resolved;
    }
  }

  if (!eventData.customization.logoUrl && eventData.customization.logo) {
    const resolved = resolveAssetUrl(eventData.customization.logo);
    if (resolved) {
      eventData.customization.logoUrl = resolved;
    }
  }

  return eventData;
};

const loadOfflineManifestEvent = async (eventId: string): Promise<Event | null> => {
  try {
    const response = await fetch('/api/offline/manifest', { cache: 'no-store' });
    if (!response.ok) {
      return null;
    }

    const manifest: OfflineManifestResponse = await response.json();
    if (!manifest?.event) {
      return null;
    }

    return buildEventFromManifest(manifest.event, eventId);
  } catch (error) {
    console.warn('[EventLoader] Unable to load offline manifest:', error);
    return null;
  }
};

// Détection du mode offline package (Electron via window.offlineKiosk ou localStorage)
const isOfflinePackage = (): boolean => {
  if (!isBrowser) return false;
  
  // Méthode 1: window.offlineKiosk exposé par preload.js d'Electron
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).offlineKiosk?.ready) return true;
  
  // Méthode 2: localStorage pour tests manuels
  if (localStorage.getItem('forceOfflineMode') === 'true') return true;
  
  return false;
};

export const loadEventWithOfflineFallback = async (eventId: string): Promise<Event | null> => {
  // En mode offline package: TOUJOURS offline first (navigator.onLine ment dans Electron)
  const offlineFirst = isOfflinePackage() || (isBrowser && !navigator.onLine);
  
  if (offlineFirst) {
    console.log('[EventLoader] 🔴 Mode offline - chargement local prioritaire');
  }

  const tryIndexedDb = async () => {
    try {
      const offlineEvent = await getOfflineEvent(eventId);
      if (offlineEvent) {
        return buildEventFromOfflineRecord(offlineEvent);
      }
    } catch (error) {
      console.warn('[EventLoader] Unable to read offline event:', error);
    }
    return null;
  };

  const tryManifest = async () => loadOfflineManifestEvent(eventId);

  if (offlineFirst) {
    const offlineEvent = await tryIndexedDb();
    if (offlineEvent) {
      return ensureCustomizationDefaults(offlineEvent);
    }

    const manifestEvent = await tryManifest();
    if (manifestEvent) {
      return ensureCustomizationDefaults(manifestEvent);
    }
  }

  try {
    const supabaseEvent = await fetchEventById(eventId);
    return ensureCustomizationDefaults(supabaseEvent);
  } catch (error) {
    console.warn('[EventLoader] Supabase fetch failed, trying offline fallbacks:', error);
  }

  const offlineEvent = await tryIndexedDb();
  if (offlineEvent) {
    return ensureCustomizationDefaults(offlineEvent);
  }

  const manifestEvent = await tryManifest();
  return ensureCustomizationDefaults(manifestEvent);
};

/**
 * Recherche l'URL locale d'une vidéo dans le manifest offline.
 * Utilisé en mode kiosk Electron pour charger les vidéos depuis le filesystem local.
 * @param songKey - La clé S3 de la chanson (ex: "karaokesaas/anglais/song.mp4")
 * @returns L'URL locale servie par express.static (ex: "/_offline/assets/songs/anglais/song.mp4")
 */
export const getOfflineVideoUrlFromManifest = async (songKey: string): Promise<string | null> => {
  try {
    console.log('[EventLoader] 🔌 Recherche vidéo offline pour:', songKey);
    const response = await fetch('/api/offline/manifest', { cache: 'no-store' });
    if (!response.ok) {
      console.warn('[EventLoader] Manifest non disponible');
      return null;
    }

    const manifest: OfflineManifestResponse = await response.json();
    if (!manifest?.categories || !Array.isArray(manifest.categories)) {
      console.warn('[EventLoader] Pas de catégories dans le manifest');
      return null;
    }

    // Extraire le nom du fichier depuis la clé S3
    // Formats possibles: "karaokesaas/anglais/song.mp4" ou "anglais/song.mp4" ou "song.mp4"
    const songFileName = songKey.split('/').pop() || songKey;
    
    // Chercher dans toutes les catégories
    for (const category of manifest.categories) {
      if (!category.songs) continue;
      
      const song = category.songs.find(s => {
        // Comparer par clé exacte ou par nom de fichier
        const sFileName = s.key.split('/').pop() || s.key;
        return s.key === songKey || sFileName === songFileName;
      });
      
      if (song && song.videoPath) {
        // Construire l'URL locale
        // videoPath est "assets/songs/anglais/file.mp4"
        // Le serveur sert /_offline/assets/* depuis {offlineRoot}/assets/*
        const videoUrl = `/_offline/${song.videoPath.replace(/^\.?\/?/, '')}`;
        console.log('[EventLoader] ✅ Vidéo trouvée:', videoUrl);
        return videoUrl;
      }
    }

    console.warn('[EventLoader] Chanson non trouvée dans le manifest:', songKey);
    return null;
  } catch (error) {
    console.error('[EventLoader] Erreur lors de la recherche vidéo offline:', error);
    return null;
  }
};

// Export de isOfflinePackage pour utilisation ailleurs
export { isOfflinePackage };

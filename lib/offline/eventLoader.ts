import { fetchEventById } from '@/lib/supabase/events';
import { getOfflineEvent, OfflineEvent } from '@/lib/offline/db';
import { Event } from '@/types/event';

const FALLBACK_PRIMARY = '#0334b9';
const FALLBACK_SECONDARY = '#2fb9db';
const OFFLINE_ASSET_PREFIX = '/_offline/assets/';

interface OfflineManifestAssets {
  logoPath?: string | null;
  backgroundPath?: string | null;
}

interface OfflineManifestCustomization {
  primary_color?: string;
  secondary_color?: string;
}

interface OfflineManifestEvent {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  customization?: OfflineManifestCustomization;
  assets?: OfflineManifestAssets;
}

interface OfflineManifestResponse {
  event?: OfflineManifestEvent;
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

export const loadEventWithOfflineFallback = async (eventId: string): Promise<Event | null> => {
  const offlineFirst = typeof navigator !== 'undefined' ? !navigator.onLine : false;

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

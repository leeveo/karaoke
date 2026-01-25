'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Song } from '@/services/s3Service';
import { motion } from 'framer-motion';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import { getOfflineEvent } from '@/lib/offline/db';
import { useIndexedDB } from '@/hooks/useOfflineMode';
import MusicTransitionLoader from '@/components/MusicTransitionLoader';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './swiper-custom.css';

const FALLBACK_BACKGROUND_GRADIENT = 'linear-gradient(135deg, #080424 0%, #160e40 100%)';

type OfflineManifestAssets = {
  logoPath?: string | null;
  backgroundPath?: string | null;
};

type OfflineManifestCustomization = {
  primary_color?: string;
  secondary_color?: string;
};

type OfflineManifestEvent = {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  customization?: OfflineManifestCustomization;
  assets?: OfflineManifestAssets;
};

type OfflineManifestSong = {
  key: string;
  title: string;
  artist: string;
  size?: number;
  videoPath?: string;
  imagePath?: string;
};

type OfflineManifestCategory = {
  id: string;
  label: string;
  songs: OfflineManifestSong[];
};

type OfflineManifestResponse = {
  event?: OfflineManifestEvent;
  categories?: OfflineManifestCategory[];
};

/**
 * Cache en mémoire pour le manifest offline
 * Évite de recharger le manifest à chaque navigation
 */
let manifestCache: OfflineManifestResponse | null = null;
let manifestCacheTimestamp = 0;
const MANIFEST_CACHE_TTL = 60 * 60 * 1000; // 1 heure

async function getOfflineManifestCached(): Promise<OfflineManifestResponse | null> {
  const now = Date.now();
  
  // Retourner le cache s'il est encore valide
  if (manifestCache && (now - manifestCacheTimestamp) < MANIFEST_CACHE_TTL) {
    console.log('[Manifest Cache] ✅ Manifest chargé depuis le cache mémoire');
    return manifestCache;
  }
  
  try {
    console.log('[Manifest Cache] 📥 Chargement du manifest depuis /api/offline/manifest...');
    const response = await fetch('/api/offline/manifest');
    console.log('[Manifest Cache] Response status:', response.status);
    if (!response.ok) {
      console.warn('[Manifest Cache] ❌ Manifest non disponible (status:', response.status, ')');
      return null;
    }
    
    manifestCache = await response.json();
    manifestCacheTimestamp = now;
    console.log('[Manifest Cache] 💾 Manifest mis en cache avec', manifestCache?.categories?.length || 0, 'catégories');
    return manifestCache;
  } catch (error) {
    console.warn('[Manifest Cache] ❌ Erreur lors du chargement:', error);
    return null;
  }
}

function normalizeOfflineAssetPath(rawPath?: string | null) {
  if (!rawPath) {
    return null;
  }

  return rawPath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '')
    .replace(/^assets\//, '');
}

function toOfflineAssetUrl(rawPath?: string | null) {
  const normalized = normalizeOfflineAssetPath(rawPath);
  if (!normalized) {
    return undefined;
  }
  return `/_offline/assets/${normalized}`;
}

function buildEventFromManifest(manifestEvent: OfflineManifestEvent, fallbackId: string): Event {
  const nowIso = new Date().toISOString();
  const customization = manifestEvent.customization || {};
  const assets = manifestEvent.assets || {};

  return {
    id: manifestEvent.id || fallbackId,
    name: manifestEvent.name || 'Karaoke Offline',
    description: manifestEvent.description || '',
    date: manifestEvent.date || nowIso,
    location: 'Offline',
    created_at: nowIso,
    user_id: 'offline',
    is_active: true,
    customization: {
      primary_color: customization.primary_color || '#0334b9',
      secondary_color: customization.secondary_color || '#2fb9db',
      background_image: null,
      backgroundImageUrl: toOfflineAssetUrl(assets.backgroundPath),
      logo: null,
      logoUrl: toOfflineAssetUrl(assets.logoPath),
    },
  };
}

async function loadOfflineManifestEvent(eventId: string): Promise<Event | null> {
  try {
    const manifest = await getOfflineManifestCached();
    if (!manifest?.event) {
      return null;
    }

    return buildEventFromManifest(manifest.event, eventId);
  } catch (error) {
    console.warn('[CategoryPage] Unable to load offline manifest:', error);
    return null;
  }
}

/**
 * Charge les chansons depuis le manifest offline pour le mode kiosk Electron
 */
async function loadSongsFromOfflineManifest(categoryId: string): Promise<Song[] | null> {
  try {
    console.log('[CategoryPage] 🔌 Loading songs from offline manifest for category:', categoryId);
    const manifest = await getOfflineManifestCached();
    if (!manifest) {
      console.warn('[CategoryPage] Offline manifest not available');
      return null;
    }

    if (!manifest?.categories || !Array.isArray(manifest.categories)) {
      console.warn('[CategoryPage] No categories in manifest');
      return null;
    }

    // Cas spécial: "all" retourne toutes les chansons de toutes les catégories
    if (categoryId.toLowerCase() === 'all') {
      const allSongs: Song[] = [];
      for (const cat of manifest.categories) {
        if (cat.songs && cat.songs.length > 0) {
          for (const s of cat.songs) {
            allSongs.push({
              key: s.key,
              title: s.title || s.key,
              artist: s.artist || 'Unknown',
              size: s.size || 0,
              imageUrl: s.imagePath ? `/_offline/${s.imagePath.replace(/^\.?\/?/, '')}` : undefined,
            });
          }
        }
      }
      if (allSongs.length > 0) {
        console.log(`[CategoryPage] ✅ ${allSongs.length} chansons (all) chargées depuis manifest offline`);
        return allSongs;
      }
      console.warn('[CategoryPage] No songs found in manifest for "all"');
      return null;
    }

    // Chercher la catégorie (case insensitive)
    const category = manifest.categories.find(
      (c) => c.id.toLowerCase() === categoryId.toLowerCase() || c.label.toLowerCase() === categoryId.toLowerCase()
    );

    if (!category || !category.songs || category.songs.length === 0) {
      console.warn(`[CategoryPage] Category ${categoryId} not found in manifest or empty`);
      return null;
    }

    // Convertir les chansons du manifest en format Song (sans videoUrl, géré par la page karaoke)
    const songs: Song[] = category.songs.map((s) => ({
      key: s.key,
      title: s.title || s.key,
      artist: s.artist || 'Unknown',
      size: s.size || 0,
      imageUrl: s.imagePath ? `/_offline/${s.imagePath.replace(/^\.?\/?/, '')}` : undefined,
    }));

    console.log(`[CategoryPage] ✅ ${songs.length} chansons chargées depuis manifest offline`);
    return songs;
  } catch (error) {
    console.error('[CategoryPage] Error loading songs from offline manifest:', error);
    return null;
  }
}

// Fonction de mappage entre les catégories de l'URL et les dossiers S3
const mapCategoryToS3Folder = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  const categoryMapping: Record<string, string> = {
    'français': 'francais',
    'hip-hop': 'hip-hop',
  };
  return categoryMapping[lowerCategory] || lowerCategory;
};

/**
 * Cache en mémoire pour les chansons (mode online)
 * Évite de recharger les chansons à chaque navigation
 */
const SONGS_CACHE_KEY = 'karaoke_songs_cache';
const SONGS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

interface SongsCacheEntry {
  songs: Song[];
  timestamp: number;
}

function getSongsFromCache(category: string): Song[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const cacheData = sessionStorage.getItem(`${SONGS_CACHE_KEY}_${category}`);
    if (!cacheData) return null;
    
    const entry: SongsCacheEntry = JSON.parse(cacheData);
    const now = Date.now();
    
    // Vérifier si le cache est encore valide
    if (now - entry.timestamp < SONGS_CACHE_TTL) {
      console.log(`[Cache] ✅ Chansons "${category}" trouvées en cache (${entry.songs.length} chansons)`);
      return entry.songs;
    }
    
    // Cache expiré
    console.log(`[Cache] ⏰ Cache expiré pour "${category}"`);
    sessionStorage.removeItem(`${SONGS_CACHE_KEY}_${category}`);
    return null;
  } catch (e) {
    console.warn('[Cache] Erreur lecture cache:', e);
    return null;
  }
}

function saveSongsToCache(category: string, songs: Song[]): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: SongsCacheEntry = {
      songs,
      timestamp: Date.now()
    };
    sessionStorage.setItem(`${SONGS_CACHE_KEY}_${category}`, JSON.stringify(entry));
    console.log(`[Cache] 💾 ${songs.length} chansons sauvegardées en cache pour "${category}"`);
  } catch (e) {
    console.warn('[Cache] Erreur sauvegarde cache:', e);
  }
}

/**
 * Détection du mode kiosk Electron (offline package)
 */
function isKioskMode(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as unknown as { offlineKiosk?: { ready?: boolean } }).offlineKiosk?.ready;
}

export default function EventCategoryPageClient({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}) {
  const router = useRouter();
  const { loadOfflineSongsByCategory } = useIndexedDB();
  const [id, setId] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Récupérer les paramètres depuis Promise
  useEffect(() => {
    params.then((p) => {
      setId(p.id);
      setCategory(p.category);
    });
  }, [params]);

  const setFallbackBackground = () => {
    document.documentElement.style.setProperty('--bg-image', FALLBACK_BACKGROUND_GRADIENT);
    setBgLoaded(true);
  };

  const preloadBackgroundImage = (bgUrl: string) => {
    const img = new Image();
    img.src = bgUrl;
    img.onload = () => {
      document.documentElement.style.setProperty('--bg-image', `url('${bgUrl}')`);
      document.documentElement.classList.add('bg-loaded');
      setBgLoaded(true);
    };
    img.onerror = (e) => {
      console.error('Failed to load background image:', e);
      setFallbackBackground();
    };
  };

  async function applyCustomization(eventData: Event) {
    const customization = eventData.customization;
    if (!customization) {
      setFallbackBackground();
      return;
    }

    const primaryColor = customization.primary_color || '#0334b9';
    const secondaryColor = customization.secondary_color || '#2fb9db';

    console.log('Application de la couleur primaire:', primaryColor);
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
    document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
    document.documentElement.style.setProperty('--primary-color-75', hexToRgba(primaryColor, 0.75));

    console.log('Application de la couleur secondaire:', secondaryColor);
    document.documentElement.style.setProperty('--secondary-color', secondaryColor);
    document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
    document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));

    document.documentElement.style.setProperty(
      '--primary-gradient', 
      `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorLightness(primaryColor, 20)} 100%)`
    );
    document.documentElement.style.setProperty(
      '--secondary-gradient', 
      `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColorLightness(secondaryColor, 20)} 100%)`
    );

    if (customization.backgroundImageUrl) {
      preloadBackgroundImage(customization.backgroundImageUrl);
      return;
    }

    if (customization.background_image) {
      console.log('Found background_image:', customization.background_image);
      try {
        const publicUrlResult = supabase.storage
          .from('karaokestorage')
          .getPublicUrl(`backgrounds/${customization.background_image}`);

        if (publicUrlResult.data?.publicUrl) {
          const bgUrl = publicUrlResult.data.publicUrl;
          console.log('Background image URL generated:', bgUrl);
          customization.backgroundImageUrl = bgUrl;
          preloadBackgroundImage(bgUrl);
          return;
        }

        console.error('Public URL not available for image:', customization.background_image);
        setFallbackBackground();
      } catch (error) {
        console.error('Error retrieving image URL:', error);
        setFallbackBackground();
      }
    } else {
      console.log('No background_image found, using default gradient');
      setFallbackBackground();
    }
  }

  // Charger l'événement et ses personnalisations
  useEffect(() => {
    if (!id) {
      return;
    }

    let cancelled = false;

    const handleEventLoaded = async (eventData: Event, source: string) => {
      if (cancelled) {
        return;
      }
      console.log(source);
      setEvent(eventData);
      setError(null);
      await applyCustomization(eventData);
    };

    const loadFromIndexedDb = async () => {
      try {
        const offlineEvent = await getOfflineEvent(id);
        if (offlineEvent) {
          const eventData: Event = {
            id: offlineEvent.id,
            name: offlineEvent.name,
            description: offlineEvent.description,
            date: new Date().toISOString(),
            location: 'Offline',
            created_at: new Date().toISOString(),
            user_id: '',
            is_active: true,
            customization: offlineEvent.customization as Event['customization'],
          };
          await handleEventLoaded(eventData, '[CategoryPage] Événement chargé depuis IndexedDB');
          return true;
        }
      } catch (indexedError) {
        console.warn('[CategoryPage] Impossible de charger l\'événement IndexedDB:', indexedError);
      }
      return false;
    };

    const loadFromManifest = async () => {
      const manifestEvent = await loadOfflineManifestEvent(id);
      if (manifestEvent) {
        await handleEventLoaded(manifestEvent, '[CategoryPage] Événement chargé depuis le manifeste offline');
        return true;
      }
      return false;
    };

    async function loadEvent() {
      const offlineFirst = typeof navigator !== 'undefined' ? !navigator.onLine : false;

      if (offlineFirst) {
        if (await loadFromIndexedDb()) {
          return;
        }
        if (await loadFromManifest()) {
          return;
        }
      }

      try {
        const eventData = await fetchEventById(id);
        if (!eventData) {
          throw new Error('Événement introuvable');
        }
        await handleEventLoaded(eventData, '[CategoryPage] Événement chargé depuis Supabase');
      } catch (err) {
        console.error('Erreur lors du chargement de l\'événement:', err);
        if (await loadFromIndexedDb()) {
          return;
        }
        if (await loadFromManifest()) {
          return;
        }
        if (!cancelled) {
          setError('Événement introuvable');
          setBgLoaded(true);
        }
      }
    }

    loadEvent();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Charger les chansons de la catégorie
  useEffect(() => {
    async function fetchSongs() {
      try {
        // Use local state instead of global loader
        setIsLoading(true);
        if (category) {
          console.log(`[CategoryPage] Fetching songs for category: ${category}`);
          const s3FolderCategory = mapCategoryToS3Folder(category);
          console.log(`[CategoryPage] Mapped to S3 folder: ${s3FolderCategory}`);
          
          // 🔌 Mode Kiosk Electron: TOUJOURS charger depuis le manifest offline (même si online)
          const kioskModeActive = typeof window !== 'undefined' && (window as unknown as { offlineKiosk?: { ready?: boolean } }).offlineKiosk?.ready;
          if (kioskModeActive) {
            console.log('[CategoryPage] 🔌 Mode Kiosk détecté - chargement FORCÉ depuis manifest offline');
            const manifestSongs = await loadSongsFromOfflineManifest(s3FolderCategory);
            if (manifestSongs && manifestSongs.length > 0) {
              console.log(`[CategoryPage] ✅ ${manifestSongs.length} chansons chargées depuis manifest`);
              setSongs(manifestSongs);
              setError(null);
              // isLoading sera désactivé après le préchargement des images
              return;
            }
            // En mode kiosk, si le manifest échoue, essayer IndexedDB avant l'API online
            console.warn('[CategoryPage] Manifest vide ou erreur, fallback sur IndexedDB...');
            const offlineSongs = await loadOfflineSongsByCategory(s3FolderCategory);
            if (offlineSongs && offlineSongs.length > 0) {
              console.log(`[CategoryPage] ${offlineSongs.length} chansons trouvées en IndexedDB`);
              const formattedSongs = offlineSongs.map(s => ({
                key: s.key,
                title: s.title || s.key,
                artist: s.artist || 'Unknown',
                size: s.size,
                imageUrl: s.imageUrl
              })) as Song[];
              setSongs(formattedSongs);
              setError(null);
              // isLoading sera désactivé après le préchargement des images
              return;
            }
            // Dernier recours en mode kiosk: API locale (ne devrait pas arriver)
            console.warn('[CategoryPage] IndexedDB vide, tentative API locale...');
          }
          
          // 🚀 MODE ONLINE (navigateur normal): Vérifier le cache en mémoire d'abord
          if (!kioskModeActive) {
            const cachedSongs = getSongsFromCache(s3FolderCategory);
            if (cachedSongs && cachedSongs.length > 0) {
              console.log(`[CategoryPage] 🚀 ${cachedSongs.length} chansons chargées depuis le cache`);
              setSongs(cachedSongs);
              setError(null);
              // isLoading sera désactivé après le préchargement des images
              return;
            }
          }
          
          // Always try local API first (works online & offline kiosk)
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(`/api/songs?action=songs&category=${encodeURIComponent(s3FolderCategory)}`, {
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error('Failed to fetch songs');
            }

            const songList = await response.json();
            if (Array.isArray(songList) && songList.length > 0) {
              console.log(`[CategoryPage] ${songList.length} chansons chargées via /api/songs`);
              
              // 💾 Sauvegarder dans le cache pour les prochains chargements (mode online uniquement)
              if (!kioskModeActive) {
                saveSongsToCache(s3FolderCategory, songList);
              }
              
              setSongs(songList);
              setError(null);
              // isLoading sera désactivé après le préchargement des images
              return;
            }
          } catch (onlineErr) {
            console.warn('Erreur chargement via /api/songs, essai offline:', onlineErr);
          }
          
          // Fallback offline - charger depuis IndexedDB
          console.log('[CategoryPage] Essai chargement offline depuis IndexedDB');
          const offlineSongs = await loadOfflineSongsByCategory(s3FolderCategory);
          
          if (offlineSongs && offlineSongs.length > 0) {
            console.log(`[CategoryPage] ${offlineSongs.length} chansons trouvées en offline`);
            // Convertir les objets IndexedDB en format Song
            const formattedSongs = offlineSongs.map(s => ({
              key: s.key,
              title: s.title || s.key,
              artist: s.artist || 'Unknown',
              size: s.size,
              imageUrl: s.imageUrl
            })) as Song[];
            setSongs(formattedSongs);
            setError(null);
            // isLoading sera désactivé après le préchargement des images
          } else {
            console.warn('[CategoryPage] Pas de chansons trouvées en offline');
            setError('Aucune chanson disponible (Besoin d\'internet pour charger ou télécharger des chansons)');
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des chansons:', err);
        
        // Essayer quand même le fallback offline
        try {
          if (category) {
            const s3FolderCategory = mapCategoryToS3Folder(category);
            const offlineSongs = await loadOfflineSongsByCategory(s3FolderCategory);
            
            if (offlineSongs && offlineSongs.length > 0) {
              const formattedSongs = offlineSongs.map(s => ({
                key: s.key,
                title: s.title || s.key,
                artist: s.artist || 'Unknown',
                size: s.size,
                imageUrl: s.imageUrl
              })) as Song[];
              setSongs(formattedSongs);
              setError(null);
              // isLoading sera désactivé après le préchargement des images
              return;
            }
          }
        } catch (offlineErr) {
          console.error('Fallback offline aussi échoué:', offlineErr);
        }
        
        setError('Impossible de charger les chansons. Vérifiez votre connexion ou téléchargez des chansons en offline.');
        setIsLoading(false);
      }
    }

    fetchSongs();
  }, [category, loadOfflineSongsByCategory]);

  // Préchargement uniquement des premières images (visibles) pour un chargement rapide
  useEffect(() => {
    if (songs.length > 0 && isLoading) {
      // Précharger les premières images visibles et attendre leur chargement
      const imagesToPreload = songs.slice(0, 10); // 10 premières images
      console.log(`[CategoryPage] ⏳ Préchargement de ${imagesToPreload.length} images avant affichage...`);
      
      const preloadPromises = imagesToPreload
        .filter(song => song.imageUrl)
        .map(song => {
          return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Résoudre même en cas d'erreur pour ne pas bloquer
            img.src = song.imageUrl!;
          });
        });
      
      // Attendre le chargement de toutes les images (max 3 secondes)
      const timeout = new Promise<void>((resolve) => setTimeout(resolve, 3000));
      Promise.race([Promise.all(preloadPromises), timeout]).then(() => {
        console.log(`[CategoryPage] ✅ Images préchargées, affichage de la page`);
        setIsLoading(false);
      });
    }
  }, [songs, isLoading]);

  // Fonction utilitaire pour ajuster la luminosité d'une couleur hex
  function adjustColorLightness(color: string, percent: number): string {
    try {
      // Convert hex to RGB
      let r = parseInt(color.substring(1,3), 16);
      let g = parseInt(color.substring(3,5), 16);
      let b = parseInt(color.substring(5,7), 16);

      // Adjust lightness
      r = Math.min(255, Math.max(0, r + (r * percent / 100)));
      g = Math.min(255, Math.max(0, g + (g * percent / 100)));
      b = Math.min(255, Math.max(0, b + (b * percent / 100)));

      // Convert back to hex
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    } catch {
      return color; // Return original color if any error occurs
    }
  }

  // Nouvelle fonction pour convertir une couleur hexadécimale en rgba
  function hexToRgba(hex: string, alpha: number): string {
    try {
      // Convertir hex en RGB
      const r = parseInt(hex.substring(1,3), 16);
      const g = parseInt(hex.substring(3,5), 16);
      const b = parseInt(hex.substring(5,7), 16);
      
      // Retourner la valeur rgba
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(3, 52, 185, ${alpha})`; // Valeur par défaut si erreur
    }
  }

  // Fonction pour naviguer avec transition
  const handleSongSelect = (songKey: string) => {
    // Activer la transition
    setIsNavigating(true);
    
    // Temporiser la navigation pour montrer le loader
    setTimeout(() => {
      // En mode kiosk ou hors ligne, utiliser une navigation MPA (page reload) au lieu de RSC navigation
      // qui essayerait de charger le RSC payload du serveur et échouerait offline
      const useHardNav = isKioskMode() || !navigator.onLine;
      if (useHardNav) {
        console.warn('[CategoryPage] Kiosk/Offline detected - using MPA navigation instead of RSC');
        window.location.href = `/event/${id}/karaoke/${encodeURIComponent(songKey)}`;
      } else {
        // Online: utiliser la navigation RSC optimale
        router.push(`/event/${id}/karaoke/${encodeURIComponent(songKey)}`);
      }
    }, 800); // Délai pour voir l'animation
  };

  // Error state with modern styling
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: event?.customization?.backgroundImageUrl 
          ? `url('${event.customization.backgroundImageUrl}')` 
          : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div className="relative z-10 bg-red-900/40 backdrop-blur-lg p-6 rounded-xl border border-red-500/30 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Erreur</h2>
        <p className="text-white">{error}</p>
        <button 
          onClick={() => {
            const useHardNav = isKioskMode() || !navigator.onLine;
            if (useHardNav) {
              window.location.href = `/event/${id}`;
            } else {
              router.push(`/event/${id}`);
            }
          }}
          className="mt-6 px-6 py-2 bg-white text-red-600 rounded-lg font-medium"
        >
          Retour événement
        </button>
      </div>
    </div>
  );

  // Mettre à jour le style de fond
  return (
    <>
      {/* Afficher le loader de transition quand on navigue vers l'enregistrement */}
      <MusicTransitionLoader 
        isVisible={isNavigating} 
        step="Chargement de la chanson..." 
        progress={80}
      />
      
      {/* Add loading overlay when fetching songs */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <div className="absolute inset-0 bg-black/70"></div>
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30 
            }}
            className="relative z-10 p-8 rounded-xl border border-white/10 shadow-2xl max-w-md w-full mx-4 backdrop-blur-md"
            style={{ 
              backgroundColor: 'var(--primary-color)',
              boxShadow: '0 20px 60px -10px rgba(var(--primary-color-rgb), 0.4), 0 10px 20px -5px rgba(var(--secondary-color-rgb), 0.3)',
              borderLeft: '4px solid var(--primary-color)',
              borderRight: '4px solid var(--secondary-color)'
            }}
          >
            {/* Vinyl record animation */}
            <div className="flex justify-center mb-6 relative">
              <motion.div 
                className="w-28 h-28 rounded-full bg-gradient-to-br from-black to-gray-900 shadow-inner flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ 
                  duration: 4,
                  ease: "linear",
                  repeat: Infinity
                }}
                style={{
                  background: 'conic-gradient(from 0deg, #000, #333, #000, #111, #000)',
                  boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.8)'
                }}
              >
                {/* Vinyl grooves */}
                <div className="w-3/4 h-3/4 rounded-full border-t border-white/5"></div>
                <div className="absolute w-2/3 h-2/3 rounded-full border-t border-white/5"></div>
                <div className="absolute w-1/2 h-1/2 rounded-full border-t border-white/5"></div>
                <div className="absolute w-1/3 h-1/3 rounded-full border-t border-white/5"></div>
                
                {/* Center label with theme gradient */}
                <div 
                  className="absolute w-2/5 h-2/5 rounded-full flex items-center justify-center text-xs text-white font-bold"
                  style={{ 
                    background: 'var(--primary-gradient)',
                    transform: 'rotate(0deg)',
                    boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
                  }}
                >
                  <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ 
                      duration: 4,
                      ease: "linear",
                      repeat: Infinity
                    }}
                  >
                    KARAOKE
                  </motion.div>
                </div>
                
                {/* Center hole */}
                <div className="absolute w-[8px] h-[8px] rounded-full bg-gray-900 border border-gray-700"></div>
              </motion.div>
              
              {/* Equalizer bars in background */}
              <div className="absolute -z-10 inset-0 flex items-center justify-center space-x-1">
                {[...Array(12)].map((_, i) => (
                  <motion.div 
                    key={i} 
                    className="w-1 rounded-full"
                    style={{ 
                      backgroundColor: i % 2 === 0 
                        ? 'var(--primary-color)' 
                        : 'var(--secondary-color)',
                      opacity: 0.4,
                      height: '100%'
                    }}
                    animate={{
                      height: [
                        `${20 + Math.random() * 40}%`, 
                        `${60 + Math.random() * 40}%`, 
                        `${10 + Math.random() * 30}%`
                      ]
                    }}
                    transition={{
                      duration: 1.2 + Math.random(),
                      ease: "easeInOut",
                      repeat: Infinity,
                      repeatType: "reverse",
                      delay: i * 0.08
                    }}
                  />
                ))}
              </div>
            </div>
            
            {/* Audio waveform visualization */}
            <div className="flex items-end justify-center space-x-1 mb-8 h-12">
              {[...Array(24)].map((_, i) => (
                <motion.div 
                  key={i} 
                  className="w-1.5 rounded-full"
                  style={{ 
                    background: `linear-gradient(to top, var(--${i % 2 ? 'primary' : 'secondary'}-color}), transparent)`,
                    opacity: 0.8
                  }}
                  animate={{
                    height: [
                      `${10 + Math.random() * 40}%`, 
                      `${60 + Math.random() * 40}%`, 
                      `${10 + Math.random() * 30}%`, 
                      `${50 + Math.random() * 50}%`
                    ]
                  }}
                  transition={{
                    duration: 1.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "mirror",
                    delay: i * 0.05
                  }}
                />
              ))}
            </div>
            
            <motion.h3 
              className="text-white text-2xl font-bold text-center mb-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ 
                background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Chargement des chansons...
            </motion.h3>
            
            <motion.p 
              className="text-gray-300 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Préparation de la bibliothèque musicale
            </motion.p>
            
            {/* Music notes floating animation */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ 
                    color: i % 2 === 0 ? 'var(--primary-color)' : 'var(--secondary-color)',
                    opacity: 0.15,
                    fontSize: `${1 + Math.random() * 1.5}rem`
                  }}
                  initial={{ 
                    x: `${Math.random() * 100}%`, 
                    y: "120%",
                    rotate: Math.random() * 360
                  }}
                  animate={{ 
                    y: "-20%",
                    rotate: Math.random() > 0.5 ? 360 : -360
                  }}
                  transition={{
                    duration: 3 + Math.random() * 7,
                    repeat: Infinity,
                    repeatType: "loop",
                    ease: "linear",
                    delay: Math.random() * 5
                  }}
                >
                  {['♪', '♫', '♩', '♬', '🎵', '🎶'][Math.floor(Math.random() * 6)]}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center h-screen overflow-hidden"
        style={{
          backgroundColor: '#080424', // Fond de base
          backgroundImage: bgLoaded && event?.customization?.backgroundImageUrl 
            ? `url('${event.customization.backgroundImageUrl}')` 
            : 'linear-gradient(135deg, #080424 0%, #160e40 100%)',
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-purple-950/80 backdrop-blur-sm"></div>
        
        <div className="relative z-10 w-full h-full flex flex-col py-6 px-4">
          {/* Partie du haut (titre + bouton retour) - reste fixe */}
          <div className="flex-shrink-0">
            <motion.h1 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              style={{ color: 'var(--primary-color)' }}
              className="text-3xl md:text-4xl font-bold mb-8 text-center"
            >
              {event?.name && (
                <div className="text-xl opacity-70 mb-1">
                  {event.name}
                </div>
              )}
              SÉLECTIONNE TA CHANSON 
            </motion.h1>
            
            {/* Back button */}
            <div className="mb-6 text-center">
              <button
                onClick={() => {
                  if (!navigator.onLine) {
                    window.location.href = `/event/${id}`;
                  } else {
                    router.push(`/event/${id}`);
                  }
                }}
                className="py-3 px-6 rounded-lg transition-all flex items-center gap-2 mx-auto text-white hover:translate-y-[-2px] hover:shadow-xl"
                style={{ 
                  backgroundColor: 'var(--primary-color-75)',
                  border: 'none',
                  borderLeft: '4px solid var(--primary-color)',
                  borderRight: '4px solid var(--secondary-color)',
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Retour aux catégories</span>
              </button>
            </div>
          </div>
          
          {/* Zone du slider Swiper - prend tout l'espace restant */}
          <div className="relative flex-grow flex items-center justify-center w-full">
            {songs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center text-white border border-white/10 shadow-xl"
              >
                Aucune chanson trouvée dans cette catégorie
              </motion.div>
            ) : (
              <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={3}
                spaceBetween={30}
                loop={true}
                loopAdditionalSlides={2}
                watchSlidesProgress={true}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false,
                }}
                coverflowEffect={{
                  rotate: 15,
                  stretch: 0,
                  depth: 200,
                  modifier: 1.5,
                  slideShadows: false,
                }}
                navigation={true}
                pagination={false}
                modules={[EffectCoverflow, Autoplay, Navigation, Pagination]}
                className="w-full h-full"
                breakpoints={{
                  320: { slidesPerView: 1, spaceBetween: 20, loopAdditionalSlides: 1 },
                  768: { slidesPerView: 2, spaceBetween: 25, loopAdditionalSlides: 1 },
                  1024: { slidesPerView: 3, spaceBetween: 30, loopAdditionalSlides: 2 },
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  paddingTop: '50px',
                  paddingBottom: '80px',
                }}
              >
                {songs.map((song) => (
                  <SwiperSlide key={song.key}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="cursor-pointer h-full w-full flex items-center justify-center"
                      onClick={() => handleSongSelect(song.key)}
                    >
                      {/* Glassmorphism Card */}
                      <div className="relative w-full rounded-3xl overflow-hidden group shadow-2xl border border-white" style={{ height: '400px' }}>
                        {/* Background Image with Blur */}
                        <div className="absolute inset-0">
                          {/* Gradient placeholder (always visible as fallback) */}
                          <div 
                            className="absolute inset-0 w-full h-full animate-pulse"
                            style={{
                              background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)`
                            }}
                          />
                          {song.imageUrl && (
                            <img
                              src={song.imageUrl}
                              alt={song.title}
                              loading="lazy"
                              decoding="async"
                              className="absolute inset-0 w-full h-full object-cover"
                              onLoad={(e) => {
                                // Remove pulse animation when loaded
                                const parent = (e.target as HTMLImageElement).parentElement;
                                const placeholder = parent?.querySelector('.animate-pulse');
                                if (placeholder) placeholder.classList.remove('animate-pulse');
                              }}
                            />
                          )}
                          {/* Primary Color Overlay with Opacity */}
                          <div 
                            className="absolute inset-0"
                            style={{
                              backgroundColor: 'var(--primary-color-75)',
                              mixBlendMode: 'multiply'
                            }} 
                          />
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        </div>

                        {/* Glassmorphism Layer */}
                        <div className="absolute inset-0 backdrop-blur-[2px] bg-white/5 border border-white/20 rounded-3xl">
                          {/* Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />
                          
                          {/* Inner Glow */}
                          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_60px_rgba(255,255,255,0.1)]" />
                        </div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col justify-end p-6 z-10">
                          {/* Play Button - Centered */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="relative">
                              {/* Outer Glow */}
                              <div 
                                className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
                                style={{
                                  background: `linear-gradient(to right, var(--secondary-color), var(--primary-color))`
                                }}
                              />
                              
                              {/* Glassmorphism Button */}
                              <div className="relative w-24 h-24 rounded-full backdrop-blur-md bg-white/10 border-2 border-white/30 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
                                  <svg className="w-10 h-10 text-white ml-1 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Song Info with Glassmorphism */}
                          <div 
                            className="rounded-2xl p-5 border border-white/50 shadow-2xl transform group-hover:translate-y-[-10px] transition-transform duration-300"
                            style={{
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              background: 'rgba(255, 255, 255, 0.15)'
                            }}
                          >
                            {/* Title */}
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg line-clamp-2">
                              {song.title}
                            </h3>
                            
                            {/* Artist */}
                            <p className="text-lg text-white drop-shadow-md line-clamp-1 mb-3">
                              {song.artist}
                            </p>

                            {/* Decorative Line */}
                            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent mb-3" />

                            {/* Tags/Badges */}
                            <div className="flex gap-2 flex-wrap">
                              <span 
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/50 text-white shadow-lg"
                                style={{
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  background: 'rgba(255, 255, 255, 0.2)'
                                }}
                              >
                                🎤 Karaoke
                              </span>
                              <span 
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/50 text-white shadow-lg"
                                style={{
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  background: `linear-gradient(to right, var(--secondary-color, rgba(236, 72, 153, 0.4)), var(--primary-color, rgba(168, 85, 247, 0.4)))`
                                }}
                              >
                                ✨ Populaire
                              </span>
                            </div>
                          </div>

                          {/* Corner Accent */}
                          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-md border border-white/30 flex items-center justify-center">
                            <span className="text-2xl">🎵</span>
                          </div>
                        </div>

                        {/* Hover Border Glow */}
                        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_60px_rgba(168,85,247,0.6)]"></div>
                      </div>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

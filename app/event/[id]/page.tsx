'use client';

import React, { useEffect, useState } from 'react';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import CategorySelector from '@/components/CategorySelector';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';
import { getOfflineEvent } from '@/lib/offline/db';
import { OfflineProvider, useOfflineMode } from '@/contexts/OfflineContext';
import { OfflineIndicator } from '@/components/OfflineIndicator';
import { applyStylePackCssVariables, DEFAULT_STYLE_PACK_ID } from '@/lib/stylePacks';

const FALLBACK_BACKGROUND_GRADIENT = 'linear-gradient(135deg, #080424 0%, #160e40 100%)';

type OfflineManifestAssets = {
  logoPath?: string | null;
  backgroundPath?: string | null;
};

type OfflineManifestCustomization = {
  primary_color?: string;
  secondary_color?: string;
  style_pack?: string;
};

type OfflineManifestEvent = {
  id?: string;
  name?: string;
  description?: string;
  date?: string;
  customization?: OfflineManifestCustomization;
  assets?: OfflineManifestAssets;
};

type OfflineManifestResponse = {
  event?: OfflineManifestEvent;
};

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
      primary_color: customization.primary_color,
      secondary_color: customization.secondary_color,
      background_image: null,
      backgroundImageUrl: toOfflineAssetUrl(assets.backgroundPath),
      logo: null,
      logoUrl: toOfflineAssetUrl(assets.logoPath),
      style_pack: customization.style_pack || DEFAULT_STYLE_PACK_ID,
    },
  };
}

function EventPageContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { isOffline } = useOfflineMode();
  
  // Détection du mode offline package (Electron via window.offlineKiosk ou localStorage)
  const [isOfflinePackage, setIsOfflinePackage] = useState(false);
  
  useEffect(() => {
    // Méthode 1: window.offlineKiosk exposé par preload.js d'Electron
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isElectron = !!(window as any).offlineKiosk?.ready;
    // Méthode 2: localStorage pour tests
    const forceOffline = localStorage.getItem('forceOfflineMode') === 'true';
    if (isElectron || forceOffline) {
      console.log('[EventPage] 🔴 Mode offline package détecté (offlineKiosk:', isElectron, ', localStorage:', forceOffline, ')');
      setIsOfflinePackage(true);
    }
  }, []);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);

  const setFallbackBackground = () => {
    document.documentElement.style.setProperty('--bg-image', FALLBACK_BACKGROUND_GRADIENT);
    setBgLoaded(true);
  };

  const preloadBackgroundImage = (bgUrl: string) => {
    const img = new window.Image();
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

  // Fonction utilitaire pour convertir hex en RGB
  function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    try {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    } catch {
      return null;
    }
  }

  // Apply customization separately for reusability
  async function applyCustomization(eventData: Event) {
    if (eventData.customization) {
      // Apply style pack colors FIRST (base layer)
      applyStylePackCssVariables(eventData.customization.style_pack);

      // Override with event-specific colors ONLY if defined
      const primaryColor = eventData.customization.primary_color;
      const secondaryColor = eventData.customization.secondary_color;
      
      if (primaryColor) {
        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
        document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
        
        const primaryRgb = hexToRgb(primaryColor);
        if (primaryRgb) {
          document.documentElement.style.setProperty('--primary-color-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
        }
        
        document.documentElement.style.setProperty(
          '--primary-gradient', 
          `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorLightness(primaryColor, 20)} 100%)`
        );
      }
      
      if (secondaryColor) {
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
        document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));
        
        const secondaryRgb = hexToRgb(secondaryColor);
        if (secondaryRgb) {
          document.documentElement.style.setProperty('--secondary-rgb', `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`);
        }
        
        document.documentElement.style.setProperty(
          '--secondary-gradient', 
          `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColorLightness(secondaryColor, 20)} 100%)`
        );

        // Override style pack border and shadow with event secondary color
        document.documentElement.style.setProperty(
          '--style-pack-card-border',
          `3px solid ${secondaryColor}`
        );

        document.documentElement.style.setProperty(
          '--style-pack-card-shadow',
          `0 25px 50px -12px rgba(${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}, 0.65)`
        );
      }
      
      // Remove overlay for cleaner category display
      document.documentElement.style.setProperty(
        '--style-pack-card-overlay',
        'rgba(0, 0, 0, 0)'
      );

      // Améliorer la gestion de l'arrière-plan - sans référence à bg.png
      const existingBackgroundUrl = eventData.customization.backgroundImageUrl;

      if (existingBackgroundUrl) {
        preloadBackgroundImage(existingBackgroundUrl);
        return;
      }

      if (eventData.customization.background_image) {
        console.log('Found background_image:', eventData.customization.background_image);

        try {
          const publicUrlResult = supabase.storage
            .from('karaokestorage')
            .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);

          if (publicUrlResult.data?.publicUrl) {
            const bgUrl = publicUrlResult.data.publicUrl;
            console.log('Background image URL generated:', bgUrl);
            eventData.customization.backgroundImageUrl = bgUrl;
            preloadBackgroundImage(bgUrl);
            return;
          }

          console.error('Public URL not available for image:', eventData.customization.background_image);
          setFallbackBackground();
        } catch (error) {
          console.error('Error retrieving image URL:', error);
          setFallbackBackground();
        }
      } else {
        console.log('No background_image found, using default gradient');
        setFallbackBackground();
      }
    } else {
      applyStylePackCssVariables(undefined);
      setFallbackBackground();
    }
  }

  const displayEvent = async (eventData: Event) => {
    setEvent(eventData);
    setLoading(false);
    await applyCustomization(eventData);
  };

  async function loadOfflineManifestEvent(): Promise<Event | null> {
    try {
      const response = await fetch('/api/offline/manifest', { cache: 'no-store' });
      if (!response.ok) {
        return null;
      }

      const manifest: OfflineManifestResponse = await response.json();
      if (!manifest?.event) {
        return null;
      }

      return buildEventFromManifest(manifest.event, id);
    } catch (manifestError) {
      console.warn('[EventPage] Unable to load offline manifest:', manifestError);
      return null;
    }
  }

  useEffect(() => {
    async function loadEvent() {
      if (id) {
        try {
          // Try offline first if offline package mode OR context says offline
          const shouldUseOffline = isOfflinePackage || isOffline;
          
          if (shouldUseOffline) {
            console.log('[EventPage] 🔴 Offline mode - trying IndexedDB (isOfflinePackage:', isOfflinePackage, ', isOffline:', isOffline, ')');
            const offlineEvent = await getOfflineEvent(id);
            
            if (offlineEvent) {
              console.log('[EventPage] Found offline event');
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
              
              await displayEvent(eventData);
              return;
            }

            const manifestEvent = await loadOfflineManifestEvent();
            if (manifestEvent) {
              console.log('[EventPage] Loaded event from offline manifest');
              await displayEvent(manifestEvent);
              return;
            }
          }

          // Load from online
          const eventData = await fetchEventById(id);
          
          if (!eventData) {
            setError('Cet événement n\'existe pas.');
            setLoading(false);
            return;
          }
          
          if (!eventData.is_active) {
            setError('Cet événement n\'est pas disponible.');
            setLoading(false);
            return;
          }

          await displayEvent(eventData);
        } catch (err) {
          console.error("Erreur lors du chargement de l'événement:", err);
          const manifestEvent = await loadOfflineManifestEvent();
          if (manifestEvent) {
            console.log('[EventPage] Falling back to offline manifest after error');
            await displayEvent(manifestEvent);
            return;
          }

          setError('Cet événement n\'existe pas ou n\'est plus disponible.');
          setLoading(false);
          setBgLoaded(true);
        }
      }
    }

    loadEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
          <div className="spinner"></div>
          <p className="ml-3 text-white">Chargement de l&apos;événement...</p>
        </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white">
          <h1 className="text-3xl font-bold mb-4">Événement introuvable</h1>
          <p>{error || 'Cet événement n&apos;est pas disponible.'}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-6 px-6 py-3 bg-white text-purple-800 rounded-lg font-medium"
          >
            Retour à l&apos;accueil
          </button>
        </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center relative overflow-hidden ${bgLoaded ? 'bg-loaded' : ''}`}
      style={{
        backgroundImage: event?.customization?.backgroundImageUrl 
          ? `url('${event.customization.backgroundImageUrl}')` 
          : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.5s ease-in-out"
      }}>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-sm"></div>

      {/* Offline Indicator */}
      {isOffline && (
        <div className="absolute top-4 left-4 z-50 bg-amber-500 text-white px-4 py-2 rounded-lg flex items-center gap-2">
          <span className="animate-pulse">🔴</span>
          <span>Mode Hors Ligne</span>
        </div>
      )}
      
      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center w-full gap-8">
        {/* Event header with logo */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-center"
            style={{ color: 'var(--secondary-color)' }}
          >
            {event.name}
          </h1>
        </div>
        
        {/* Display the logo if available */}
        {event.customization?.logoUrl && (
          <div className="w-48 h-48 p-2 flex items-center justify-center"
            style={{
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.25), 0 0 30px 5px rgba(var(--secondary-rgb), 0.2), 0 8px 16px rgba(0, 0, 0, 0.3)'
            }}
          >
            {event.customization.logoUrl.startsWith('/_offline/') ? (
              <img
                src={event.customization.logoUrl}
                alt={`${event.name} Logo`}
                className="max-w-full max-h-full object-contain"
                loading="lazy"
              />
            ) : (
              <Image 
                src={event.customization.logoUrl} 
                alt={`${event.name} Logo`} 
                width={200}
                height={200}
                className="object-contain"
                style={{ width: '100%', height: 'auto', maxHeight: '100%' }}
              />
            )}
          </div>
        )}
      </div>
      
      {/* Catégories - Full width */}
      <div className="relative z-10 w-full flex justify-center">
        <div className="w-full px-4 py-2">
          <h2 className="text-3xl font-bold text-white text-center mb-2"
            style={{ 
              color: 'var(--secondary-color)',
     
            }}
          >
            Choisissez votre catégorie
          </h2>
        </div>
      </div>
      <div className="relative z-10 w-full">
        <CategorySelector eventId={id} stylePackId={event.customization?.style_pack} />
      </div>

      {/* Offline Indicator Component */}
      <OfflineIndicator />
    </div>
  );
}

// Wrapper component with providers
export default function EventPage() {
  const params = useParams();
  const id = params.id as string;

  return (
    <OfflineProvider eventId={id}>
      <EventPageContent />
    </OfflineProvider>
  );
}

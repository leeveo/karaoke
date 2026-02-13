'use client';

import { useParams, useRouter } from 'next/navigation';
import LiveKaraokeRecorder from '@/components/LiveKaraokeRecorder';
import { useEffect, useState, useRef } from 'react';
import { getSongUrl } from '@/services/s3Service';
import { Event } from '@/types/event';
import { useOnlineStatus, useIndexedDB } from '@/hooks/useOfflineMode';
import { loadEventWithOfflineFallback, getOfflineVideoUrlFromManifest, isOfflinePackage } from '@/lib/offline/eventLoader';

const LOADER_FAILSAFE_MS = 7000;
const MANIFEST_LOOKUP_TIMEOUT_MS = 2500;
const INDEXED_DB_TIMEOUT_MS = 3000;
const SIGNED_URL_TIMEOUT_MS = 6000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timeout après ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export default function EventKaraokePage() {
  const { id, songId } = useParams();
  const decodedSongId = decodeURIComponent(songId as string);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const preloadRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);
  const isOnline = useOnlineStatus();
  const { loadOfflineSongsByCategory, loadOfflineSongByKey } = useIndexedDB();
  const loaderFailsafeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  
  // Extraire le nom de la chanson à partir de l'ID
  const songName = decodedSongId.split('/').pop()?.split('.')[0] || decodedSongId;

  const logLoader = (message: string, extra?: unknown) => {
    if (extra !== undefined) {
      console.log(`[EventKaraoke][Loader] ${message}`, extra);
      return;
    }
    console.log(`[EventKaraoke][Loader] ${message}`);
  };

  const clearLoaderFailsafe = () => {
    if (loaderFailsafeRef.current) {
      clearTimeout(loaderFailsafeRef.current);
      loaderFailsafeRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearLoaderFailsafe();
    };
  }, []);

  // "Retour" button handler - Make sure to include the event ID
  const handleReturn = () => {
    // En mode kiosk ou hors ligne, utiliser MPA navigation pour éviter les erreurs RSC
    const useHardNav = isOfflinePackage() || !navigator.onLine;
    if (id) {
      if (useHardNav) {
        window.location.href = `/event/${id}`;
      } else {
        router.push(`/event/${id}`);
      }
    } else {
      // Fallback to home if no ID
      if (useHardNav) {
        window.location.href = '/';
      } else {
        router.push('/');
      }
    }
  };

  // Fix unused 'e' parameter in adjustColorLightness function
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

  // Fix unused 'e' parameter in hexToRgba function
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

  const normalizeSongKey = (value: string) => {
    if (!value) {
      return value;
    }
    const trimmed = value.split('?')[0];
    if (trimmed.includes('karaokesaas/')) {
      return trimmed.slice(trimmed.indexOf('karaokesaas/'));
    }
    try {
      const url = new URL(trimmed);
      return url.pathname.replace(/^\/+/, '');
    } catch {
      return trimmed;
    }
  };

  // Move useEffect hooks to the top level
  useEffect(() => {
    // Remettre isMountedRef à true au début (pour React Strict Mode)
    isMountedRef.current = true;
    
    let cancelled = false;
    const onlineSnapshot = isOnline; // Capture isOnline at mount time

    const safeStateUpdate = (updater: () => void) => {
      if (cancelled || !isMountedRef.current) {
        logLoader('⚠️ safeStateUpdate BLOQUÉ', { cancelled, isMounted: isMountedRef.current });
        return;
      }
      logLoader('✅ safeStateUpdate EXÉCUTÉ');
      updater();
    };

    const startLoaderFailsafe = (context: string) => {
      clearLoaderFailsafe();
      loaderFailsafeRef.current = setTimeout(() => {
        if (cancelled || !isMountedRef.current) {
          return;
        }
        logLoader(`Failsafe déclenché (${context}) - affichage forcé de l'interface`);
        setVideoReady(true);
        setLoading(false);
      }, LOADER_FAILSAFE_MS);
    };

    async function loadVideo() {
      try {
        logLoader('Démarrage du chargement', { song: decodedSongId });
        safeStateUpdate(() => {
          setLoading(true);
          setVideoReady(false);
          setError(null);
        });

        startLoaderFailsafe(`chargement initial ${decodedSongId}`);

        const isKioskMode = isOfflinePackage();
        const normalizedKey = normalizeSongKey(decodedSongId);
        logLoader('Paramètres réseau', { kiosk: isKioskMode, online: onlineSnapshot, key: normalizedKey });

        if (isKioskMode) {
          logLoader('Mode kiosk actif - tentative manifest offline');
          try {
            const offlineVideoUrl = await withTimeout(
              getOfflineVideoUrlFromManifest(decodedSongId),
              MANIFEST_LOOKUP_TIMEOUT_MS,
              'Manifest offline'
            );
            if (offlineVideoUrl) {
              logLoader('Vidéo trouvée dans le manifest offline');
              safeStateUpdate(() => {
                setVideoUrl(offlineVideoUrl);
                setVideoReady(true);
                setLoading(false);
              });
              clearLoaderFailsafe();
              return;
            }
            logLoader('Manifest offline ne contient pas cette vidéo');
          } catch (manifestErr) {
            logLoader('Manifest offline indisponible', manifestErr);
          }
        }

        if (!onlineSnapshot || isKioskMode) {
          logLoader('Mode offline détecté - tentative IndexedDB');
          try {
            let offlineSong = normalizedKey
              ? await withTimeout(
                  loadOfflineSongByKey(normalizedKey),
                  INDEXED_DB_TIMEOUT_MS,
                  'IndexedDB lookup'
                )
              : undefined;

            if (!offlineSong && normalizedKey && normalizedKey.includes('/')) {
              logLoader('Recherche directe échouée - fallback par catégories');
              const fallbackKey = normalizedKey.split('/').pop() ?? normalizedKey;
              const categories = ['all', 'anglais', 'francais', 'hip-hop', 'pop', 'rap', 'rock'];
              for (const category of categories) {
                try {
                  const songs = await withTimeout(
                    loadOfflineSongsByCategory(category),
                    INDEXED_DB_TIMEOUT_MS,
                    `IndexedDB catégorie ${category}`
                  );
                  const candidate = songs.find((s) => s.key?.endsWith(fallbackKey));
                  if (candidate) {
                    offlineSong = candidate;
                    break;
                  }
                } catch (categoryErr) {
                  logLoader(`Lecture catégorie ${category} impossible`, categoryErr);
                }
              }
            }

            if (offlineSong && offlineSong.blob) {
              logLoader('Lecture IndexedDB réussie', { title: offlineSong.title });
              const blobUrl = URL.createObjectURL(offlineSong.blob);
              safeStateUpdate(() => {
                setVideoUrl(blobUrl);
                setVideoReady(true);
                setLoading(false);
              });
              clearLoaderFailsafe();
              return;
            }

            logLoader('IndexedDB ne contient pas cette vidéo');
          } catch (offlineErr) {
            logLoader('Erreur IndexedDB', offlineErr);
          }
        }

        if (normalizedKey.startsWith('karaokesaas/')) {
          logLoader('🔍 Tentative de génération URL signée S3', { normalizedKey });
          try {
            const s3Url = await withTimeout(
              getSongUrl(normalizedKey),
              SIGNED_URL_TIMEOUT_MS,
              'URL signée S3'
            );

            if (s3Url) {
              logLoader('✅ URL signée obtenue, lancement du préchargement', { urlStart: s3Url.substring(0, 80) });
              safeStateUpdate(() => {
                setVideoUrl(s3Url);
              });

              logLoader('📹 preloadRef.current existe?', { exists: !!preloadRef.current });
              
              if (preloadRef.current) {
                preloadRef.current.src = s3Url;
                logLoader('🎬 Source vidéo assignée au preloadRef');

                let timeoutCleared = false;

                const preloadTimeout = setTimeout(() => {                  if (timeoutCleared) {
                    logLoader('⏱️ Timeout ignoré car timeoutCleared=true');
                    return;
                  }
                  logLoader('⏱️ TIMEOUT préchargement (6s) - affichage forcé');
                  timeoutCleared = true;
                  safeStateUpdate(() => {
                    setVideoReady(true);
                    setLoading(false);
                  });
                  clearLoaderFailsafe();
                }, SIGNED_URL_TIMEOUT_MS);

                preloadRef.current.onloadeddata = () => {
                  if (timeoutCleared) {
                    logLoader('✅ onloadeddata ignoré car timeoutCleared=true');
                    return;
                  }
                  logLoader('✅ Préchargement RÉUSSI (onloadeddata) - désactivation timeout');
                  timeoutCleared = true;
                  clearTimeout(preloadTimeout);
                  logLoader('📊 État avant update:', { videoReady, loading, cancelled, isMounted: isMountedRef.current });
                  safeStateUpdate(() => {
                    logLoader('🔄 INSIDE updater - calling setVideoReady(true) et setLoading(false)');
                    setVideoReady(true);
                    setLoading(false);
                  });
                  logLoader('📊 Après safeStateUpdate');
                  clearLoaderFailsafe();
                };

                preloadRef.current.onerror = (event) => {
                  if (timeoutCleared) {
                    logLoader('❌ onerror ignoré car timeoutCleared=true');
                    return;
                  }
                  logLoader('❌ ERREUR préchargement vidéo', { event, src: preloadRef.current?.src?.substring(0, 80) });
                  timeoutCleared = true;
                  clearTimeout(preloadTimeout);
                  safeStateUpdate(() => {
                    setVideoReady(true);
                    setLoading(false);
                  });
                  clearLoaderFailsafe();
                };

                logLoader('🚀 Appel de preloadRef.current.load()');
                preloadRef.current.load();
              } else {
                logLoader('Référence vidéo indisponible - affichage immédiat');
                safeStateUpdate(() => {
                  setVideoReady(true);
                  setLoading(false);
                });
                clearLoaderFailsafe();
              }
              return;
            }

            logLoader('URL S3 vide');
          } catch (s3Error) {
            logLoader("Impossible de récupérer l'URL S3", s3Error);
          }
        } else {
          const localPath = `/songs/${decodedSongId}`;
          logLoader('Chargement via chemin local', { path: localPath });
          safeStateUpdate(() => {
            setVideoUrl(localPath);
            setVideoReady(true);
            setLoading(false);
          });
          clearLoaderFailsafe();
          return;
        }

        safeStateUpdate(() => {
          setError('Impossible de charger la vidéo depuis les différentes sources.');
          setLoading(false);
        });
        clearLoaderFailsafe();
      } catch (err) {
        logLoader('Erreur inattendue pendant le chargement', err);
        safeStateUpdate(() => {
          setError(`Erreur lors du chargement de la vidéo: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
          setLoading(false);
        });
        clearLoaderFailsafe();
      }
    }

    loadVideo();

    return () => {
      logLoader('🧹 Cleanup du useEffect - cancelled = true');
      cancelled = true;
      clearLoaderFailsafe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedSongId]);

  useEffect(() => {
    return () => {
      if (videoUrl && videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  // Charger l'événement et appliquer le thème, même hors ligne
  useEffect(() => {
    async function loadEvent() {
      if (typeof id !== 'string') {
        setBgLoaded(true);
        return;
      }

      try {
        const eventData = await loadEventWithOfflineFallback(id);
        if (!eventData) {
          setBgLoaded(true);
          return;
        }

        setEvent(eventData);

        console.log('[EventKaraoke] Event loaded:', {
          eventId: eventData.id,
          eventName: eventData.name,
          logoUrl: eventData.customization?.logoUrl,
          hasLogo: !!eventData.customization?.logoUrl
        });

        if (!eventData.customization) {
          setBgLoaded(true);
          return;
        }

        const primaryColor = eventData.customization.primary_color || '#8b7355';
        const secondaryColor = eventData.customization.secondary_color || '#c9a875';

        document.documentElement.style.setProperty('--primary-color', primaryColor);
        document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
        document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
        document.documentElement.style.setProperty('--secondary-color', secondaryColor);
        document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
        document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));
        document.documentElement.style.setProperty('--primary-color-75', hexToRgba(primaryColor, 0.75));

        document.documentElement.style.setProperty(
          '--primary-gradient',
          `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorLightness(primaryColor, 20)} 100%)`
        );
        document.documentElement.style.setProperty(
          '--secondary-gradient',
          `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColorLightness(secondaryColor, 20)} 100%)`
        );

        const bgUrl = eventData.customization.backgroundImageUrl;
        if (bgUrl) {
          const img = new Image();
          img.src = bgUrl;
          img.onload = () => setBgLoaded(true);
          img.onerror = () => setBgLoaded(true);
        } else {
          setBgLoaded(true);
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'événement:', err);
        setBgLoaded(true);
      }
    }

    loadEvent();
  }, [id]);

  // Render content conditionally at the end
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{
          backgroundImage: event?.customization?.backgroundImageUrl 
            ? `url('${event.customization.backgroundImageUrl}')` 
            : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
        <div className="absolute inset-0 bg-black bg-opacity-75"></div>
        
        <div className="relative z-10 text-center">
          <h1 className="text-white text-3xl font-bold mb-6">
            Préparation de votre chanson...
          </h1>
          
          {/* Spinner animé */}
          <div className="w-20 h-20 border-t-4 border-b-4 border-purple-500 border-solid rounded-full animate-spin mx-auto"></div>
          
          <p className="text-white mt-6 text-xl font-light tracking-wider">
            Chargement de <span className="font-bold text-purple-400"> {songName} </span>
          </p>
          
          {/* Vidéo cachée pour le préchargement */}
          <video ref={preloadRef} className="hidden" crossOrigin="anonymous" preload="auto" />
        </div>
      </div>
    );
  }

  if (error || !videoUrl) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8"
        style={{
          backgroundImage: event?.customization?.backgroundImageUrl 
            ? `url('${event.customization.backgroundImageUrl}')` 
            : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}>
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"></div>
        
        <div className="relative z-10 text-center bg-gradient-to-br from-red-600/90 to-red-900/90 p-10 rounded-2xl shadow-2xl max-w-lg mx-auto border border-red-400/30">
          <h1 className="text-white text-4xl font-bold">🎤 Erreur</h1>
          <p className="text-white text-xl mt-6 font-light">
            {error || "Problème de chargement de la vidéo"}
          </p>
          <button
            onClick={handleReturn}
            className="mt-8 bg-white text-red-600 px-8 py-4 rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 font-medium shadow-lg flex items-center justify-center mx-auto"
          >
            ← Retour événement
          </button>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-2"
      style={{
        backgroundImage: bgLoaded && event?.customization?.backgroundImageUrl 
          ? `url('${event.customization.backgroundImageUrl}')` 
          : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.5s ease-in-out"
      }}>
      {/* Overlay avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-black/70 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full h-screen flex items-center justify-center px-2 py-2">
        {videoReady ? (
          <div className="relative flex justify-center w-full h-full max-h-screen">
            
            <div className="w-full h-full flex justify-center items-center">
                <div className="border-4 border-gray-400 rounded-lg shadow-lg overflow-hidden m-8">
                  <LiveKaraokeRecorder 
                    karaokeSrc={videoUrl} 
                    eventId={id as string}
                    logoUrl={event?.customization?.logoUrl}
                    buttonStyles={{
                      className: "mt-4 text-white font-bold py-5 px-10 rounded-xl shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 text-xl uppercase tracking-wider flex items-center justify-center mx-auto border border-white/20",
                      icon: "🎵",
                      text: "" // Removed the text here
                    }}
                  />
                </div>
              </div>
          </div>
        ) : (
          <div className="bg-black/60 p-8 rounded-2xl text-white text-center shadow-2xl border border-white/10">
            <div className="animate-pulse">Finalisation du chargement de la vidéo...</div>
            <div className="mt-4 w-full bg-gray-700 rounded-full h-2.5">
              <div className="bg-purple-600 h-2.5 rounded-full w-1/2 animate-[width] duration-1000 ease-in-out"></div>
            </div>
          </div>
        )}
      </div>
      
      {/* Vidéo cachée pour le préchargement */}
      <video ref={preloadRef} className="hidden" crossOrigin="anonymous" preload="auto" />
    </div>
  );
}

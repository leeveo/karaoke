'use client';

import { useParams, useRouter } from 'next/navigation';
import LiveKaraokeRecorder from '@/components/LiveKaraokeRecorder';
import { useEffect, useState, useRef } from 'react';
import { getSongUrl } from '@/services/s3Service';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';

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
  
  // Extraire le nom de la chanson à partir de l'ID
  const songName = decodedSongId.split('/').pop()?.split('.')[0] || decodedSongId;

  // "Retour" button handler - Make sure to include the event ID
  const handleReturn = () => {
    if (id) {
      router.push(`/event/${id}`);
    } else {
      router.push('/'); // Fallback to home if no ID
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

  // Move useEffect hooks to the top level
  useEffect(() => {
    async function loadVideo() {
      try {
        setLoading(true);
        setVideoReady(false);
        
        // Vérifier si c'est un chemin local ou un chemin S3
        if (decodedSongId.startsWith('karaokesaas/')) {
          // C'est une chanson S3, il faut obtenir l'URL signée
          console.log("Chargement depuis S3:", decodedSongId);
          const s3Url = await getSongUrl(decodedSongId);
          
          if (s3Url) {
            console.log("URL S3 générée avec succès");
            setVideoUrl(s3Url);
            
            // Précharger la vidéo avant de la montrer
            if (preloadRef.current) {
              preloadRef.current.src = s3Url;
              preloadRef.current.load();
              
              // Attendre que la vidéo soit prête
              preloadRef.current.oncanplaythrough = () => {
                console.log("Vidéo préchargée avec succès");
                setVideoReady(true);
                setLoading(false);
              };
              
              preloadRef.current.onerror = (e) => {
                console.error("Erreur lors du préchargement de la vidéo:", e);
                setError("Impossible de précharger la vidéo");
                setLoading(false);
              };
            } else {
              // Pas de référence - continuer sans préchargement
              setLoading(false);
            }
          } else {
            setError("Impossible de générer l'URL de la vidéo depuis S3");
            setLoading(false);
          }
        } else {
          // Chemin local
          const localPath = `/songs/${decodedSongId}`;
          setVideoUrl(localPath);
          setVideoReady(true);
          setLoading(false);
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la vidéo:", err);
        setError(`Erreur lors du chargement de la vidéo: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
        setLoading(false);
      }
    }

    loadVideo();
  }, [decodedSongId]);

  // Charger l'événement et ses personnalisations
  useEffect(() => {
    async function loadEvent() {
      try {
        if (typeof id === 'string') {
          const eventData = await fetchEventById(id);
          setEvent(eventData);
          
          // Appliquer les couleurs personnalisées
          if (eventData.customization) {
            // Couleurs primaires et secondaires
            const primaryColor = eventData.customization.primary_color || '#0334b9';
            const secondaryColor = eventData.customization.secondary_color || '#2fb9db';
            
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
            document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
            document.documentElement.style.setProperty('--secondary-color', secondaryColor);
            document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
            document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));
            
            // Ajouter la variable avec opacité pour le fond des boutons
            document.documentElement.style.setProperty('--primary-color-75', hexToRgba(primaryColor, 0.75));
            
            // Gradients
            document.documentElement.style.setProperty(
              '--primary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.primary_color} 0%, ${adjustColorLightness(eventData.customization.primary_color, 20)} 100%)`
            );
            document.documentElement.style.setProperty(
              '--secondary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.secondary_color} 0%, ${adjustColorLightness(eventData.customization.secondary_color, 20)} 100%)`
            );
            
            // Background image handling
            if (eventData.customization.background_image) {
              try {
                const publicUrlResult = supabase.storage
                  .from('karaokestorage')
                  .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
            
                if (publicUrlResult.data?.publicUrl) {
                  const bgUrl = publicUrlResult.data.publicUrl;
                  eventData.customization.backgroundImageUrl = bgUrl;
                  
                  // Preload the image
                  const img = new Image();
                  img.src = bgUrl;
                  img.onload = () => {
                    setBgLoaded(true);
                  };
                  img.onerror = () => {
                    setBgLoaded(true);
                  };
                } else {
                  setBgLoaded(true);
                }
              } catch (error) {
                console.error("Error retrieving image URL:", error);
                setBgLoaded(true);
              }
            } else {
              setBgLoaded(true);
            }
          }
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

          {/* Retour button */}
          <button 
            onClick={handleReturn}
            className="mt-8 px-6 py-3 text-white rounded-lg font-medium transition-all hover:translate-y-[-2px]"
            style={{ 
              backgroundColor: 'var(--primary-color-75)',
              border: 'none',
              borderLeft: '4px solid var(--primary-color)',
              borderRight: '4px solid var(--secondary-color)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            Retour 
          </button>
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
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-purple-950/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full h-screen flex items-center justify-center px-2 py-2">
        {videoReady ? (
          <div className="relative flex justify-center w-full h-full max-h-screen">
            {/* Bordure néon */}
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-300 to-gray-100 rounded-2xl blur opacity-75 transition duration-1000"></div>
            
            {/* Conteneur vidéo - padding retiré pour coller la bordure */}
            <div className="relative bg-black/60 rounded-2xl shadow-2xl border border-white/10 w-full h-full flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
              
              <div className="w-full h-full flex justify-center items-center">
                <LiveKaraokeRecorder 
                  karaokeSrc={videoUrl} 
                  eventId={id as string} 
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

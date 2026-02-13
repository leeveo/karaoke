'use client';

import { useParams } from 'next/navigation';
import LiveKaraokeRecorder from '@/components/LiveKaraokeRecorder';
import { useEffect, useState, useRef } from 'react';
import { getSongUrl } from '../../../services/s3Service';
import { applyStylePackCssVariables } from '@/lib/stylePacks';

const FALLBACK_BACKGROUND_GRADIENT = 'linear-gradient(135deg, #080424 0%, #160e40 100%)';

export default function KaraokePage() {
  const { songId } = useParams();
  const decodedSongId = decodeURIComponent(songId as string);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const preloadRef = useRef<HTMLVideoElement>(null);
  
  // Extraire le nom de la chanson à partir de l'ID
  const songName = decodedSongId.split('/').pop()?.split('.')[0] || decodedSongId;

  // Load customization from sessionStorage or apply defaults
  useEffect(() => {
    const loadCustomization = () => {
      try {
        // Try to get saved customization from sessionStorage
        const savedColorsKey = Object.keys(sessionStorage).find(key => key.startsWith('event-') && key.endsWith('-colors'));
        if (savedColorsKey) {
          const savedColors = JSON.parse(sessionStorage.getItem(savedColorsKey) || '{}');
          console.log('[KaraokePage] 🎨 Customization loaded from sessionStorage:', savedColors);
          
          // Apply style pack if available
          if (savedColors.stylePack) {
            applyStylePackCssVariables(savedColors.stylePack);
          }
          
          // Apply colors
          if (savedColors.primaryColor) {
            document.documentElement.style.setProperty('--primary-color', savedColors.primaryColor);
          }
          if (savedColors.secondaryColor) {
            document.documentElement.style.setProperty('--secondary-color', savedColors.secondaryColor);
          }
          
          // Apply background
          if (savedColors.backgroundImageUrl) {
            document.documentElement.style.setProperty('--bg-image', `url('${savedColors.backgroundImageUrl}')`);
            document.documentElement.classList.add('bg-loaded');
          } else {
            document.documentElement.style.setProperty('--bg-image', FALLBACK_BACKGROUND_GRADIENT);
          }
        } else {
          // No saved customization - use fallback
          console.log('[KaraokePage] ⚠️ No customization found in sessionStorage');
          document.documentElement.style.setProperty('--bg-image', FALLBACK_BACKGROUND_GRADIENT);
        }
      } catch (e) {
        console.error('[KaraokePage] Error loading customization:', e);
        document.documentElement.style.setProperty('--bg-image', FALLBACK_BACKGROUND_GRADIENT);
      }
    };
    
    loadCustomization();
  }, []);

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

  // État de chargement avec design moderne
  if (loading) {
    return (
      <div className="app-background min-h-screen flex flex-col items-center justify-center p-8">
        {/* Overlay pour améliorer la lisibilité */}
        <div className="absolute inset-0 bg-black bg-opacity-75"></div>
        
        <div className="relative z-10 text-center">
          <h1 className="text-white text-3xl font-bold mb-6">
            Préparation de votre chanson...
          </h1>
          
          {/* Spinner animé */}
          <div className="w-20 h-20 border-t-4 border-b-4 border-purple-500 border-solid rounded-full animate-spin mx-auto"></div>
          
          <p className="text-white mt-6 text-xl font-light tracking-wider">
            Chargement de <span className="font-bold text-purple-400">{songName}</span>
          </p>
          
          {/* Vidéo cachée pour le préchargement */}
          <video ref={preloadRef} className="hidden" crossOrigin="anonymous" preload="auto" />
        </div>
      </div>
    );
  }

  // État d'erreur avec design moderne
  if (error || !videoUrl) {
    return (
      <div className="app-background min-h-screen flex flex-col items-center justify-center p-8">
        {/* Overlay pour améliorer la lisibilité */}
        <div className="absolute inset-0 bg-black bg-opacity-75 backdrop-blur-sm"></div>
        
        <div className="relative z-10 text-center bg-gradient-to-br from-red-600/90 to-red-900/90 p-10 rounded-2xl shadow-2xl max-w-lg mx-auto border border-red-400/30">
          <h1 className="text-white text-4xl font-bold">🎤 Erreur</h1>
          <p className="text-white text-xl mt-6 font-light">
            {error || "Problème de chargement de la vidéo"}
          </p>
        </div>
      </div>
    );
  }

  // Vue principale avec design moderne
  return (
    <div className="app-background min-h-screen flex flex-col items-center justify-center p-8">
      {/* Overlay avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-black/70 backdrop-blur-sm"></div>
      
      {/* Effets de lumière */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-40 bg-purple-600/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 right-1/3 w-1/3 h-40 bg-blue-600/20 blur-3xl rounded-full"></div>
      
      <div className="relative z-10 w-full max-w-5xl">
        {videoReady ? (
          <div className="relative flex justify-center w-full">
            {/* Bordure néon */}
            <div className="absolute -inset-1 bg-gradient-to-r from-gray-300 to-gray-100 rounded-2xl blur opacity-75 transition duration-1000"></div>
            
            {/* Conteneur vidéo */}
            <div className="relative bg-black/60 p-6 sm:p-8 rounded-2xl shadow-2xl border border-white/10 w-full">
              <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-2xl pointer-events-none"></div>
              
              <div className="rounded-xl overflow-hidden flex justify-center">
                <LiveKaraokeRecorder 
                  karaokeSrc={videoUrl} 
                  buttonStyles={{
                    className: "mt-4 text-white font-bold py-5 px-10 rounded-xl shadow-xl hover:shadow-2xl transform transition-all duration-300 hover:scale-105 hover:-translate-y-1 text-xl uppercase tracking-wider flex items-center justify-center mx-auto border border-white/20",
                    icon: "🎵",
                    text: "Commencer l'enregistrement"
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
        
        {/* Suggestions d'utilisation */}
        <div className="mt-10 text-center">
          <p className="text-gray-300 text-sm bg-black/30 backdrop-blur-sm inline-block px-6 py-3 rounded-full border border-gray-700/50 shadow-inner">
            🎧 Utilisez un casque pour de meilleurs résultats
          </p>
        </div>
      </div>
      
      {/* Vidéo cachée pour le préchargement */}
      <video ref={preloadRef} className="hidden" crossOrigin="anonymous" preload="auto" />
    </div>
  );
}
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { uploadToS3 } from '@/lib/aws';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import MusicTransitionLoader from '@/components/MusicTransitionLoader';  // Ajout de l'import du loader

export default function EventReviewPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showUploadLoader, setShowUploadLoader] = useState(false);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const { id, sessionId } = useParams();
  const router = useRouter();

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
            document.documentElement.style.setProperty('--primary-color', eventData.customization.primary_color);
            document.documentElement.style.setProperty('--primary-light', adjustColorLightness(eventData.customization.primary_color, 20));
            document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(eventData.customization.primary_color, -20));
            document.documentElement.style.setProperty('--secondary-color', eventData.customization.secondary_color);
            document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(eventData.customization.secondary_color, 20));
            document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(eventData.customization.secondary_color, -20));
            
            // Gradients
            document.documentElement.style.setProperty(
              '--primary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.primary_color} 0%, ${adjustColorLightness(eventData.customization.primary_color, 20)} 100%)`
            );
            document.documentElement.style.setProperty(
              '--secondary-gradient', 
              `linear-gradient(135deg, ${eventData.customization.secondary_color} 0%, ${adjustColorLightness(eventData.customization.secondary_color, 20)} 100%)`
            );
            
            // Handle background image properly
            if (eventData.customization.background_image) {
              try {
                // Get public URL from Supabase storage
                const publicUrlResult = supabase.storage
                  .from('karaokestorage')
                  .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
            
                if (publicUrlResult.data?.publicUrl) {
                  const bgUrl = publicUrlResult.data.publicUrl;
                  eventData.customization.backgroundImageUrl = bgUrl;
                  console.log("Background image loaded:", bgUrl);
                } else {
                  console.error("Public URL not available for image:", eventData.customization.background_image);
                }
              } catch (error) {
                console.error("Error retrieving image URL:", error);
              }
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'événement:', err);
      }
    }
    
    loadEvent();
  }, [id]);

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
    } catch (e) {
      return color; // Return original color if any error occurs
    }
  }

  // Load logo for display
  useEffect(() => {
    const logo = new Image();
    logo.src = '/logo/logo.png';
    
    logo.onload = () => {
      console.log('Review page: Logo loaded successfully');
      logoRef.current = logo;
      setLogoLoaded(true);
    };
    
    logo.onerror = () => {
      console.error('Review page: Error loading logo');
      // Try alternate path
      const altLogo = new Image();
      altLogo.src = '/logo.png';
      
      altLogo.onload = () => {
        logoRef.current = altLogo;
        setLogoLoaded(true);
      };
    };
  }, []);

  // Simuler un écran de chargement pour la transition fluide
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const url = sessionStorage.getItem('karaoke-review-url');
    if (url) setVideoUrl(url);
    else setIsInitializing(true); // Maintenir le chargement si aucune URL n'est trouvée
  }, []);

  // Make sure the review page uses the right video directly
  const handleValidation = async () => {
    if (!videoUrl || !sessionId) return;

    try {
      // Activer à la fois l'indicateur d'upload et le loader de transition
      setIsUploading(true);
      setShowUploadLoader(true);
      setUploadError(null);
      setUploadStep("Préparation de votre vidéo...");
      setUploadProgress(10);
      
      // Use the raw video URL from the recording which should already have the logo embedded
      const tempLocalUrl = videoUrl;
      sessionStorage.setItem('video-local-url', tempLocalUrl);
      
      setUploadStep("Téléchargement de votre vidéo...");
      setUploadProgress(25);
      
      // Fetch the video blob directly - this should contain the logo already embedded
      // because it was drawn on the canvas during recording
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Nouveau format de nom de fichier qui inclut l'ID de l'événement
      const filename = `karaoke-videos/event_${id}/${sessionId}-${Date.now()}.webm`;

      setUploadStep("Sauvegarde de votre performance...");
      setUploadProgress(50);
      console.log("Uploading video with embedded logo to S3...");
      const s3Url = await uploadToS3(blob, filename);
      
      if (s3Url) {
        // Successfully uploaded to S3
        console.log("Video with logo uploaded successfully to:", s3Url);
        sessionStorage.setItem('video-s3-url', s3Url);
        
        // Préparation de la redirection
        setUploadStep("Génération du QR code de partage...");
        setUploadProgress(90);
        
        // Attendre un peu avant de rediriger pour que l'utilisateur puisse voir la progression
        setTimeout(() => {
          // Rediriger vers la page QR avec l'ID de l'événement
          router.push(`/event/${id}/qr/${sessionId}?pageUrl=${encodeURIComponent(s3Url)}`);
        }, 800);
      } else {
        // Handle upload failure
        setUploadError("Impossible de sauvegarder la vidéo en ligne - mais vous pouvez continuer avec une version temporaire");
        setIsUploading(false);
        setShowUploadLoader(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la vidéo :', error);
      setUploadError(error instanceof Error ? error.message : "Erreur inconnue pendant l'upload");
      setIsUploading(false);
      setShowUploadLoader(false);
    }
  };

  // Add a rescue function to proceed even if the upload had a CORS issue
  const handleProceedAnyway = () => {
    if (!sessionId || !videoUrl) return;
    
    // Activer le loader de transition pour cette action aussi
    setShowUploadLoader(true);
    setUploadStep("Préparation d'une version temporaire...");
    setUploadProgress(70);
    
    // Use the local video URL stored in session storage
    const localUrl = sessionStorage.getItem('video-local-url') || videoUrl;
    
    // Attendre un court délai pour laisser le temps au loader de s'afficher
    setTimeout(() => {
      // Rediriger vers la page QR avec l'ID de l'événement
      router.push(`/event/${id}/qr/${sessionId}?pageUrl=${encodeURIComponent(localUrl)}`);
    }, 800);
  };

  // Utiliser le MusicTransitionLoader pour les deux états de chargement
  return (
    <>
      {/* Loader de transition pour l'initialisation */}
      <MusicTransitionLoader 
        isVisible={isInitializing} 
        step="Préparation de votre performance..." 
        progress={60}
      />
      
      {/* Loader de transition pour l'upload */}
      <MusicTransitionLoader 
        isVisible={showUploadLoader} 
        step={uploadStep || "Traitement de votre vidéo..."} 
        progress={uploadProgress}
      />

      {/* Contenu principal de la page */}
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{
          backgroundImage: event?.customization?.backgroundImageUrl 
            ? `url('${event.customization.backgroundImageUrl}')` 
            : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed"
        }}
      >
        {/* Overlay pour améliorer la lisibilité */}
        <div className="absolute inset-0 bg-black bg-opacity-0"></div>
        
        {/* Contenu principal */}
        <div className="z-10 w-full max-w-5xl flex flex-col items-center">
          {/* Afficher le nom de l'événement en haut */}
          {event && (
            <h2 
              className="text-2xl font-bold mb-4 text-center"
              style={{ color: 'var(--primary-color)' }}
            >
              {event.name}
            </h2>
          )}
          
          <h1 
            className="text-3xl font-bold mb-8 text-center"
            style={{ color: 'var(--primary-color)' }}
          >
            Revue de votre performance
          </h1>

          {videoUrl ? (
            <div 
              ref={videoContainerRef}
              className="w-full max-w-5xl aspect-video flex items-center justify-center bg-black bg-opacity-40 p-4 rounded-lg shadow-xl mb-8 relative"
              style={{ 
                borderLeft: '3px solid var(--primary-color)',
                borderRight: '3px solid var(--secondary-color)',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
              }}
            >
              <video
                src={videoUrl}
                autoPlay
                loop
                playsInline
                className="w-full h-full mx-auto object-contain rounded"
              />
              
             
            </div>
          ) : (
            <div 
              className="w-full max-w-5xl aspect-video flex items-center justify-center p-4 rounded-lg mb-8"
              style={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                borderLeft: '3px solid var(--primary-color)',
                borderRight: '3px solid var(--secondary-color)'
              }}
            >
              <p className="text-white text-xl">Chargement de la vidéo...</p>
            </div>
          )}

          {uploadError && (
            <div 
              className="mb-6 p-4 backdrop-blur-sm rounded-lg text-white text-center max-w-lg"
              style={{ 
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderLeft: '3px solid var(--secondary-color)',
                borderRight: '3px solid var(--secondary-color)'
              }}
            >
              <p className="mb-2">{uploadError}</p>
              <button 
                onClick={handleProceedAnyway}
                className="text-sm underline hover:text-red-300 transition-colors"
                style={{ color: 'var(--secondary-light)' }}
              >
                Continuer quand même
              </button>
            </div>
          )}

          {/* Boutons stylisés avec couleurs du thème de l'événement */}
          <div className="mt-6 flex flex-wrap gap-5 justify-center">
            <button
              onClick={() => router.push(`/event/${id}`)}
              className="font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2"
              style={{ 
                background: 'var(--primary-gradient)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
              // Désactiver pendant l'upload pour éviter les actions multiples
              disabled={isUploading || showUploadLoader}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Retour à l'événement
            </button>
            
            <button
              onClick={handleValidation}
              disabled={isUploading || !videoUrl || showUploadLoader}
              className={`
                ${isUploading || !videoUrl || showUploadLoader
                  ? "opacity-60 cursor-not-allowed" 
                  : "hover:shadow-2xl hover:scale-105 hover:-translate-y-1"}
                font-bold py-4 px-8 
                rounded-xl shadow-xl transition-all duration-300 flex items-center gap-2
              `}
              style={{ 
                background: 'var(--secondary-gradient)',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}
            >
              {isUploading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Traitement en cours...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Valider et partager
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

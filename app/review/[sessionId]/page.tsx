'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { uploadToS3 } from '../../../lib/aws'; // Fixed import path with relative reference
import Image from 'next/image';

export default function ReviewPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  // Extraction sécurisée du paramètre sessionId
  const params = useParams() as Record<string, string | string[]>;
  let sessionId = '';
  if (params && typeof params === 'object') {
    const rawSessionId = params.sessionId;
    sessionId = Array.isArray(rawSessionId) ? rawSessionId[0] : rawSessionId || '';
  }
  const router = useRouter();

  // Load logo for display
  useEffect(() => {
    // Use the global window.Image constructor to avoid TypeScript errors
    const logo = new window.Image();
    logo.src = '/logo/logo.png';
    
    logo.onload = () => {
      console.log('Review page: Logo loaded successfully');
      logoRef.current = logo;
    };
    
    logo.onerror = () => {
      console.error('Review page: Error loading logo');
      // Try alternate path
      const altLogo = new window.Image();
      altLogo.src = '/logo.png';
      
      altLogo.onload = () => {
        logoRef.current = altLogo;
      };
    };
  }, []);

  useEffect(() => {
    const url = sessionStorage.getItem('karaoke-review-url');
    if (url) setVideoUrl(url);
  }, []);

  // Make sure the review page uses the right video directly
  const handleValidation = async () => {
    if (!videoUrl || !sessionId) return;

    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Use the raw video URL from the recording which should already have the logo embedded
      const tempLocalUrl = videoUrl;
      sessionStorage.setItem('video-local-url', tempLocalUrl);
      
      // Fetch the video blob directly - this should contain the logo already embedded
      // because it was drawn on the canvas during recording
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      // Correction : convertir le Blob en File pour uploadToS3
      const filename = `karaoke-videos/review_${sessionId}-${Date.now()}.webm`;
      const file = new File([blob], filename, { type: blob.type });

      console.log("Uploading video with embedded logo to S3...");
      const s3Url = await uploadToS3(file, filename);
      
      if (s3Url) {
        // Successfully uploaded to S3
        console.log("Video with logo uploaded successfully to:", s3Url);
        sessionStorage.setItem('video-s3-url', s3Url);
        router.push(`/qr/${sessionId}?pageUrl=${encodeURIComponent(s3Url)}`);
      } else {
        // Handle upload failure
        setUploadError("Impossible d&apos;enregistrer la vidéo en ligne - mais vous pouvez continuer avec une version temporaire");
        setIsUploading(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la vidéo :', error);
      setUploadError(error instanceof Error ? error.message : "Erreur inconnue pendant l'upload");
      setIsUploading(false);
    }
  };

  // Add a rescue function to proceed even if the upload had a CORS issue
  const handleProceedAnyway = () => {
    if (!sessionId || !videoUrl) return;
    
    // Use the local video URL stored in session storage
    const localUrl = sessionStorage.getItem('video-local-url') || videoUrl;
    router.push(`/qr/${sessionId}?pageUrl=${encodeURIComponent(localUrl)}`);
  };

  return (
    <div className="app-background min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{
        backgroundImage: "linear-gradient(135deg, #080424 0%, #160e40 100%)"
      }}
    >
      {/* Contenu principal */}
      <div className="z-10 w-full max-w-5xl flex flex-col items-center">
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
            
            {/* Logo overlay */}
            {logoRef.current && (
              <div className="absolute bottom-6 right-6 z-10 pointer-events-none">
                <Image
                  src={logoRef.current.src} 
                  alt="Logo"
                  width={200}
                  height={200}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            )}
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

        {/* Styled buttons with theme colors */}
        <div className="mt-6 flex flex-wrap gap-5 justify-center">
          <button
            onClick={() => router.push('/')}
            className="font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-2"
            style={{ 
              background: 'var(--primary-gradient)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Retour Accueil
          </button>
          
          <button
            onClick={handleValidation}
            disabled={isUploading || !videoUrl}
            className={`
              ${isUploading || !videoUrl 
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
  );
}
'use client';

import { useRef, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MusicTransitionLoader from './MusicTransitionLoader';
import { CameraKitProvider } from '../contexts/CameraKitContext';
import { useCameraKit } from '../hooks/useCameraKit';
import { loadLogoImage, createFallbackLogo } from '@/lib/offline/logoHelper';

interface ButtonStyles {
  className?: string;
  icon?: string;
  text?: string;
}

interface LiveKaraokeRecorderProps {
  karaokeSrc: string;
  eventId?: string;
  logoUrl?: string; // URL du logo de l'événement
  buttonStyles?: ButtonStyles;
}

// Composant enveloppé pour utiliser CameraKit
function LiveKaraokeRecorderWithCameraKit(props: LiveKaraokeRecorderProps) {
  return (
    <CameraKitProvider>
      <LiveKaraokeRecorderInner {...props} />
    </CameraKitProvider>
  );
}

// Composant interne qui utilise le hook useCameraKit
function LiveKaraokeRecorderInner({ 
  karaokeSrc, 
  eventId,
  logoUrl,
  buttonStyles = {} 
}: LiveKaraokeRecorderProps) {
  // Références
  const webcamVideoRef = useRef<HTMLVideoElement>(null);
  const karaokeVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const playingRef = useRef<boolean>(false);
  const logoRef = useRef<HTMLImageElement | null>(null);
  const cameraKitContainerRef = useRef<HTMLDivElement>(null);
  const setupInProgressRef = useRef<boolean>(false);
  
  // Navigation
  const router = useRouter();
  const { songId } = useParams();
  
  // États
  const [recordingStarted, setRecordingStarted] = useState(false);
  const [webcamReady, setWebcamReady] = useState(false);
  const [karaokeReady, setKaraokeReady] = useState(false);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  
  // Utiliser le contexte CameraKit
  const { 
    setWebcamElement,
    session
  } = useCameraKit();

  // Charger le logo depuis offline ou par défaut
  useEffect(() => {
    async function loadLogo() {
      try {
        // Si un logoUrl est fourni (mode online), l'utiliser en priorité
        if (logoUrl) {
          console.log('Loading logo from provided URL:', logoUrl);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoUrl;
          
          img.onload = () => {
            console.log('Logo loaded successfully from provided URL');
            logoRef.current = img;
            setLogoLoaded(true);
          };
          
          img.onerror = () => {
            console.warn('Failed to load logo from provided URL, trying fallback');
            // Essayer avec le helper en cas d'échec
            loadFromHelper();
          };
          return;
        }
        
        // Sinon, utiliser le helper (mode offline ou pas de logo fourni)
        loadFromHelper();
        
      } catch (err) {
        console.error('Error loading logo:', err);
        createFallback();
      }
    }
    
    async function loadFromHelper() {
      console.log('Loading logo for event:', eventId);
      const logo = await loadLogoImage(eventId || '');
      if (logo) {
        logoRef.current = logo;
        setLogoLoaded(true);
      } else {
        createFallback();
      }
    }
    
    function createFallback() {
      console.log('Creating fallback logo');
      const fallbackCanvas = createFallbackLogo();
      const fallbackImg = new Image();
      fallbackImg.src = fallbackCanvas.toDataURL('image/png');
      fallbackImg.onload = () => {
        logoRef.current = fallbackImg;
        setLogoLoaded(true);
      };
    }
    
    loadLogo();
  }, [eventId, logoUrl]);

  // Intercepteur d'erreurs amélioré pour éviter les erreurs liées à play()
  useEffect(() => {
    const originalConsoleError = console.error;
    
    console.error = function(...args) {
      const errorMessage = args.join(' ');
      if (
        errorMessage.includes('play() request was interrupted') ||
        errorMessage.includes('https://goo.gl/LdLk22') ||
        errorMessage.includes('play() failed') ||
        (errorMessage.includes('play()') && 
         (errorMessage.includes('interrupted') || 
          errorMessage.includes('failed') ||
          errorMessage.includes('load request')))
      ) {
        return; // Supprimer ces erreurs spécifiques
      }
      originalConsoleError(...args);
    };
    
    return () => {
      console.error = originalConsoleError;
    };
  }, []);

  // Configuration principale et boucle de rendu
  useEffect(() => {
    let animationFrameId: number;

    const setup = async () => {
      try {
        // Prevent multiple simultaneous setup attempts
        if (setupInProgressRef.current) {
          console.log("Setup already in progress, skipping duplicate call");
          return;
        }
        setupInProgressRef.current = true;
        
        // 1. Configurer la vidéo karaoké
        if (karaokeVideoRef.current) {
          karaokeVideoRef.current.crossOrigin = "anonymous";
          karaokeVideoRef.current.src = karaokeSrc;
          karaokeVideoRef.current.volume = 0.7;
          
          // Configurer les événements de la vidéo karaoké
          karaokeVideoRef.current.onended = () => {
            if (recordingStarted && mediaRecorderRef.current?.state === 'recording') {
              console.log("Vidéo terminée, arrêt automatique de l'enregistrement");
              stopRecording();
            }
          };
          
          karaokeVideoRef.current.oncanplay = () => {
            console.log("Vidéo karaoké prête");
            setKaraokeReady(true);
          };
          
          karaokeVideoRef.current.onerror = () => {
            console.error("Erreur vidéo:", karaokeVideoRef.current?.error);
          };
        } else {
          console.error("Élément vidéo karaoké non disponible");
          return;
        }
        
        // 2. Activer la webcam
        try {
          // Petit délai pour s'assurer que les refs sont bien initialisés
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }, 
            audio: true 
          });
          
          // IMPORTANT: Vérifier que l'élément vidéo est disponible avant d'y accéder
          if (webcamVideoRef.current) {
            webcamVideoRef.current.srcObject = stream;
            try {
              await webcamVideoRef.current.play();
              setWebcamReady(true);
            } catch (playError) {
              console.warn("Webcam play error (may require user interaction):", playError);
              setWebcamReady(true); // Set ready anyway, user interaction might be needed
            }
            
            // Initialiser Camera Kit avec le flux webcam
            console.log("Setting webcam element for CameraKit");
            setWebcamElement(webcamVideoRef.current);
            
            console.log("Webcam activée");
          } else {
            console.error("Élément vidéo webcam non disponible");
            return;
          }
        } catch (webcamError) {
          console.error("Erreur d'accès à la webcam:", webcamError);
          return;
        }
        
        // 3. Initialiser le canvas
        if (!canvasRef.current) {
          console.error("Élément canvas non disponible");
          return;
        }
        
        const canvas = canvasRef.current;
        canvas.width = webcamVideoRef.current.videoWidth || 640;
        canvas.height = webcamVideoRef.current.videoHeight || 480;
        
        // 4-5. Configurer l'audio et l'enregistrement
        try {
          audioContextRef.current = new AudioContext();
          const audioContext = audioContextRef.current;
          
          audioDestinationRef.current = audioContext.createMediaStreamDestination();
          
          const stream = webcamVideoRef.current.srcObject as MediaStream;
          const microphoneSource = audioContext.createMediaStreamSource(stream);
          microphoneSource.connect(audioDestinationRef.current);
          
          const canvasStream = canvas.captureStream(30);
          
          if (!audioDestinationRef.current) {
            console.error("Destination audio non disponible");
            return;
          }
          
          const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioDestinationRef.current.stream.getAudioTracks()
          ]);
          
          mediaRecorderRef.current = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus'
          });
          
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          
          mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, {
              type: 'video/webm'
            });
            
            const url = URL.createObjectURL(blob);
            sessionStorage.setItem('karaoke-review-url', url);
            
            if (eventId) {
              router.push(`/event/${eventId}/review/${songId}`);
            } else {
              router.push(`/review/${songId}`);
            }
          };
        } catch (recorderError) {
          console.error("Erreur de configuration de l'enregistreur:", recorderError);
          return;
        }
        
        // 6. Fonction de dessin avec logo toujours visible
        const drawFrame = () => {
          if (!canvasRef.current) return;
          
          const ctx = canvasRef.current.getContext('2d');
          if (!ctx) return;
          
          try {
            // Effacer le canvas
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            
            // Dessiner la webcam ou le flux Camera Kit
            if (session?.output?.live) {
              try {
                // Dessiner le canvas de Camera Kit qui contient déjà les filtres
                ctx.drawImage(
                  session.output.live,
                  0, 0, canvasRef.current.width, canvasRef.current.height
                );
              } catch (e) {
                console.error("Error drawing CameraKit output:", e);
                
                // Fallback à la webcam sans filtre si Camera Kit échoue
                if (webcamVideoRef.current) {
                  ctx.save();
                  ctx.translate(canvasRef.current.width, 0);
                  ctx.scale(-1, 1);
                  ctx.drawImage(
                    webcamVideoRef.current,
                    0, 0, canvasRef.current.width, canvasRef.current.height
                  );
                  ctx.restore();
                }
              }
            } else if (webcamVideoRef.current) {
              // Dessiner la webcam sans filtre mais avec effet miroir
              ctx.save();
              ctx.translate(canvasRef.current.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(
                webcamVideoRef.current,
                0, 0, canvasRef.current.width, canvasRef.current.height
              );
              ctx.restore();
            }
            
            // Ajouter la vidéo karaoké avec transparence
            if (karaokeVideoRef.current && karaokeVideoRef.current.readyState >= 2) {
              ctx.globalAlpha = 0.4; // Réduire l'opacité pour mieux voir les filtres
              ctx.drawImage(
                karaokeVideoRef.current,
                0, 0, canvasRef.current.width, canvasRef.current.height
              );
              ctx.globalAlpha = 1.0; // Restaurer l'opacité
            }
            
            // Toujours afficher le logo, qu'on soit en enregistrement ou non
            if (logoRef.current && logoLoaded) {
              // Logo réduit de 50% - taille 10% au lieu de 20%
              const logoWidth = canvasRef.current.width * 0.10;
              const logoHeight = (logoRef.current.height / logoRef.current.width) * logoWidth;
              
              // Position en haut à droite
              const logoX = canvasRef.current.width - logoWidth - 20;
              const logoY = 20;
              
              // Fond semi-transparent pour le logo
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
              ctx.fillRect(logoX - 5, logoY - 5, logoWidth + 10, logoHeight + 10);
              
              // Bordure autour du logo
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
              ctx.lineWidth = 2;
              ctx.strokeRect(logoX - 5, logoY - 5, logoWidth + 10, logoHeight + 10);
              
              // Dessiner le logo avec opacité complète
              ctx.globalAlpha = 1.0;
              ctx.drawImage(
                logoRef.current,
                logoX, logoY, logoWidth, logoHeight
              );
            } else {
              // Fallback si le logo n'est pas disponible
              ctx.save();
              
              const textX = canvasRef.current.width - 150;
              const textY = 50;
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
              ctx.fillRect(textX - 10, textY - 30, 150, 40);
              
              ctx.fillStyle = 'white';
              ctx.font = 'bold 24px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('KARAOKE APP', textX + 65, textY);
              
              ctx.restore();
            }
          } catch (err) {
            console.error("Erreur lors du dessin:", err);
          }
          
          animationFrameId = requestAnimationFrame(drawFrame);
        };
        
        // Démarrer la boucle de dessin
        drawFrame();
        
      } catch (err) {
        console.error("Erreur lors de l'initialisation:", err);
        setupInProgressRef.current = false;
      }
    };

    setup();

    // Nettoyage
    return () => {
      setupInProgressRef.current = false;
      
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }

      const karaokeVideo = karaokeVideoRef.current;
      const webcamVideo = webcamVideoRef.current;
      const audioContext = audioContextRef.current;

      if (karaokeVideo) {
        karaokeVideo.pause();
      }
      
      if (webcamVideo) {
        webcamVideo.pause();
        
        const tracks = (webcamVideo.srcObject as MediaStream)?.getTracks();
        tracks?.forEach((track) => track.stop());
      }

      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {});
      }
    };
  }, [karaokeSrc, logoLoaded]);

  // Charger directement un logo par défaut lors du premier render
  useEffect(() => {
    // Logo toujours disponible même sans événement
    const preloadDefaultLogo = () => {
      console.log("Preloading default logo");
      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.src = '/logo/logo.png';
      
      logo.onload = () => {
        console.log('Default logo loaded successfully');
        logoRef.current = logo;
        setLogoLoaded(true);
      };
      
      logo.onerror = () => {
        console.error('Error loading default logo');
        
        // Essayer des chemins alternatifs dans l'ordre
        const alternateLogos = [
          '/logo.png', 
          '/images/logo.png', 
          '/assets/logo.png',
          '/public/logo.png',
          '/public/logo/logo.png'
        ];
        
        let loadedAny = false;
        
        alternateLogos.forEach(path => {
          if (!loadedAny) {
            const altLogo = new Image();
            altLogo.crossOrigin = "anonymous";
            altLogo.src = path;
            
            altLogo.onload = () => {
              if (!loadedAny) {
                console.log(`Logo loaded from alternate path: ${path}`);
                logoRef.current = altLogo;
                setLogoLoaded(true);
                loadedAny = true;
              }
            };
          }
        });
        
        // Fallback simple logo si rien ne marche
        if (!loadedAny) {
          console.log("Creating a simple canvas logo");
          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 100;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            // Draw a simple logo
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, 200, 100);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('KARAOKE APP', 100, 50);
            ctx.strokeStyle = '#3f83f8';
            ctx.lineWidth = 4;
            ctx.strokeRect(5, 5, 190, 90);
            
            // Convert canvas to image
            const img = new Image();
            img.src = canvas.toDataURL('image/png');
            img.onload = () => {
              logoRef.current = img;
              setLogoLoaded(true);
            };
          }
        }
      };
    };
    
    // Always load a default logo immediately
    preloadDefaultLogo();
  }, []);

  // Fonction pour démarrer l'enregistrement
  const startRecording = async () => {
    if (!audioContextRef.current || !karaokeVideoRef.current || !mediaRecorderRef.current || !audioDestinationRef.current) {
      console.error("Recording start failed: missing required refs");
      return;
    }
    
    if (playingRef.current) {
      console.log("Lecture déjà en cours, ignorée");
      return;
    }
    
    try {
      playingRef.current = true;
      
      // S'assurer que la vidéo est prête
      if (karaokeVideoRef.current.readyState < 3) {
        await new Promise<void>((resolve) => {
          function checkReadyState() {
            if (karaokeVideoRef.current && karaokeVideoRef.current.readyState >= 3) {
              resolve();
            } else {
              setTimeout(checkReadyState, 100);
            }
          }
          checkReadyState();
        });
      }
      
      // Forcer le chargement du logo si ce n'est pas encore fait
      if (!logoLoaded && !logoRef.current) {
        console.log("Chargement forcé du logo avant l'enregistrement");
        
        // Fonction pour charger le logo par défaut en cas d'erreur
        const loadDefaultLogo = () => {
          const logo = new Image();
          logo.crossOrigin = "anonymous";
          logo.src = '/logo/logo.png';
          
          return new Promise<void>((resolve) => {
            logo.onload = () => {
              console.log('Default logo loaded successfully before recording');
              logoRef.current = logo;
              setLogoLoaded(true);
              resolve();
            };
            
            logo.onerror = () => {
              console.error('Error loading default logo');
              // Try alternate path
              const altLogo = new Image();
              altLogo.crossOrigin = "anonymous";
              altLogo.src = '/logo.png';
              
              altLogo.onload = () => {
                logoRef.current = altLogo;
                setLogoLoaded(true);
                resolve();
              };
              
              altLogo.onerror = () => {
                // Just continue even without logo
                resolve();
              };
            };
          });
        };
        
        await loadDefaultLogo();
      }
      
      // Réinitialiser les chunks d'enregistrement
      recordedChunksRef.current = [];
      
      // Créer un élément audio séparé pour la vidéo karaoké
      const audioContext = audioContextRef.current;
      const mediaElement = new Audio();
      mediaElement.crossOrigin = "anonymous";
      mediaElement.src = karaokeVideoRef.current.src;
      mediaElement.volume = 0.7;
      
      // Attendre que l'élément audio soit prêt
      await new Promise<void>((resolve) => {
        const onCanPlay = () => {
          mediaElement.removeEventListener('canplay', onCanPlay);
          resolve();
        };
        
        if (mediaElement.readyState >= 3) {
          resolve();
        } else {
          mediaElement.addEventListener('canplay', onCanPlay);
        }
      });
      
      // Connecter l'élément audio au contexte audio
      const karaokeSource = audioContext.createMediaElementSource(mediaElement);
      karaokeSource.connect(audioDestinationRef.current);
      karaokeSource.connect(audioContext.destination);
      
      // Remettre à zéro les compteurs de temps
      karaokeVideoRef.current.currentTime = 0;
      mediaElement.currentTime = 0;
      
      // Démarrer l'enregistrement AVANT de lancer la lecture
      console.log("Starting MediaRecorder...");
      mediaRecorderRef.current.start();
      setRecordingStarted(true);
      
      // Petit délai pour s'assurer que l'enregistrement est bien démarré
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Démarrer la lecture avec gestion d'erreur
      try {
        console.log("Starting video playback...");
        const playPromise = karaokeVideoRef.current.play();
        
        // Gérer la promesse de lecture de manière robuste
        if (playPromise !== undefined) {
          try {
            await playPromise;
            console.log("Karaoke video playing successfully");
          } catch (e) {
            console.warn("Première tentative de lecture vidéo échouée, nouvelle tentative...", e);
            await karaokeVideoRef.current!.play().catch(() => {
              console.warn("Second attempt also failed, continuing anyway");
            });
          }
        }
        
        // Court délai entre le démarrage de la vidéo et de l'audio
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("Starting audio playback...");
        await mediaElement.play().catch(() => {
          console.warn("Audio playback failed, continuing anyway");
        });
        
      } catch (playError) {
        console.error("Erreur lors de la lecture:", playError);
        alert("Veuillez interagir avec la page pour autoriser la lecture audio");
        // Ne pas arrêter l'enregistrement - l'utilisateur pourrait interagir et l'audio démarrera
      }
    } catch (err) {
      console.error("Erreur au démarrage de l'enregistrement:", err);
      playingRef.current = false;
      
      // S'assurer que l'enregistrement est arrêté en cas d'erreur
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      setRecordingStarted(false);
    }
  };
  
  // Fonction pour arrêter l'enregistrement
  const stopRecording = () => {
    if (!recordingStarted || isProcessing) return;

    setIsProcessing(true);
    setProcessingStep("Arrêt de l'enregistrement...");
    setProcessingProgress(5);
    
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') {
        setProcessingStep("Finalisation de la vidéo...");
        setProcessingProgress(20);
        mediaRecorderRef.current.stop();
      }
  
      if (karaokeVideoRef.current) {
        karaokeVideoRef.current.pause();
      }
      
      if (webcamVideoRef.current) {
        setProcessingStep("Libération de la caméra...");
        setProcessingProgress(35);
        webcamVideoRef.current.pause();
        
        const tracks = (webcamVideoRef.current.srcObject as MediaStream)?.getTracks();
        tracks?.forEach((track) => track.stop());
      }
  
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        setProcessingStep("Finalisation de l'audio...");
        setProcessingProgress(50);
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
      
      setRecordingStarted(false);
      playingRef.current = false;
      
      setProcessingStep("Mixage de la vidéo et de l'audio...");
      setProcessingProgress(65);
      
      let currentProgress = 65;
      const progressInterval = setInterval(() => {
        currentProgress += Math.random() * 3;
        if (currentProgress >= 95) {
          clearInterval(progressInterval);
          currentProgress = 95;
          setProcessingProgress(currentProgress);
          setProcessingStep("Préparation de la vidéo pour la revue...");
        } else {
          setProcessingProgress(currentProgress);
        }
      }, 300);
    }, 500);
  };

  // Styles du bouton
  const defaultButtonClassName = "mt-4 text-white font-bold py-16 px-32 rounded-4xl transition-all duration-300 transform shadow-2xl border-2 border-white/30 text-5xl leading-tight";
  const buttonClassName = buttonStyles?.className || defaultButtonClassName;
  const buttonText = buttonStyles?.text || "Cliquez ici pour\nlancer le karaoké";
  const buttonIcon = buttonStyles?.icon || "";

  return (
    <div className="w-full flex flex-col items-center justify-center">
      {/* Vidéos cachées */}
      <video 
        ref={karaokeVideoRef} 
        className="hidden" 
        crossOrigin="anonymous" 
        preload="auto"
        playsInline
        muted
      />
      
      <video 
        ref={webcamVideoRef} 
        className="hidden" 
        playsInline 
        muted
      />
      
      {/* Container pour CameraKit - maintenu invisible mais présent dans le DOM */}
      <div className="hidden">
        <div ref={cameraKitContainerRef}></div>
      </div>
      
      
      {/* Canvas principal */}
      <div className="w-full h-full flex justify-center relative">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full rounded-lg shadow-lg" 
          style={{ 
            maxHeight: '80vh',
            objectFit: 'contain'
          }}
        />

        {/* Overlay du bouton "Démarrer l'enregistrement" */}
        {!recordingStarted && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startRecording}
              disabled={!webcamReady || !karaokeReady || playingRef.current}
              className={
                webcamReady && karaokeReady && !playingRef.current
                  ? buttonClassName + " hover:bg-opacity-100 backdrop-blur-sm"
                  : "opacity-70 bg-gray-600 cursor-not-allowed py-4 px-6 rounded-xl text-white text-opacity-70 bg-opacity-70 backdrop-blur-sm"
              }
              style={
                webcamReady && karaokeReady && !playingRef.current
                  ? { background: 'var(--secondary-gradient)', opacity: 0.9 }
                  : {}
              }
            >
              <span className="flex flex-col items-center justify-center gap-2">
                {buttonIcon && <span className="mr-1">{buttonIcon}</span>}
                <span className={webcamReady && karaokeReady && !playingRef.current ? "w-3 h-3 rounded-full bg-white animate-pulse" : "hidden"}></span>
                {buttonText && <span className="whitespace-pre-line">{buttonText}</span>}
              </span>
            </button>
          </div>
        )}
        
        {/* Loader de transition musicale */}
        <MusicTransitionLoader 
          isVisible={isProcessing}
          step={processingStep || undefined}
          progress={processingProgress}
        />
      </div>
      
      {/* Affichage du statut */}
      
      {/* Bouton "Arrêter l'enregistrement" */}
      {recordingStarted && !isProcessing && (
        <div className="mt-6 flex justify-center w-full">
          <button
            onClick={stopRecording}
            className="btn-primary flex items-center gap-3 px-12 py-6 rounded-xl hover:scale-105 hover:-translate-y-1 text-2xl font-bold"
            style={{ background: 'var(--primary-gradient)' }}
          >
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
              <rect x="6" y="6" width="8" height="8" />
            </svg>
            <span>Arrêter l&apos;enregistrement</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Exporter le composant enveloppé
export default LiveKaraokeRecorderWithCameraKit;
'use client';

import { useRef, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MusicTransitionLoader from './MusicTransitionLoader';
import { CameraKitProvider } from '../contexts/CameraKitContext';
import { useCameraKit } from '../hooks/useCameraKit';

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
  const logoDrawnOnceRef = useRef<boolean>(false);
  
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
      console.log('[LiveKaraokeRecorder] loadLogo called with:', { logoUrl, eventId });
      
      try {
        // Si un logoUrl est fourni (mode online), l'utiliser en priorité
        if (logoUrl) {
          console.log('[LiveKaraokeRecorder] Loading logo from provided URL:', logoUrl);
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = logoUrl;
          
          img.onload = () => {
            console.log('[LiveKaraokeRecorder] Logo loaded successfully from provided URL');
            logoRef.current = img;
            setLogoLoaded(true);
          };
          
          img.onerror = () => {
            console.warn('[LiveKaraokeRecorder] Failed to load logo from provided URL - no logo will be displayed');
            // Ne pas afficher de logo si le chargement échoue
            logoRef.current = null;
            setLogoLoaded(false);
          };
          return;
        }
        
        // Si pas de logoUrl fourni, ne rien afficher
        console.log('[LiveKaraokeRecorder] No logo URL provided - no logo will be displayed');
        logoRef.current = null;
        setLogoLoaded(false);
        
      } catch (err) {
        console.error('[LiveKaraokeRecorder] Error loading logo:', err);
        logoRef.current = null;
        setLogoLoaded(false);
      }
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
        
        // Attendre que les refs soient attachés aux éléments DOM
        let retries = 0;
        const maxRetries = 20; // 2 secondes max
        while ((!webcamVideoRef.current || !karaokeVideoRef.current || !canvasRef.current) && retries < maxRetries) {
          console.log(`Attente des refs DOM... tentative ${retries + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
        
        // Vérifier que tous les refs sont disponibles
        if (!webcamVideoRef.current) {
          console.error("❌ Élément vidéo webcam toujours non disponible après attente");
          setupInProgressRef.current = false;
          return;
        }
        
        if (!karaokeVideoRef.current) {
          console.error("❌ Élément vidéo karaoké toujours non disponible après attente");
          setupInProgressRef.current = false;
          return;
        }
        
        if (!canvasRef.current) {
          console.error("❌ Élément canvas toujours non disponible après attente");
          setupInProgressRef.current = false;
          return;
        }
        
        console.log("✅ Tous les refs DOM sont disponibles, démarrage de la configuration");
        
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
          console.log("🎥 Demande d'accès à la webcam et au microphone...");
          
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }, 
            audio: true 
          });
          
          console.log("✅ Accès webcam autorisé, configuration du flux...");
          
          // Les refs ont été vérifiés au début de setup(), donc ils existent forcément
          webcamVideoRef.current.srcObject = stream;
          
          try {
            await webcamVideoRef.current.play();
            console.log("✅ Webcam en lecture");
            setWebcamReady(true);
          } catch (playError) {
            console.warn("⚠️ Webcam play warning (user interaction may be needed):", playError);
            setWebcamReady(true); // Set ready anyway, user interaction might be needed
          }
          
          // Initialiser Camera Kit avec le flux webcam
          console.log("🎨 Configuration Camera Kit...");
          setWebcamElement(webcamVideoRef.current);
          
          console.log("✅ Webcam complètement activée et configurée");
        } catch (webcamError) {
          console.error("❌ Erreur d'accès à la webcam:", webcamError);
          setupInProgressRef.current = false;
          return;
        }
        
        // 3. Initialiser le canvas
        console.log("🎨 Initialisation du canvas...");
        const canvas = canvasRef.current;
        canvas.width = webcamVideoRef.current.videoWidth || 640;
        canvas.height = webcamVideoRef.current.videoHeight || 480;
        console.log(`✅ Canvas configuré: ${canvas.width}x${canvas.height}`);
        
        // 4-5. Configurer l'audio et l'enregistrement
        try {
          console.log("🎵 Configuration du contexte audio...");
          audioContextRef.current = new AudioContext();
          const audioContext = audioContextRef.current;
          
          audioDestinationRef.current = audioContext.createMediaStreamDestination();
          
          const stream = webcamVideoRef.current.srcObject as MediaStream;
          const microphoneSource = audioContext.createMediaStreamSource(stream);
          microphoneSource.connect(audioDestinationRef.current);
          console.log("✅ Flux audio microphone configuré");
          
          const canvasStream = canvas.captureStream(30);
          console.log("✅ Flux vidéo canvas configuré (30 FPS)");
          
          const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioDestinationRef.current.stream.getAudioTracks()
          ]);
          console.log("✅ Flux combiné (vidéo + audio) créé");
          
          console.log("🎬 Création du MediaRecorder...");
          mediaRecorderRef.current = new MediaRecorder(combinedStream, {
            mimeType: 'video/webm;codecs=vp8,opus'
          });
          
          mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) {
              recordedChunksRef.current.push(e.data);
            }
          };
          
          mediaRecorderRef.current.onstop = () => {
            console.log("🎬 Enregistrement terminé, création du blob vidéo...");
            const blob = new Blob(recordedChunksRef.current, {
              type: 'video/webm'
            });
            
            const url = URL.createObjectURL(blob);
            sessionStorage.setItem('karaoke-review-url', url);
            console.log("✅ Vidéo sauvegardée, redirection vers la page de revue...");
            
            if (eventId) {
              router.push(`/event/${eventId}/review/${songId}`);
            } else {
              router.push(`/review/${songId}`);
            }
          };
          
          console.log("✅ MediaRecorder configuré avec succès");
        } catch (recorderError) {
          console.error("❌ Erreur de configuration de l'enregistreur:", recorderError);
          setupInProgressRef.current = false;
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
              if (!logoDrawnOnceRef.current) {
                console.log('[LiveKaraokeRecorder] Drawing logo:', {
                  src: logoRef.current.src,
                  width: logoRef.current.width,
                  height: logoRef.current.height
                });
                logoDrawnOnceRef.current = true;
              }
              
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
            }
            // Ne rien afficher si pas de logo disponible
          } catch (err) {
            console.error("Erreur lors du dessin:", err);
          }
          
          animationFrameId = requestAnimationFrame(drawFrame);
        };
        
        // Démarrer la boucle de dessin
        console.log("🎬 Démarrage de la boucle de rendu...");
        drawFrame();
        
        console.log("🎉 Configuration complète ! Le système est prêt à enregistrer.");
        
      } catch (err) {
        console.error("❌ Erreur fatale lors de l'initialisation:", err);
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
                  ? { background: 'var(--primary-gradient)', opacity: 0.95 }
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
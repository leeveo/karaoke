'use client';

import { createContext, useEffect, useRef, useState } from 'react';
import { 
  bootstrapCameraKit, 
  createMediaStreamSource, 
  CameraKitSession, 
  LensRepository,
  Lens 
} from '@snap/camera-kit';

// API Token de Camera Kit de Snapchat
const CAMERA_KIT_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsImtpZCI6IkNhbnZhc1MyU0hNQUNQcm9kIiwidHlwIjoiSldUIn0.eyJhdWQiOiJjYW52YXMtY2FudmFzYXBpIiwiaXNzIjoiY2FudmFzLXMyc3Rva2VuIiwibmJmIjoxNzMyOTg4ODMwLCJzdWIiOiJmNGJjZDlkNy01OTQ5LTRiZmMtOTExYy1kMWI3ODhiOTFlNWZ-U1RBR0lOR35kNGE0ODkyOC02MTZjLTRmNmUtYTgyNi1iMDdjZjQ2YTA3ZGEifQ.DeSSMslw9UrihYb6gCSXG9MlQd-og4djQBLxrVzo2SU';

// IDs des lentilles Snapchat
const LENS_GROUP_ID = 'd8bd6a3a-8227-4872-86b6-30342dc68758';
const LENS_ID = '4b01678d-6f82-4580-b395-ff8bb4cfb37e';

// Autres IDs de lentilles disponibles pour les tests
const AVAILABLE_LENSES = [
  { 
    id: '4b01678d-6f82-4580-b395-ff8bb4cfb37e', 
    groupId: 'd8bd6a3a-8227-4872-86b6-30342dc68758',
    name: 'Filtre Disco'
  },
  { 
    id: '4a5ef1f5-1497-43c8-9ae9-68e396d95c73', 
    groupId: 'd5c43ff2-feed-4881-9097-244bc081288d',
    name: 'Filtre Néon'
  },
  { 
    id: '6c594a38-a84b-44e0-82cc-328819e01d1a', 
    groupId: '37b99dd8-5c28-444a-b1dd-fcbe661ee8b4',
    name: 'Filtre Cartoon'
  }
];

export interface CameraKitState {
  session: CameraKitSession | null;
  lenses: any[];
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  applyLens: (lens: any) => void;
  removeLens: () => void;
  currentLens: any | null;
  setWebcamElement: (element: HTMLVideoElement | null) => void;
}

export const CameraKitContext = createContext<CameraKitState>({
  session: null,
  lenses: [],
  isInitialized: false,
  isLoading: true,
  error: null,
  applyLens: () => {},
  removeLens: () => {},
  currentLens: null,
  setWebcamElement: () => {}
});

export const CameraKitProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // États
  const [session, setSession] = useState<CameraKitSession | null>(null);
  const [lenses, setLenses] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLens, setCurrentLens] = useState<any | null>(null);
  const [lensRepository, setLensRepository] = useState<LensRepository | null>(null);
  
  // Références
  const webcamRef = useRef<HTMLVideoElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isInitializedRef = useRef(false);
  const cameraKitRef = useRef<any>(null);

  // Fonction pour appliquer un filtre
  const applyLens = async (lensInfo: any) => {
    if (!session || !lensRepository) {
      console.error("CameraKit session or lensRepository not initialized");
      return;
    }

    try {
      console.log("Applying lens:", lensInfo?.name || "Unknown");
      
      // Vérifier si nous avons déjà chargé cette lentille
      if (currentLens && currentLens.id === lensInfo.id) {
        console.log("Lens already applied:", lensInfo.name);
        return;
      }
      
      // Charger la lentille avec les IDs
      const lens = await lensRepository.loadLens(
        lensInfo.groupId,
        lensInfo.id
      );
      
      if (!lens) {
        console.error(`Failed to load lens: ${lensInfo.name}`);
        return;
      }
      
      // Appliquer la lentille à la session
      await session.applyLens(lens);
      setCurrentLens(lensInfo);
      console.log("Lens applied successfully:", lensInfo.name);
    } catch (error) {
      console.error("Error applying lens:", error);
    }
  };
  
  // Fonction pour retirer le filtre
  const removeLens = async () => {
    if (!session) return;
    
    try {
      // Supprime le filtre actif
      await session.removeLens();
      setCurrentLens(null);
      console.log("Lens removed successfully");
    } catch (error) {
      console.error("Error removing lens:", error);
    }
  };

  // Définir l'élément webcam
  const setWebcamElement = async (element: HTMLVideoElement | null) => {
    if (!element) {
      console.log("No webcam element provided");
      return;
    }
    
    try {
      webcamRef.current = element;
      console.log("Webcam element set:", element);
      
      // Initialiser Camera Kit si la session existe
      if (session && element.srcObject) {
        const mediaStream = element.srcObject as MediaStream;
        console.log("Creating media stream source for CameraKit");
        
        // Créer une source de média à partir du flux de la webcam
        const source = createMediaStreamSource(mediaStream, {
          mirror: true,
        });
        
        // Associer la source à la session
        await session.setSource(source);
        console.log("Media stream source set for CameraKit session");
        
        // Démarrer la session
        await session.play();
        console.log("CameraKit session is now playing");
      } else {
        console.log("Session or webcam stream not available yet");
      }
    } catch (error) {
      console.error("Error setting webcam element:", error);
      setError("Erreur lors de la configuration de la webcam");
    }
  };

  // Initialiser Camera Kit
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    async function initCameraKit() {
      try {
        console.log("Initializing CameraKit...");
        setIsLoading(true);
        
        // Bootstrap Camera Kit avec le token API
        const cameraKit = await bootstrapCameraKit({ 
          apiToken: CAMERA_KIT_API_TOKEN
        });
        
        cameraKitRef.current = cameraKit;
        console.log("CameraKit bootstrapped successfully");
        
        // Créer un canvas pour le rendu
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        canvas.classList.add('camerakit-canvas');
        canvasRef.current = canvas;
        
        // Créer une session Camera Kit
        const cameraKitSession = await cameraKit.createSession({
          liveRenderTarget: canvas
        });
        
        console.log("CameraKit session created");
        setSession(cameraKitSession);
        
        // Stocker le repository de lentilles
        setLensRepository(cameraKit.lensRepository);
        
        // Créer la liste des lentilles disponibles
        setLenses(AVAILABLE_LENSES);
        
        // Marquer comme initialisé
        setIsInitialized(true);
        isInitializedRef.current = true;
        setIsLoading(false);
        
        console.log("CameraKit initialization complete");
      } catch (error) {
        console.error("Error initializing CameraKit:", error);
        setError("Erreur d'initialisation de Camera Kit");
        setIsLoading(false);
      }
    }
    
    initCameraKit();
    
    // Nettoyage
    return () => {
      if (session) {
        try {
          session.pause();
          console.log("CameraKit session paused during cleanup");
        } catch (e) {
          console.error("Error cleaning up CameraKit session:", e);
        }
      }
    };
  }, []);

  return (
    <CameraKitContext.Provider value={{
      session,
      lenses,
      isInitialized,
      isLoading,
      error,
      applyLens,
      removeLens,
      currentLens,
      setWebcamElement
    }}>
      {children}
    </CameraKitContext.Provider>
  );
};

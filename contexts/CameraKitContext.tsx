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

// Empty lens array - removing all filter options temporarily
const AVAILABLE_LENSES = [];

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

  // Simplified no-op function that doesn't attempt to load lenses
  const applyLens = async (lensInfo: any) => {
    console.log("Filter functionality temporarily disabled");
    return;
  };
  
  // Simplified no-op function
  const removeLens = async () => {
    console.log("Filter functionality temporarily disabled");
    return;
  };

  // Basic webcam setup without filter functionality
  const setWebcamElement = async (element: HTMLVideoElement | null) => {
    if (!element) {
      console.log("No webcam element provided");
      return;
    }
    
    try {
      webcamRef.current = element;
      console.log("Webcam element set:", element);
      
      // Set initialized to true to prevent loading attempts
      setIsInitialized(true);
      isInitializedRef.current = true;
      setIsLoading(false);
    } catch (error) {
      console.error("Error setting webcam element:", error);
      setError("Erreur lors de la configuration de la webcam");
    }
  };

  // Initialize with a simple state that marks everything as ready
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    console.log("Filter functionality temporarily disabled");
    setIsInitialized(true);
    isInitializedRef.current = true;
    setIsLoading(false);
    
    return () => {
      // No cleanup needed
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

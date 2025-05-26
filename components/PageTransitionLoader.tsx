'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, createContext, useContext } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

// Create a context to share loading state across the app
type LoaderContextType = {
  isLoading: boolean;
  setIsLoading: (value: boolean) => void;
};

const LoaderContext = createContext<LoaderContextType | null>(null);

// Export a hook to use the loader
export function useLoader() {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoaderProvider');
  }
  return context;
}

// Global instance tracking to prevent multiple loaders
let isProviderMounted = false;

export function LoaderProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Prevent duplicate providers
  useEffect(() => {
    if (isProviderMounted) {
      console.warn('Multiple LoaderProvider instances detected. This can cause duplicate loaders.');
    }
    
    isProviderMounted = true;
    
    return () => {
      isProviderMounted = false;
    };
  }, []);

  // Listen for route changes to show/hide loader
  useEffect(() => {
    // Show loader on navigation start
    setIsLoading(true);
    
    // Hide loader after a short delay to ensure content has loaded
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  return (
    <LoaderContext.Provider value={{ isLoading, setIsLoading }}>
      {children}
      <PageTransitionLoader />
    </LoaderContext.Provider>
  );
}

// Main loader component with improved centering
export default function PageTransitionLoader() {
  const { isLoading } = useLoader();

  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.3 } }}
          className="fixed inset-0 w-full h-full z-[9999] flex items-center justify-center"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Musical notes floating animation */}
            <motion.div 
              className="absolute"
              style={{
                top: 'calc(50% - 80px)',
                left: 'calc(50% - 40px)'
              }}
              animate={{ 
                y: [-10, -25, -10],
                x: [-5, 5, -5],
                rotate: [-5, 5, -5]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--secondary-color)' }}>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </motion.div>
            
            <motion.div 
              className="absolute"
              style={{
                top: 'calc(50% - 70px)',
                left: 'calc(50% + 30px)'
              }}
              animate={{ 
                y: [-5, -20, -5],
                x: [5, -5, 5],
                rotate: [5, -5, 5]
              }}
              transition={{ duration: 1.7, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--primary-color)' }}>
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </motion.div>
            
            {/* Main loader animation - using theme colors */}
            <div className="w-32 h-32 relative">
              {/* Pulsing circle with secondary color */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ 
                  scale: [0.8, 1.2, 0.8], 
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 rounded-full blur-md"
                style={{
                  background: 'var(--secondary-gradient)'
                }}
              />
              
              {/* Rotating gradient circle with both primary and secondary colors */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full" 
                style={{ 
                  background: 'conic-gradient(from 0deg, var(--primary-color), var(--secondary-color), var(--primary-color))',
                  opacity: 0.7 
                }}
              />
              
              {/* Spinning microphone icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  animate={{ 
                    scale: [0.7, 1, 0.7],
                    rotateY: [0, 180, 360],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="bg-white rounded-full p-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10" style={{ color: 'var(--primary-color)' }}>
                    <path d="M8 4a2.5 2.5 0 014.304-1.768A2.5 2.5 0 0116 4v10.5a6.5 6.5 0 01-13 0V8a4.5 4.5 0 019 0v8.5a2.5 2.5 0 01-5 0V8a1 1 0 012 0v8.5a.5.5 0 001 0V8a2.5 2.5 0 00-5 0v6.5a4.5 4.5 0 009 0V4a4.5 4.5 0 00-9 0v1a1 1 0 01-2 0V4z" />
                  </svg>
                </motion.div>
              </div>
            </div>
            
            {/* Text animation with primary color */}
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="absolute text-white text-center font-medium text-lg"
              style={{ 
                top: 'calc(50% + 70px)', 
                left: '50%', 
                transform: 'translateX(-50%)',
                color: 'var(--secondary-color)' 
              }}
            >
              Chargement en cours...
            </motion.p>
            
            {/* Loading dots with secondary color */}
            <div 
              className="absolute flex justify-center space-x-1"
              style={{ top: 'calc(50% + 100px)', left: '50%', transform: 'translateX(-50%)' }}
            >
              {[0, 1, 2].map((dot) => (
                <motion.div
                  key={dot}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: [-3, 0, -3] }}
                  transition={{
                    delay: dot * 0.2,
                    duration: 1,
                    repeat: Infinity,
                    repeatType: "loop",
                  }}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--secondary-color)' }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

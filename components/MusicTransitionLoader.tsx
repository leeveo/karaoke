'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MusicTransitionLoaderProps {
  isVisible: boolean;
  step?: string;
  progress?: number;
}

export default function MusicTransitionLoader({ isVisible, step, progress: externalProgress }: MusicTransitionLoaderProps) {
  const [internalProgress, setInternalProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Préparation de votre performance...');
  
  // Dynamic loading messages based on the step
  useEffect(() => {
    if (step) {
      setLoadingText(step);
    }
  }, [step]);

  // Increase the progress bar for visual effect
  useEffect(() => {
    if (!isVisible) {
      // Reset internal progress when loader becomes invisible
      setInternalProgress(0);
      return;
    }
    
    let interval: NodeJS.Timeout | null = null;
    
    // If external progress is provided, don't use the internal progress animation
    if (externalProgress === undefined) {
      // Simulate progress with irregular increments to feel more natural
      interval = setInterval(() => {
        setInternalProgress(prev => {
          // Progress gets slower near the end to give backend time to process
          if (prev < 30) return Math.min(30, prev + 2);
          if (prev < 60) return Math.min(60, prev + 1.5);
          if (prev < 85) return Math.min(85, prev + 0.8);
          if (prev < 95) return Math.min(95, prev + 0.2);
          return prev;
        });
      }, 100);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isVisible, externalProgress]);

  // Determine which progress to use (external or internal)
  const progressToShow = externalProgress !== undefined ? externalProgress : internalProgress;

  // Important: Only render the component when isVisible is true
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="absolute inset-0 bg-black/70"></div>
      
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30 
        }}
        className="relative z-10 p-8 rounded-xl border border-white/10 shadow-2xl max-w-md w-full mx-4 backdrop-blur-md"
        style={{ 
          backgroundColor: 'var(--primary-color)', // Utilisation de primary-color directement
          boxShadow: '0 20px 60px -10px rgba(var(--primary-color-rgb), 0.4), 0 10px 20px -5px rgba(var(--secondary-color-rgb), 0.3)',
          borderLeft: '4px solid var(--primary-color)',
          borderRight: '4px solid var(--secondary-color)'
        }}
      >
        {/* Music visual elements */}
        <div className="flex justify-center mb-6 relative">
          {/* Vinyl record animation */}
          <motion.div 
            className="w-28 h-28 rounded-full bg-gradient-to-br from-black to-gray-900 shadow-inner flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ 
              duration: 4,
              ease: "linear",
              repeat: Infinity
            }}
            style={{
              background: 'conic-gradient(from 0deg, #000, #333, #000, #111, #000)',
              boxShadow: '0 0 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            {/* Vinyl grooves */}
            <div className="w-3/4 h-3/4 rounded-full border-t border-white/5"></div>
            <div className="absolute w-2/3 h-2/3 rounded-full border-t border-white/5"></div>
            <div className="absolute w-1/2 h-1/2 rounded-full border-t border-white/5"></div>
            <div className="absolute w-1/3 h-1/3 rounded-full border-t border-white/5"></div>
            
            {/* Center label with theme gradient */}
            <div 
              className="absolute w-2/5 h-2/5 rounded-full flex items-center justify-center text-xs text-white font-bold"
              style={{ 
                background: 'var(--primary-gradient)',
                transform: 'rotate(0deg)',
                boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)'
              }}
            >
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ 
                  duration: 4,
                  ease: "linear",
                  repeat: Infinity
                }}
              >
                KARAOKE
              </motion.div>
            </div>
            
            {/* Center hole */}
            <div className="absolute w-[8px] h-[8px] rounded-full bg-gray-900 border border-gray-700"></div>
          </motion.div>
          
          {/* Equalizer bars in background */}
          <div className="absolute -z-10 inset-0 flex items-center justify-center space-x-1">
            {[...Array(12)].map((_, i) => (
              <motion.div 
                key={i} 
                className="w-1 rounded-full"
                style={{ 
                  backgroundColor: i % 2 === 0 
                    ? 'var(--primary-color)' 
                    : 'var(--secondary-color)',
                  opacity: 0.4,
                  height: '100%'
                }}
                animate={{
                  height: [
                    `${20 + Math.random() * 40}%`, 
                    `${60 + Math.random() * 40}%`, 
                    `${10 + Math.random() * 30}%`
                  ]
                }}
                transition={{
                  duration: 1.2 + Math.random(),
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.08
                }}
              />
            ))}
          </div>
        </div>
        
        {/* Audio waveform visualization */}
        <div className="flex items-end justify-center space-x-1 mb-8 h-12">
          {[...Array(24)].map((_, i) => (
            <motion.div 
              key={i} 
              className="w-1.5 rounded-full"
              style={{ 
                background: `linear-gradient(to top, var(--${i % 2 ? 'primary' : 'secondary'}-color), transparent)`,
                opacity: 0.8
              }}
              animate={{
                height: [
                  `${10 + Math.random() * 40}%`, 
                  `${60 + Math.random() * 40}%`, 
                  `${10 + Math.random() * 30}%`, 
                  `${50 + Math.random() * 50}%`
                ]
              }}
              transition={{
                duration: 1.2,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
                delay: i * 0.05
              }}
            />
          ))}
        </div>
        
        <motion.h3 
          className="text-white text-2xl font-bold text-center mb-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ 
            background: 'linear-gradient(to right, var(--primary-color), var(--secondary-color))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Mixage en cours...
        </motion.h3>
        
        <motion.p 
          className="text-gray-300 text-center mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {loadingText}
        </motion.p>
        
        {/* Progress bar with gradient */}
        <div className="w-full h-3 bg-gray-800/80 rounded-full overflow-hidden mb-3">
          <motion.div 
            className="h-full"
            style={{ 
              background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))',
              boxShadow: '0 0 10px var(--primary-color)'
            }}
            initial={{ width: "3%" }}
            animate={{ width: `${progressToShow}%` }}
            transition={{ ease: "easeInOut" }}
          />
        </div>
        
        <div className="flex justify-between text-xs text-gray-400 px-1">
          <span>Traitement...</span>
          <span>{Math.round(progressToShow)}%</span>
        </div>
        
        {/* Music notes floating animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{ 
                color: i % 2 === 0 ? 'var(--primary-color)' : 'var(--secondary-color)',
                opacity: 0.15,
                fontSize: `${1 + Math.random() * 1.5}rem`
              }}
              initial={{ 
                x: `${Math.random() * 100}%`, 
                y: "120%",
                rotate: Math.random() * 360
              }}
              animate={{ 
                y: "-20%",
                rotate: Math.random() > 0.5 ? 360 : -360
              }}
              transition={{
                duration: 3 + Math.random() * 7,
                repeat: Infinity,
                repeatType: "loop",
                ease: "linear",
                delay: Math.random() * 5
              }}
            >
              {['♪', '♫', '♩', '♬', '🎵', '🎶'][Math.floor(Math.random() * 6)]}
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

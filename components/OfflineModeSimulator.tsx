'use client';

import React, { useState, useEffect } from 'react';

/**
 * Offline Mode Simulator
 * Allows developers/testers to simulate offline mode without cutting network
 * Only shows in development or if localStorage flag is set
 */
export function OfflineModeSimulator() {
  const [isSimulating, setIsSimulating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if we should show the simulator
    const isDev = process.env.NODE_ENV === 'development';
    const hasFlag = localStorage.getItem('show_offline_simulator') === 'true';
    
    if (isDev || hasFlag) {
      setIsVisible(true);
    }

    // Load stored state
    const storedState = localStorage.getItem('offline_simulator_enabled') === 'true';
    setIsSimulating(storedState);
  }, []);

  const toggleSimulator = () => {
    const newState = !isSimulating;
    setIsSimulating(newState);
    localStorage.setItem('offline_simulator_enabled', String(newState));
    
    // Override navigator.onLine behavior if possible
    if (newState) {
      console.log('[OfflineSimulator] 🔴 Offline mode ENABLED (simulated)');
      // Store in sessionStorage for other components to read
      sessionStorage.setItem('offline_mode_simulated', 'true');
    } else {
      console.log('[OfflineSimulator] 🟢 Offline mode DISABLED');
      sessionStorage.removeItem('offline_mode_simulated');
    }
    
    // Dispatch custom event for other components to react to
    window.dispatchEvent(new CustomEvent('offline-simulator-changed', { detail: { isSimulating: newState } }));
  };

  // For development only, show a compact button in top-right corner
  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border border-gray-200">
      <span className="text-sm font-semibold text-gray-700">Test Mode:</span>
      <button
        onClick={toggleSimulator}
        className={`px-3 py-1 rounded-full text-sm font-bold transition-all ${
          isSimulating
            ? 'bg-red-500 text-white'
            : 'bg-green-500 text-white'
        }`}
      >
        {isSimulating ? '🔴 Offline' : '🟢 Online'}
      </button>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useCameraKit } from '../hooks/useCameraKit';

interface FiltersSelectorProps {
  className?: string;
}

interface Lens {
  id: string;
  name: string;
  // Add other properties as needed based on the lens structure
}

export default function FiltersSelector({ className = '' }: FiltersSelectorProps) {
  const { lenses, applyLens, removeLens, currentLens, isLoading } = useCameraKit();
  const [isOpen, setIsOpen] = useState(false);
  
  // Gérer la sélection d'un filtre
  const handleFilterSelect = (lens: Lens | null) => {
    if (lens === null) {
      console.log("Removing filter");
      removeLens();
    } else {
      console.log("Selecting filter:", lens.name);
      applyLens(lens);
    }
    setIsOpen(false);
  };
  
  return (
    <div className={`relative z-30 ${className}`}>
      {/* Bouton pour ouvrir/fermer le sélecteur de filtres */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn-secondary flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg transition-all text-white"
        style={{ 
          background: 'var(--primary-gradient)',
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer'
        }}
        disabled={isLoading}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm8 8a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
        {isLoading ? 'Chargement des filtres...' : 'Filtres Snapchat'}
        {currentLens && (
          <div className="ml-2 w-3 h-3 rounded-full bg-green-500"></div>
        )}
      </button>
      
      {/* Panneau des filtres */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 bg-black/80 backdrop-blur-md rounded-xl p-4 shadow-xl border border-white/10 w-72">
          <h3 className="text-white font-bold mb-3 border-b border-white/10 pb-2">
            Sélectionnez un filtre Snapchat
          </h3>
          
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {/* Option sans filtre */}
            <div 
              className={`flex items-center p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10 ${currentLens === null ? 'bg-secondary/20 border border-secondary/50' : ''}`}
              onClick={() => handleFilterSelect(null)}
            >
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="text-white">Sans filtre</div>
            </div>
            
            {/* Liste des filtres disponibles */}
            {lenses.map((lens) => (
              <div 
                key={lens.id}
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-all hover:bg-white/10 ${currentLens?.id === lens.id ? 'bg-secondary/20 border border-secondary/50' : ''}`}
                onClick={() => handleFilterSelect(lens)}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mr-3 flex items-center justify-center text-xl">
                  🎭
                </div>
                <div className="text-white">{lens.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

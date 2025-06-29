'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getSongsByCategory, Song } from '../../../services/s3Service';
import { motion } from 'framer-motion';

// Fonction de mappage entre les catégories de l'URL et les dossiers S3
const mapCategoryToS3Folder = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  const categoryMapping: Record<string, string> = {
    'français': 'francais',
    'hip-hop': 'hip-hop',
  };
  return categoryMapping[lowerCategory] || lowerCategory;
};

export default function CategoryPage() {
  // Extraction sécurisée du paramètre category
  const params = useParams() as Record<string, string | string[]>;
  let category = '';
  if (params && typeof params === 'object') {
    const rawCategory = params.category;
    category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory || '';
  }
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false); // Remplacer useLoader par un état local

  useEffect(() => {
    async function fetchSongs() {
      try {
        // Use local state instead of global loader
        setIsLoading(true);
        if (typeof category === 'string') {
          const s3FolderCategory = mapCategoryToS3Folder(category);
          const songList = await getSongsByCategory(s3FolderCategory);
          setSongs(songList);
        }
        setIsLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des chansons:', err);
        setError('Impossible de charger les chansons');
        setIsLoading(false);
      }
    }

    fetchSongs();
  }, [category]);

  // Error state with modern styling
  if (error) return (
    <div className="app-background min-h-screen flex flex-col items-center justify-center p-8">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div className="relative z-10 bg-red-900/40 backdrop-blur-lg p-6 rounded-xl border border-red-500/30 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Erreur</h2>
        <p className="text-white">{error}</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-2 bg-white text-red-600 rounded-lg font-medium"
        >
          Retour Accueil
        </button>
      </div>
    </div>
  );

  // Either remove the unused 'isLoading' state or use it in the UI
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="app-background flex flex-col items-center justify-center min-h-screen py-12 px-4"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-purple-950/80 backdrop-blur-sm"></div>
      
      <div className="relative z-10 w-full max-w-3xl">
        <motion.h1 
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          style={{ color: 'var(--primary-color)' }}
          className="text-3xl md:text-4xl font-bold mb-8 text-center"
        >
          SÉLECTIONNE TA CHANSON 
        </motion.h1>
        
        {/* Back button with new styling */}
        <div className="mb-6 text-center">
          <button
            onClick={() => router.push('/')}
            className="py-3 px-6 rounded-lg transition-all flex items-center gap-2 mx-auto text-white hover:translate-y-[-2px] hover:shadow-xl"
            style={{ 
              backgroundColor: 'rgba(var(--primary-color-rgb, 3, 52, 185), 0.75)',
              border: 'none',
              borderLeft: '4px solid var(--primary-color)',
              borderRight: '4px solid var(--secondary-color)',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">Retour aux catégories</span>
          </button>
        </div>
        
        {/* Conteneur de liste avec défilement amélioré */}
        <div 
          className="max-h-[60vh] overflow-y-auto rounded-xl bg-black/30 p-4 shadow-inner border border-white/10"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--primary-color) transparent'
          }}
        >
          {/* Indicateur visuel de défilement - aide l'utilisateur à comprendre qu'on peut défiler */}
          <div className="w-full flex justify-center mb-2 text-white/50 text-xs">
            <span>Faites défiler pour voir toutes les chansons</span>
            <svg className="w-4 h-4 ml-1 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </div>
          
          <ul className="flex flex-col w-full space-y-3">
            {songs.length === 0 ? (
              <motion.li 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center text-white border border-white/10"
              >
                Aucune chanson trouvée dans cette catégorie
              </motion.li>
            ) : (
              songs.map((song, index) => (
                <motion.li
                  key={song.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="backdrop-blur-md rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all transform hover:translate-y-[-2px] shadow-lg"
                  style={{ 
                    backgroundColor: 'rgba(var(--primary-color-rgb, 3, 52, 185), 0.75)',
                    borderLeft: '3px solid var(--primary-color)',
                    borderRight: '3px solid var(--secondary-color)'
                  }}
                >
                  <div className="p-4 flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-white">{song.title}</h3>
                      <p className="text-gray-300 mt-1">Interprète: {song.artist}</p>
                    </div>
                    <button
                      onClick={() => router.push(`/karaoke/${encodeURIComponent(song.key)}`)}
                      className="btn-secondary px-5 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium text-white"
                      style={{ 
                        background: 'var(--secondary-gradient)',
                        color: 'white' 
                      }}
                    >
                      <span>Choisir</span>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </motion.li>
              ))
            )}
          </ul>
        </div>

        {/* Either use isLoading in the UI or remove it */}
        {isLoading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
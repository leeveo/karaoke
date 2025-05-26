'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getCategories } from '../services/s3Service';
import { motion } from 'framer-motion';

// Modern SVG icons for categories
const categoryIcons: Record<string, React.ReactNode> = {
  all: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9.5V16l6-3.5-6-3.5z" />
    </svg>
  ),
  pop: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  ),
  rock: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M19 9l-7 4-7-4V5.5c0-.83.67-1.5 1.5-1.5S8 4.67 8 5.5V9l4-2.18L15 9V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V9zm-7 6l7-4v5.5c0 .83-.67 1.5-1.5 1.5S16 17.33 16 16.5V13l-4 2.18L8 13v3.5c0 .83-.67 1.5-1.5 1.5S5 17.33 5 16.5V11l7 4z" />
    </svg>
  ),
  'hip-hop': (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z" />
    </svg>
  ),
  rap: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 15c1.66 0 2.99-1.34 2.99-3L15 6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 15 6.7 12H5c0 3.42 2.72 6.23 6 6.72V22h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
    </svg>
  ),
  français: (
    // Completely revised French flag implementation
    <svg key="french-flag-v2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-12 h-12">
      <rect width="900" height="600" fill="#ED2939"/>
      <rect width="600" height="600" fill="#FFFFFF"/>
      <rect width="300" height="600" fill="#002395"/>
    </svg>
  ),
  anglais: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480" className="w-12 h-12">
      <path fill="#012169" d="M0 0h640v480H0z"/>
      <path fill="#FFF" d="M75 0l244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0h75z"/>
      <path fill="#C8102E" d="M424 281l216 159v40L369 281h55zm-184 20l6 35L54 480H0l240-179zM640 0v3L391 191l2-44L590 0h50zM0 0l239 176h-60L0 42V0z"/>
      <path fill="#FFF" d="M241 0v480h160V0H241zM0 160v160h640V160H0z"/>
      <path fill="#C8102E" d="M0 193v96h640v-96H0zM273 0v480h96V0h-96z"/>
    </svg>
  ),
  latino: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M11.59 7.41L15.17 11H1v2h14.17l-3.59 3.59L13 18l6-6-6-6-1.41 1.41zM20 6v12h2V6h-2z" />
    </svg>
  ),
  jazz: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6zm-2 16c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    </svg>
  ),
  classique: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 11.5h.25V19h-4.5v-4.5H10c.55 0 1-.45 1-1V5h2v8.5c0 .55.45 1 1 1zM5 5h2v8H5V5zm14 14h-2v-8h2v8z" />
    </svg>
  ),
  metal: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M7 19c-1.1 0-2 .9-2 2h14c0-1.1-.9-2-2-2h-4v-2h3c1.1 0 2-.9 2-2h-8c-1.66 0-3-1.34-3-3 0-1.09.59-2.04 1.46-2.56C8.17 9.03 8 8.54 8 8c0-.21.04-.42.09-.62C6.28 8.13 5 9.92 5 12c0 2.76 2.24 5 5 5v2H7z" />
      <path d="M10.56 5.51C11.91 5.54 13 6.64 13 8c0 .75-.33 1.41-.85 1.87l.59 1.62h5.23l.77-2.09c-.18-.07-.35-.16-.5-.27C17.01 8.02 17 6.44 18.13 5.32c1.14-1.12 2.96-1.09 4.07.06 1.11 1.15 1.09 2.97-.05 4.1-.48.47-1.1.77-1.75.84L19 14h-2l-2.5 2-1-1-1-1-1.1-3c-1.56 0-2.86-1.25-2.9-2.81-.02-.5.11-.97.35-1.38-.22-.17-.4-.38-.56-.61-.28-.51-.33-1.12-.13-1.69h.84L10.56 5.51z" />
    </svg>
  ),
  reggae: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
    </svg>
  ),
  electronic: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M7 18h2V6H7v12zm4 4h2V2h-2v20zm-8-8h2v-4H3v4zm12 4h2V6h-2v12zm4-8v4h2v-4h-2z" />
    </svg>
  ),
  soul: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ),
  folk: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z" />
    </svg>
  ),
  country: (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S10 13.88 10 12.5s1.12-2.5 2.5-2.5c.57 0 1.08.19 1.5.51V5h4v2zM4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6z" />
    </svg>
  ),
};

// Get icon for a category (with fallback)
const getCategoryIcon = (category: string): React.ReactNode => {
  return categoryIcons[category.toLowerCase()] || (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-12 h-12">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
};

interface CategorySelectorProps {
  eventId?: string; // ID de l'événement optionnel
}

export default function CategorySelector({ eventId }: CategorySelectorProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    async function fetchCategories() {
      try {
        setLoading(true);
        setError(null);
        console.log("Tentative de récupération des catégories...");
        
        const cats = await getCategories();
        console.log("Catégories récupérées:", cats);
        
        if (cats && cats.length > 0) {
          // Ensure no duplicates by filtering out 'all' if it already exists
          const filteredCats = cats.filter(cat => cat.toLowerCase() !== 'all');
          setCategories(['all', ...filteredCats]); // Add 'all' as the first category
        } else {
          // Ajouter des catégories par défaut si aucune n'est trouvée depuis S3
          console.log("Utilisation de catégories par défaut");
          setCategories(['all', 'pop', 'rock', 'rap', 'français', 'anglais', 'latino']);
          setError("Impossible de charger les catégories depuis le serveur, utilisation de catégories par défaut");
        }
        setLoading(false);
      } catch (err) {
        console.error('Erreur lors du chargement des catégories:', err);
        
        // Réessayer jusqu'à 3 fois en cas d'échec
        if (retryCount < 3) {
          console.log(`Nouvel essai (${retryCount + 1}/3)...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => fetchCategories(), 1000); // Réessayer après 1 seconde
          return;
        }
        
        // Utiliser des catégories par défaut après 3 échecs
        console.log("Utilisation de catégories par défaut après échecs");
        setCategories(['all', 'pop', 'rock', 'rap', 'français', 'anglais', 'latino']);
        setError("Impossible de charger les catégories, utilisation de catégories par défaut");
        setLoading(false);
      }
    }

    fetchCategories();
  }, [retryCount]);

  // L'URI qui sera utilisée pour les catégories doit tenir compte de l'eventId
  const getCategoryUri = (category: string) => {
    if (eventId) {
      return `/event/${eventId}/category/${category}`;
    }
    return `/category/${category}`;
  };

  const handleSelect = (cat: string) => {
    setSelectedCategory(cat);
    
    // Animation delay before navigation
    setTimeout(() => {
      router.push(getCategoryUri(cat));
    }, 400);
  };

  // Loading state with beautiful animation
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-t-4 border-b-4 border-purple-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 border-r-4 border-l-4 border-pink-400 rounded-full animate-spin animate-pulse"></div>
          <div className="absolute inset-4 border-t-4 border-b-4 border-blue-400 rounded-full animate-spin animate-delay-150"></div>
        </div>
        <p className="mt-6 text-white text-lg font-light animate-pulse">Découverte des catégories...</p>
      </div>
    );
  }

  // Error state with retry button
  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        className="bg-red-900/40 backdrop-blur-md rounded-xl p-6 max-w-md mx-auto border border-red-500/30"
      >
        <div className="text-center">
          <div className="bg-red-500/20 inline-block p-3 rounded-full mb-4">
            <svg className="w-10 h-10 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Problème de chargement</h3>
          <p className="text-red-100 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-red-50 transition"
          >
            Réessayer
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-6xl mx-auto flex flex-col items-center justify-center"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 w-full">
        {categories.map((cat, index) => (
          <motion.div
            key={`${cat}-${index}`} // Add index to ensure uniqueness
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05, y: -5 }}
            className="relative"
          >
            <button
              onClick={() => handleSelect(cat)}
              className={`
                w-full h-40 rounded-2xl overflow-hidden relative group 
                ${selectedCategory === cat ? 'ring-4 ring-white' : ''}
              `}
              disabled={selectedCategory !== null}
            >
              {/* Use CSS variables for gradients - important for theme switching */}
              <div 
                className="absolute inset-0 opacity-80 group-hover:opacity-100 transition-opacity duration-300"
                style={{
                  background: index % 2 === 0 
                    ? 'var(--primary-gradient)'
                    : 'var(--secondary-gradient)'
                }}
              ></div>
              
              {/* Animated pattern overlay */}
              <div className="absolute inset-0 bg-[url('/pattern.png')] bg-repeat opacity-10 group-hover:opacity-20 transition-opacity"></div>
              
              {/* Lighting effect */}
              <div className="absolute -inset-x-full -inset-y-1/2 w-[200%] h-[200%] bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 rotate-45 transform -translate-x-full group-hover:translate-x-0 transition-all duration-700"></div>
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white z-10">
                <div className="mb-3 text-white opacity-90 group-hover:opacity-100 transform group-hover:scale-110 transition-all duration-300">
                  {getCategoryIcon(cat)}
                </div>
                <h3 className="text-xl font-bold capitalize tracking-wide text-center">
                  {cat === 'all' ? 'Toutes les chansons' : cat}
                </h3>
                
                {/* Hover indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white scale-0 group-hover:scale-100 transition-transform duration-300"></div>
              </div>
              
              {/* Selection indicator */}
              {selectedCategory === cat && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center"
                >
                  <div className="w-16 h-16 border-t-4 border-b-4 border-white rounded-full animate-spin"></div>
                </motion.div>
              )}
            </button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
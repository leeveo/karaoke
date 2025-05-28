'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { getSongsByCategory, Song } from '@/services/s3Service';
import { motion } from 'framer-motion';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import MusicTransitionLoader from '@/components/MusicTransitionLoader'; // Importer le loader de transition

// Fonction de mappage entre les catégories de l'URL et les dossiers S3
const mapCategoryToS3Folder = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  const categoryMapping: Record<string, string> = {
    'français': 'francais',
    'hip-hop': 'hip-hop',
  };
  return categoryMapping[lowerCategory] || lowerCategory;
};

export default function EventCategoryPage() {
  const { id, category } = useParams();
  const router = useRouter();
  const [songs, setSongs] = useState<Song[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bgLoaded, setBgLoaded] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false); // Nouvel état pour la navigation

  // Charger l'événement et ses personnalisations
  useEffect(() => {
    async function loadEvent() {
      try {
        if (typeof id === 'string') {
          const eventData = await fetchEventById(id);
          setEvent(eventData);
          
          // Appliquer les couleurs personnalisées
          if (eventData.customization) {
            // S'assurer que les couleurs primaires et secondaires sont bien récupérées
            const primaryColor = eventData.customization.primary_color || '#0334b9';
            const secondaryColor = eventData.customization.secondary_color || '#2fb9db';
            
            // Appliquer les couleurs avec logging pour débogage
            console.log("Application de la couleur primaire:", primaryColor);
            document.documentElement.style.setProperty('--primary-color', primaryColor);
            document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
            document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
            
            // Ajouter une version avec opacité pour le fond des éléments
            document.documentElement.style.setProperty('--primary-color-75', hexToRgba(primaryColor, 0.75));
            
            console.log("Application de la couleur secondaire:", secondaryColor);
            document.documentElement.style.setProperty('--secondary-color', secondaryColor);
            document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
            document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));
            
            // Mise à jour des gradients avec les couleurs personnalisées
            document.documentElement.style.setProperty(
              '--primary-gradient', 
              `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorLightness(primaryColor, 20)} 100%)`
            );
            document.documentElement.style.setProperty(
              '--secondary-gradient', 
              `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColorLightness(secondaryColor, 20)} 100%)`
            );

            // Fix background image loading - sans bg.png
            if (eventData.customization.background_image) {
              console.log("Found background_image:", eventData.customization.background_image);
              
              try {
                const publicUrlResult = supabase.storage
                  .from('karaokestorage')
                  .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
            
                if (publicUrlResult.data?.publicUrl) {
                  const bgUrl = publicUrlResult.data.publicUrl;
                  console.log("Background image URL generated:", bgUrl);
                  
                  // Store the full URL in the event object for rendering
                  eventData.customization.backgroundImageUrl = bgUrl;
                  
                  // Preload the image
                  const img = new Image();
                  img.src = bgUrl;
                  img.onload = () => {
                    console.log("Background image loaded successfully");
                    document.documentElement.style.setProperty('--bg-image', `url('${bgUrl}')`);
                    document.documentElement.classList.add('bg-loaded');
                    setBgLoaded(true);
                  };
                  img.onerror = (e) => {
                    console.error("Failed to load background image:", e);
                    // Utiliser un dégradé au lieu d'une image par défaut
                    document.documentElement.style.setProperty(
                      '--bg-image', 
                      'linear-gradient(135deg, #080424 0%, #160e40 100%)'
                    );
                    setBgLoaded(true);
                  };
                } else {
                  console.error("Public URL not available for image:", eventData.customization.background_image);
                  // Utiliser un dégradé au lieu d'une image par défaut
                  document.documentElement.style.setProperty(
                    '--bg-image', 
                    'linear-gradient(135deg, #080424 0%, #160e40 100%)'
                  );
                  setBgLoaded(true);
                }
              } catch (error) {
                console.error("Error retrieving image URL:", error);
                // Utiliser un dégradé au lieu d'une image par défaut
                document.documentElement.style.setProperty(
                  '--bg-image', 
                  'linear-gradient(135deg, #080424 0%, #160e40 100%)'
                );
                setBgLoaded(true);
              }
            } else {
              console.log("No background_image found, using default gradient");
              // Utiliser un dégradé au lieu d'une image par défaut
              document.documentElement.style.setProperty(
                '--bg-image', 
                'linear-gradient(135deg, #080424 0%, #160e40 100%)'
              );
              setBgLoaded(true);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement de l\'événement:', err);
        setError('Événement introuvable');
        setBgLoaded(true);
      }
    }
    
    loadEvent();
  }, [id]);

  // Charger les chansons de la catégorie
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

  // Fonction utilitaire pour ajuster la luminosité d'une couleur hex
  function adjustColorLightness(color: string, percent: number): string {
    try {
      // Convert hex to RGB
      let r = parseInt(color.substring(1,3), 16);
      let g = parseInt(color.substring(3,5), 16);
      let b = parseInt(color.substring(5,7), 16);

      // Adjust lightness
      r = Math.min(255, Math.max(0, r + (r * percent / 100)));
      g = Math.min(255, Math.max(0, g + (g * percent / 100)));
      b = Math.min(255, Math.max(0, b + (b * percent / 100)));

      // Convert back to hex
      return `#${Math.round(r).toString(16).padStart(2, '0')}${Math.round(g).toString(16).padStart(2, '0')}${Math.round(b).toString(16).padStart(2, '0')}`;
    } catch {
      return color; // Return original color if any error occurs
    }
  }

  // Nouvelle fonction pour convertir une couleur hexadécimale en rgba
  function hexToRgba(hex: string, alpha: number): string {
    try {
      // Convertir hex en RGB
      const r = parseInt(hex.substring(1,3), 16);
      const g = parseInt(hex.substring(3,5), 16);
      const b = parseInt(hex.substring(5,7), 16);
      
      // Retourner la valeur rgba
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } catch {
      return `rgba(3, 52, 185, ${alpha})`; // Valeur par défaut si erreur
    }
  }

  // Fonction pour naviguer avec transition
  const handleSongSelect = (songKey: string) => {
    // Activer la transition
    setIsNavigating(true);
    
    // Temporiser la navigation pour montrer le loader
    setTimeout(() => {
      router.push(`/event/${id}/karaoke/${encodeURIComponent(songKey)}`);
    }, 800); // Délai pour voir l'animation
  };

  // Error state with modern styling
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{
        backgroundImage: event?.customization?.backgroundImageUrl 
          ? `url('${event.customization.backgroundImageUrl}')` 
          : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm"></div>
      <div className="relative z-10 bg-red-900/40 backdrop-blur-lg p-6 rounded-xl border border-red-500/30 max-w-md">
        <h2 className="text-2xl font-bold text-white mb-4">Erreur</h2>
        <p className="text-white">{error}</p>
        <button 
          onClick={() => router.push(`/event/${id}`)}
          className="mt-6 px-6 py-2 bg-white text-red-600 rounded-lg font-medium"
        >
          Retour événement
        </button>
      </div>
    </div>
  );

  // Mettre à jour le style de fond
  return (
    <>
      {/* Afficher le loader de transition quand on navigue vers l'enregistrement */}
      <MusicTransitionLoader 
        isVisible={isNavigating} 
        step="Chargement de la chanson..." 
        progress={80}
      />
      
      {/* Add loading overlay when fetching songs */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-black/50 p-6 rounded-xl border border-white/10 flex flex-col items-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
            <p className="text-white text-lg">Chargement des chansons...</p>
          </div>
        </div>
      )}
      
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center h-screen overflow-hidden"
        style={{
          backgroundColor: '#080424', // Fond de base
          backgroundImage: bgLoaded && event?.customization?.backgroundImageUrl 
            ? `url('${event.customization.backgroundImageUrl}')` 
            : 'linear-gradient(135deg, #080424 0%, #160e40 100%)',
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 to-purple-950/80 backdrop-blur-sm"></div>
        
        <div className="relative z-10 w-full max-w-3xl h-full flex flex-col py-6 px-4">
          {/* Partie du haut (titre + bouton retour) - reste fixe */}
          <div className="flex-shrink-0">
            <motion.h1 
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              style={{ color: 'var(--primary-color)' }}
              className="text-3xl md:text-4xl font-bold mb-8 text-center"
            >
              {event?.name && (
                <div className="text-xl opacity-70 mb-1">
                  {event.name}
                </div>
              )}
              SÉLECTIONNE TA CHANSON 
            </motion.h1>
            
            {/* Back button */}
            <div className="mb-6 text-center">
              <button
                onClick={() => router.push(`/event/${id}`)}
                className="py-3 px-6 rounded-lg transition-all flex items-center gap-2 mx-auto text-white hover:translate-y-[-2px] hover:shadow-xl"
                style={{ 
                  backgroundColor: 'var(--primary-color-75)',
                  border: 'none',
                  borderLeft: '4px solid var(--primary-color)',
                  borderRight: '4px solid var(--secondary-color)', // Fixed: removed single quotes inside var()
                  boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Retour aux catégories</span>
              </button>
            </div>
          </div>
          
          {/* Zone de défilement des chansons - prend tout l'espace restant */}
          <div className="relative flex-grow bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 overflow-hidden">
            <div 
              className="absolute inset-0 overflow-y-auto p-4 pb-8"
              style={{
                // Rétablir la scrollbar native tout en la rendant visible
                scrollbarWidth: 'auto',
                scrollbarColor: 'var(--secondary-color) rgba(0, 0, 0, 0.2)',
                WebkitOverflowScrolling: 'touch',
                paddingRight: '45px', // Padding augmenté pour accommoder une barre de défilement plus large
                backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fond noir avec opacité
              }}
            >
              {/* Styles de scrollbar plus larges pour les écrans tactiles */}
              <style jsx global>{`
                .overflow-y-auto::-webkit-scrollbar {
                  width: 40px !important; /* Scrollbar beaucoup plus large */
                  background-color: rgba(0, 0, 0, 0.6); /* Fond noir plus foncé pour la scrollbar */
                }
                .overflow-y-auto::-webkit-scrollbar-track {
                  background: rgba(0, 0, 0, 0.5);
                  border-radius: 20px;
                  margin: 2px;
                  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.5);
                }
                .overflow-y-auto::-webkit-scrollbar-thumb {
                  background: var(--secondary-color);
                  border-radius: 20px;
                  border: 4px solid rgba(0, 0, 0, 0.4);
                  min-height: 120px; /* Hauteur minimale augmentée */
                  box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
                }
                .overflow-y-auto::-webkit-scrollbar-thumb:hover {
                  background: var(--secondary-light);
                }
              `}</style>
              
              <ul className="flex flex-col w-full space-y-3">
                {songs.length === 0 ? (
                  <motion.li 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center text-white border border-white/10 shadow-xl"
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
                      className="backdrop-blur-md rounded-xl overflow-hidden border-white/10 hover:border-white/20 transition-all transform hover:translate-y-[-2px] shadow-lg"
                      style={{ 
                        backgroundColor: 'var(--primary-color-75)',
                        border: 'none',
                        borderLeft: '4px solid var(--primary-color)',
                        borderRight: '4px solid var(--secondary-color)', // Fixed: removed single quotes inside var()
                        boxShadow: '0 8px 20px rgba(0, 0, 0, 0.25)'
                      }}
                    >
                      <div className="p-4 flex justify-between items-center">
                        <div>
                          <h3 className="text-xl font-bold text-white uppercase">{song.title}</h3>
                          <p className="text-gray-200 mt-1">{song.artist}</p>
                        </div>
                        <button
                          onClick={() => handleSongSelect(song.key)} // Utiliser la nouvelle fonction avec animation
                          className="relative btn-secondary px-6 py-3 rounded-xl shadow-lg hover:shadow-2xl transition-all flex items-center gap-3 font-bold uppercase group"
                          style={{ 
                            background: 'var(--secondary-gradient)',
                            color: 'white',
                            transform: 'translateZ(0)',
                            borderRadius: '1rem',
                            border: 'none',
                            boxShadow: '0 8px 20px rgba(0, 0, 0, 0.3), inset 0 2px 10px rgba(255, 255, 255, 0.3)',
                            overflow: 'hidden'
                          }}
                        >
                          {/* Effet lumineux sur le bouton */}
                          <div 
                            className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-300"
                            style={{
                              background: `radial-gradient(circle at center, var(--primary-light), transparent 70%)`,
                              mixBlendMode: 'overlay'
                            }}
                          ></div>
                          
                          {/* Bordures animées */}
                          <div className="absolute inset-0 rounded-xl" style={{ 
                            border: '2px solid transparent',
                            borderLeftColor: 'var(--primary-color)',
                            borderRightColor: 'var(--secondary-color)',
                            boxSizing: 'border-box'
                          }}></div>
                          
                          <span className="relative z-10 text-white font-bold">Je choisis</span>
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className="h-5 w-5 relative z-10 transition-transform group-hover:translate-x-1" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </motion.li>
                  ))
                )}
              </ul>
            </div>
            
            {/* Ajout d'un élément décoratif pour le fond de la scrollbar */}
            <div className="absolute right-0 top-0 bottom-0 w-[60px] bg-black/70 backdrop-blur-sm pointer-events-none">
              {/* Élément purement visuel */}
            </div>
            
            {songs.length > 5 && (
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/40 to-transparent pointer-events-none rounded-b-xl"></div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

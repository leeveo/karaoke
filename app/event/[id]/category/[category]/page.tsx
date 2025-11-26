'use client';

import { useParams, useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { Song } from '@/services/s3Service';
import { motion } from 'framer-motion';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';
import MusicTransitionLoader from '@/components/MusicTransitionLoader';
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './swiper-custom.css';

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
          const response = await fetch(`/api/songs?action=songs&category=${encodeURIComponent(s3FolderCategory)}`);
          
          if (!response.ok) {
            throw new Error('Failed to fetch songs');
          }
          
          const songList = await response.json();
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
              backgroundColor: 'var(--primary-color)',
              boxShadow: '0 20px 60px -10px rgba(var(--primary-color-rgb), 0.4), 0 10px 20px -5px rgba(var(--secondary-color-rgb), 0.3)',
              borderLeft: '4px solid var(--primary-color)',
              borderRight: '4px solid var(--secondary-color)'
            }}
          >
            {/* Vinyl record animation */}
            <div className="flex justify-center mb-6 relative">
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
              Chargement des chansons...
            </motion.h3>
            
            <motion.p 
              className="text-gray-300 text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Préparation de la bibliothèque musicale
            </motion.p>
            
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
        
        <div className="relative z-10 w-full h-full flex flex-col py-6 px-4">
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
          
          {/* Zone du slider Swiper - prend tout l'espace restant */}
          <div className="relative flex-grow flex items-center justify-center w-full">
            {songs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-center text-white border border-white/10 shadow-xl"
              >
                Aucune chanson trouvée dans cette catégorie
              </motion.div>
            ) : (
              <Swiper
                effect={'coverflow'}
                grabCursor={true}
                centeredSlides={true}
                slidesPerView={3}
                spaceBetween={30}
                loop={true}
                autoplay={{
                  delay: 4000,
                  disableOnInteraction: false,
                }}
                coverflowEffect={{
                  rotate: 15,
                  stretch: 0,
                  depth: 200,
                  modifier: 1.5,
                  slideShadows: false,
                }}
                navigation={true}
                pagination={false}
                modules={[EffectCoverflow, Autoplay, Navigation, Pagination]}
                className="w-full h-full"
                breakpoints={{
                  320: { slidesPerView: 1, spaceBetween: 20 },
                  768: { slidesPerView: 2, spaceBetween: 25 },
                  1024: { slidesPerView: 3, spaceBetween: 30 },
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  paddingTop: '50px',
                  paddingBottom: '80px',
                }}
              >
                {songs.map((song, index) => (
                  <SwiperSlide key={song.key}>
                    <motion.div
                      whileHover={{ scale: 1.02, y: -10 }}
                      transition={{ duration: 0.3 }}
                      className="cursor-pointer h-full w-full flex items-center justify-center"
                      onClick={() => handleSongSelect(song.key)}
                    >
                      {/* Glassmorphism Card */}
                      <div className="relative w-full rounded-3xl overflow-hidden group shadow-2xl border border-white" style={{ height: '400px' }}>
                        {/* Background Image with Blur */}
                        <div className="absolute inset-0">
                          {song.imageUrl ? (
                            <img
                              src={song.imageUrl}
                              alt={song.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div 
                              className="w-full h-full"
                              style={{
                                background: `linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%)`
                              }}
                            />
                          )}
                          {/* Gradient Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        </div>

                        {/* Glassmorphism Layer */}
                        <div className="absolute inset-0 backdrop-blur-[2px] bg-white/5 border border-white/20 rounded-3xl">
                          {/* Shine Effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-50" />
                          
                          {/* Inner Glow */}
                          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_0_60px_rgba(255,255,255,0.1)]" />
                        </div>

                        {/* Content */}
                        <div className="relative h-full flex flex-col justify-end p-6 z-10">
                          {/* Play Button - Centered */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="relative">
                              {/* Outer Glow */}
                              <div 
                                className="absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse"
                                style={{
                                  background: `linear-gradient(to right, var(--secondary-color), var(--primary-color))`
                                }}
                              />
                              
                              {/* Glassmorphism Button */}
                              <div className="relative w-24 h-24 rounded-full backdrop-blur-md bg-white/10 border-2 border-white/30 flex items-center justify-center shadow-2xl hover:scale-110 transition-transform duration-300">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-white/20 to-white/5 flex items-center justify-center">
                                  <svg className="w-10 h-10 text-white ml-1 drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Song Info with Glassmorphism */}
                          <div 
                            className="rounded-2xl p-5 border border-white/50 shadow-2xl transform group-hover:translate-y-[-10px] transition-transform duration-300"
                            style={{
                              backdropFilter: 'blur(20px)',
                              WebkitBackdropFilter: 'blur(20px)',
                              background: 'rgba(255, 255, 255, 0.15)'
                            }}
                          >
                            {/* Title */}
                            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg line-clamp-2">
                              {song.title}
                            </h3>
                            
                            {/* Artist */}
                            <p className="text-lg text-white drop-shadow-md line-clamp-1 mb-3">
                              {song.artist}
                            </p>

                            {/* Decorative Line */}
                            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/60 to-transparent mb-3" />

                            {/* Tags/Badges */}
                            <div className="flex gap-2 flex-wrap">
                              <span 
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/50 text-white shadow-lg"
                                style={{
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  background: 'rgba(255, 255, 255, 0.2)'
                                }}
                              >
                                🎤 Karaoke
                              </span>
                              <span 
                                className="px-3 py-1 rounded-full text-xs font-medium border border-white/50 text-white shadow-lg"
                                style={{
                                  backdropFilter: 'blur(10px)',
                                  WebkitBackdropFilter: 'blur(10px)',
                                  background: `linear-gradient(to right, var(--secondary-color, rgba(236, 72, 153, 0.4)), var(--primary-color, rgba(168, 85, 247, 0.4)))`
                                }}
                              >
                                ✨ Populaire
                              </span>
                            </div>
                          </div>

                          {/* Corner Accent */}
                          <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-transparent backdrop-blur-md border border-white/30 flex items-center justify-center">
                            <span className="text-2xl">🎵</span>
                          </div>
                        </div>

                        {/* Hover Border Glow */}
                        <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_60px_rgba(168,85,247,0.6)]"></div>
                      </div>
                    </motion.div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}

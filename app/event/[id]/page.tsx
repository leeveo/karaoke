'use client';

import React, { useEffect, useState } from 'react';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import CategorySelector from '@/components/CategorySelector';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import Image from 'next/image';

export default function EventPage() {
  // Use useParams instead of receiving params as props
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bgLoaded, setBgLoaded] = useState(false);

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

  useEffect(() => {
    async function loadEvent() {
      try {
        const eventData = await fetchEventById(id);
        
        if (!eventData) {
          setError('Cet événement n\'existe pas.');
          setLoading(false);
          return;
        }
        
        if (!eventData.is_active) {
          setError('Cet événement n\'est pas disponible.');
          setLoading(false);
          return;
        }
        
        // Appliquer les couleurs personnalisées via CSS variables
        if (eventData.customization) {
          const primaryColor = eventData.customization.primary_color || '#0334b9';
          const secondaryColor = eventData.customization.secondary_color || '#2fb9db';
          
          document.documentElement.style.setProperty('--primary-color', primaryColor);
          document.documentElement.style.setProperty('--primary-light', adjustColorLightness(primaryColor, 20));
          document.documentElement.style.setProperty('--primary-dark', adjustColorLightness(primaryColor, -20));
          document.documentElement.style.setProperty('--secondary-color', secondaryColor);
          document.documentElement.style.setProperty('--secondary-light', adjustColorLightness(secondaryColor, 20));
          document.documentElement.style.setProperty('--secondary-dark', adjustColorLightness(secondaryColor, -20));
          
          document.documentElement.style.setProperty(
            '--primary-gradient', 
            `linear-gradient(135deg, ${primaryColor} 0%, ${adjustColorLightness(primaryColor, 20)} 100%)`
          );
          document.documentElement.style.setProperty(
            '--secondary-gradient', 
            `linear-gradient(135deg, ${secondaryColor} 0%, ${adjustColorLightness(secondaryColor, 20)} 100%)`
          );

          // Améliorer la gestion de l'arrière-plan - sans référence à bg.png
          if (eventData.customization.background_image) {
            console.log("Found background_image:", eventData.customization.background_image);
            
            try {
              const publicUrlResult = supabase.storage
                .from('karaokestorage')
                .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
            
              if (publicUrlResult.data?.publicUrl) {
                const bgUrl = publicUrlResult.data.publicUrl;
                console.log("Background image URL generated:", bgUrl);
                
                // Stocker l'URL dans l'objet événement pour le rendu
                eventData.customization.backgroundImageUrl = bgUrl;
                
                // Pré-charger l'image avant de définir la variable CSS
                const img = new window.Image();
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
        
        setEvent(eventData);
        setLoading(false);
      } catch (err) {
        console.error("Erreur lors du chargement de l'événement:", err);
        setError('Cet événement n\'existe pas ou n\'est plus disponible.');
        setLoading(false);
        setBgLoaded(true); // Marquer comme chargé même en cas d'erreur
      }
    }

    loadEvent();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
        <p className="ml-3 text-white">Chargement de l&apos;événement...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-4">Événement introuvable</h1>
        <p>{error || 'Cet événement n&apos;est pas disponible.'}</p>
        <button 
          onClick={() => router.push('/')}
          className="mt-6 px-6 py-3 bg-white text-purple-800 rounded-lg font-medium"
        >
          Retour à l&apos;accueil
        </button>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center relative overflow-hidden ${bgLoaded ? 'bg-loaded' : ''}`}
      style={{
        backgroundImage: event?.customization?.backgroundImageUrl 
          ? `url('${event.customization.backgroundImageUrl}')` 
          : "linear-gradient(135deg, #080424 0%, #160e40 100%)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        transition: "background-image 0.5s ease-in-out"
      }}>
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-sm"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col items-center w-full">
        {/* Event header with logo */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 w-full">
          <h1 className="text-4xl font-bold text-white mb-4 md:mb-0"
            style={{ WebkitTextStroke: "1px rgba(0,0,0,0.3)" }}
          >
            {event.name}
          </h1>
          
          {/* Display the logo if available */}
          {event.customization?.logoUrl && (
            <div className="w-64 h-64 bg-white/10 backdrop-blur-md rounded-lg p-2 flex items-center justify-center">
              <Image 
                src={event.customization.logoUrl} 
                alt={`${event.name} Logo`} 
                width={200}
                height={200}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          )}
        </div>
        
        {/* Main content */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 
            className="text-4xl md:text-5xl font-bold mb-6"
            style={{ 
              color: 'var(--primary-color)',
              WebkitTextStroke: "2px rgba(255, 255, 255, 0.5)",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)"
            }}
          >
            Chante maintenant !
          </h2>
          <p 
            className="text-xl max-w-xl mx-auto"
            style={{ 
              color: 'var(--secondary-color)',
              WebkitTextStroke: "1px rgba(255, 255, 255, 0.5)",
              textShadow: "0 1px 3px rgba(0,0,0,0.3)"
            }}
          >
            Choisis une catégorie de chansons et commence à chanter. Les vidéos seront enregistrées et partagées avec les participants.
          </p>
        </motion.div>
        
        {/* Catégories */}
        <div className="w-full max-w-4xl">
          <CategorySelector eventId={id} />
        </div>
      </div>
    </div>
  );
}

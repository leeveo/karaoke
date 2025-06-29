'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchEventById } from '@/lib/supabase/events';
import { getSignedVideoUrl } from '@/services/s3Service';
import { FiChevronLeft, FiDownload } from 'react-icons/fi';
import Link from 'next/link';
import { Event } from '@/types/event'; // Make sure this import is available

export default function VideoPlayerPage() {
  // Correction : extraction sécurisée des paramètres id et videoKey sans destructuring direct
  const params = useParams() as Record<string, string | string[]>;
  let id = '';
  let videoKey = '';
  if (params && typeof params === 'object') {
    const rawId = params.id;
    const rawVideoKey = params.videoKey;
    id = Array.isArray(rawId) ? rawId[0] : rawId || '';
    videoKey = Array.isArray(rawVideoKey) ? rawVideoKey[0] : rawVideoKey || '';
  }
  const router = useRouter();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [event, setEvent] = useState<Event | null>(null); // Fixed: Specify proper type instead of any
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Charger les informations de l'événement
        if (typeof id === 'string' && id) {
          const eventData = await fetchEventById(id);
          setEvent(eventData);
        }
        
        // Générer une URL signée pour la vidéo
        if (typeof videoKey === 'string' && videoKey) {
          // Décodage de la clé vidéo et reconstruction du chemin complet
          const decodedKey = decodeURIComponent(videoKey);
          const videoPath = `karaoke-videos/event_${id}/${decodedKey}`;
          
          console.log("Génération d'une URL signée pour:", videoPath);
          const signedUrl = await getSignedVideoUrl(videoPath);
          
          if (signedUrl) {
            console.log("URL signée générée:", signedUrl);
            setVideoUrl(signedUrl);
          } else {
            setError("Impossible de générer une URL d'accès pour cette vidéo");
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la vidéo:", err);
        setError("Erreur de chargement de la vidéo");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id, videoKey]);

  // Extraction du titre de la vidéo à partir de la clé
  const getVideoTitle = () => {
    if (!videoKey) return "Vidéo";
    
    try {
      const decodedKey = decodeURIComponent(videoKey as string);
      const parts = decodedKey.split('-');
      const songIdPart = parts[0];
      
      // Extraire le titre de la chanson du songId
      const songName = decodeURIComponent(songIdPart)
        .split('/')
        .pop()
        ?.replace('.mp4', '')
        || 'Vidéo';
        
      return songName;
    } catch {
      // Removed the unused 'error' parameter
      return "Vidéo";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link 
          href={`/admin/events/${id}/videos`} 
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <FiChevronLeft className="mr-1" /> Retour aux vidéos
        </Link>
      </div>
      
      <h1 className="text-2xl font-semibold text-gray-800">
        {event?.name ? `Vidéo de "${event.name}"` : 'Lecteur vidéo'}
      </h1>
      
      <div className="bg-black rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="aspect-video flex items-center justify-center bg-black">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
          </div>
        ) : error ? (
          <div className="aspect-video flex items-center justify-center bg-black p-8">
            <div className="text-center">
              <p className="text-red-400 font-medium text-lg mb-4">{error}</p>
              <p className="text-white/60 mb-4">Impossible de lire cette vidéo. Il est possible que la vidéo ne soit plus disponible ou que vous n&apos;ayez pas les permissions nécessaires.</p>
              <button 
                onClick={() => router.back()}
                className="px-4 py-2 bg-white text-black rounded hover:bg-gray-100"
              >
                Retour
              </button>
            </div>
          </div>
        ) : (
          <>
            <video 
              controls 
              autoPlay 
              className="w-full aspect-video" 
              src={videoUrl || undefined}
              crossOrigin="anonymous"
            >
              <source src={videoUrl || undefined} type="video/webm" />
              Votre navigateur ne prend pas en charge la lecture de vidéos.
            </video>
            
            <div className="p-4 bg-gray-800 text-white">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">{getVideoTitle()}</h3>
                {videoUrl && (
                  <a 
                    href={videoUrl} 
                    download 
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center space-x-2"
                  >
                    <FiDownload />
                    <span>Télécharger</span>
                  </a>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Remplacez dans votre CategoryPage (ou toute page dynamique similaire) :
export default function CategoryPage() {
  // Extraction sécurisée du paramètre category
  const params = useParams() as Record<string, string | string[]>;
  let category = '';
  if (params && typeof params === 'object') {
    const rawCategory = params.category;
    category = Array.isArray(rawCategory) ? rawCategory[0] : rawCategory || '';
  }
  const router = useRouter();
  // ...existing code...
}

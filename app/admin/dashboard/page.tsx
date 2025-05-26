'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiMusic, 
  FiCalendar, 
  FiBarChart2, 
  FiUsers,
  FiPlus,
  FiEye,
  FiExternalLink,
  FiRefreshCw
} from 'react-icons/fi';
import { fetchEvents } from '@/lib/supabase/events';
import { getS3Categories, getS3SongsByCategory } from '@/lib/aws/s3Admin';
import { Event } from '@/types/event';
import { useQRCode } from 'next-qrcode';
import { supabase } from '@/lib/supabase/client';

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalSongs: 0,
    totalCategories: 0,
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { Canvas: QRCanvas } = useQRCode();

  // Charger les données au chargement de la page
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // Charger les événements
        const eventData = await fetchEvents();
        setEvents(eventData);
        
        // Compter le nombre total de chansons et catégories dans S3
        let songCount = 0;
        const categories = await getS3Categories();
        
        for (const category of categories) {
          const songs = await getS3SongsByCategory(category.name);
          songCount += songs.length;
        }
        
        // Mettre à jour les statistiques
        setStats({
          totalEvents: eventData.length,
          activeEvents: eventData.filter(event => event.is_active).length,
          totalSongs: songCount,
          totalCategories: categories.length,
        });
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  // Fonction pour obtenir l'URL d'accès à un événement
  const getEventUrl = (eventId: string) => {
    // Utiliser l'URL complète en production
    const baseUrl = window.location.origin;
    return `${baseUrl}/event/${eventId}`;
  };

  // Add this utility function to get the background image URL for an event
  const getEventBackgroundUrl = (event) => {
    if (event?.customization?.background_image) {
      try {
        const publicUrlResult = supabase.storage
          .from('karaokestorage')
          .getPublicUrl(`backgrounds/${event.customization.background_image}`);
        
        if (publicUrlResult.data?.publicUrl) {
          return publicUrlResult.data.publicUrl;
        }
      } catch (error) {
        console.error("Error getting background URL:", error);
      }
    }
    return null; // Return null if no background image
  };

  // Update the events section in your dashboard
  const EventsSection = ({ events }) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event) => {
          const bgImageUrl = getEventBackgroundUrl(event);
          
          return (
            <div 
              key={event.id} 
              className="relative overflow-hidden rounded-lg shadow-md h-48 group"
            >
              {/* Background Image */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                style={{ 
                  backgroundImage: bgImageUrl ? `url(${bgImageUrl})` : 'var(--primary-gradient)',
                }}
              ></div>
              
              {/* Gradient Overlay for text readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-black/40"></div>
              
              {/* Content */}
              <div className="relative z-10 h-full flex flex-col justify-between p-4">
                <Link 
                  href={`/admin/events/${event.id}/view`}
                  className="text-xl font-semibold text-white hover:underline"
                >
                  {event.name}
                </Link>
                
                <div className="flex justify-between items-center">
                  <span 
                    className={`px-2 py-1 rounded-full text-xs ${
                      event.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {event.is_active ? 'Actif' : 'Inactif'}
                  </span>
                  
                  <div className="flex space-x-2">
                    <Link 
                      href={`/admin/events/${event.id}/edit`}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    >
                      <FiEdit2 className="h-4 w-4" />
                    </Link>
                    <Link 
                      href={`/admin/events/${event.id}/videos`}
                      className="p-1 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    >
                      <FiVideo className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Fonction complètement réécrite pour extraire l'ID d'événement du chemin vidéo
  const extractEventId = (path: string): string | null => {
    if (!path) return null;
    
    // Format attendu: 'karaoke-videos/event_ID/session-xyz.webm'
    const match = path.match(/karaoke-videos\/event_([^\/]+)/);
    if (match && match[1]) {
      return match[1].trim(); // Nettoyer l'ID extrait
    }
    return null;
  };

  // Fonction corrigée pour compter les vidéos par événement sans doublons
  const countVideosByEvent = (videos: any[]): Record<string, number> => {
    // Utiliser un objet simple au lieu d'une Map pour plus de clarté
    const eventCounts: Record<string, number> = {};
    
    // Créer un Set pour suivre les chemins de fichiers uniques déjà traités
    const processedVideos = new Set<string>();
    
    for (const video of videos) {
      // Éviter de compter deux fois la même vidéo
      if (processedVideos.has(video.name)) continue;
      processedVideos.add(video.name);
      
      // Extraire l'ID de l'événement
      const eventId = extractEventId(video.name);
      if (!eventId) continue;
      
      // Incrémenter le compteur pour cet événement
      eventCounts[eventId] = (eventCounts[eventId] || 0) + 1;
    }
    
    console.log("Comptage vidéos par événement:", eventCounts);
    return eventCounts;
  };

  // Fonction de chargement des statistiques - simplifiée et corrigée
  const loadStats = async () => {
    try {
      setLoading(true);
      
      // 1. Charger les événements et les vidéos
      const eventsData = await fetchEvents();
      const { videos } = await fetchAllVideos();
      
      // 2. Créer un mapping des événements par ID pour référence rapide
      const eventsById: Record<string, Event> = {};
      eventsData.forEach(event => {
        eventsById[event.id] = event;
      });
      
      // 3. Compter les vidéos par événement
      const videoCounts = countVideosByEvent(videos);
      
      // 4. Construire les données d'événements populaires
      const eventVideoData = Object.entries(videoCounts).map(([eventId, count]) => {
        const event = eventsById[eventId];
        return {
          id: eventId,
          name: event ? event.name : `Événement #${eventId}`,
          videos: count
        };
      });
      
      // 5. Trier et limiter les événements populaires
      const topEvents = eventVideoData
        .sort((a, b) => b.videos - a.videos)
        .slice(0, 5);
      
      console.log("Top 5 des événements:", topEvents);
      
      // 6. Mettre à jour les statistiques
      setStats({
        totalEvents: eventsData.length,
        activeEvents: eventsData.filter(e => e.is_active).length,
        totalSongs: await countSongs(),
        totalCategories: await countCategories(),
        totalVideos: videos.length,
        popularEvents: topEvents
      });
      
      setEvents(eventsData);
      
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques:", error);
    } finally {
      setLoading(false);
    }
  };

  // Mise à jour du composant d'affichage des événements populaires avec debugging
  const PopularEventsChart = ({ events }) => {
    if (!events || events.length === 0) {
      return <div className="text-center py-6 text-gray-500">Aucune donnée disponible</div>;
    }
    
    console.log("Rendu du graphique avec événements:", events);
    const maxVideos = Math.max(...events.map(e => e.videos));
    
    return (
      <div className="mt-4">
        {events.map((event, index) => (
          <div key={`event-bar-${event.id}-${index}`} className="mb-3">
            <div className="flex items-center mb-1">
              <span className="text-sm font-medium truncate w-36">{event.name}</span>
              <span className="ml-auto text-xs text-gray-500">{event.videos} vidéo{event.videos > 1 ? 's' : ''}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="h-2.5 rounded-full" 
                style={{
                  width: `${(event.videos / maxVideos) * 100}%`,
                  backgroundColor: `var(--primary-color)`,
                  opacity: 0.8 - (index * 0.1)
                }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistiques globales */}
      <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white">
        <h3 className="text-xl font-medium mb-6">Statistiques Globales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Événements totaux */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiCalendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Événements totaux</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalEvents}</span>
              </div>
            </div>
          </div>
          
          {/* Événements actifs */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiCalendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Événements actifs</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.activeEvents}</span>
              </div>
            </div>
          </div>
          
          {/* Nombre de chansons */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiMusic className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Chansons disponibles</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalSongs}</span>
              </div>
            </div>
          </div>
          
          {/* Nombre de catégories */}
          <div className="flex items-center space-x-4">
            <div className="bg-blue bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiBarChart2 className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Catégories</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalCategories}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bouton d'actualisation */}
      <div className="flex justify-end">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition-all font-medium"
        >
          <FiRefreshCw className="h-5 w-5" />
          Actualiser les données
        </button>
      </div>

      {/* Vos événements */}
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Vos Événements ({events.length})</h3>
          <Link 
            href="/admin/events/create"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-800 flex items-center"
          >
            <FiPlus className="mr-1" /> Nouvel événement
          </Link>
        </div>
        
        {events.length === 0 ? (
          <div className="text-center py-8 border border-gray-200 rounded-lg">
            <p className="text-gray-500 mb-4">Aucun événement trouvé</p>
            <Link 
              href="/admin/events/create"
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
            >
              Créer un événement
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.slice(0, 6).map((event) => (
              <div
                key={event.id}
                className="border border-transparent rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div
                  className="h-40 flex flex-col items-center justify-center p-4 relative"
                  style={{
                    backgroundColor: '#f3f4f6',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundImage: event.customization?.background_image 
                      ? `url(${event.customization.background_image})` 
                      : undefined,
                  }}
                >
                  {event.customization?.background_image && (
                    <div className="absolute inset-0 bg-black/40 z-0" />
                  )}
                  <div className="relative z-10 w-full flex flex-col items-center">
                    <span
                      className="block text-2xl font-bold text-center shadow"
                      style={{
                        background: event.customization?.primary_color
                          ? `linear-gradient(90deg, ${event.customization.primary_color} 0%, ${event.customization.secondary_color || '#a78bfa'} 100%)`
                          : 'linear-gradient(90deg, #6366f1 0%, #a78bfa 100%)',
                        color: '#fff',
                        borderRadius: '0.75rem',
                        padding: '0.5rem 1.5rem',
                        boxShadow: '0 2px 12px 0 rgba(99,102,241,0.10)',
                        letterSpacing: '0.02em',
                        border: '2px solid #fff',
                        marginTop: '0.5rem',
                        marginBottom: '0.5rem',
                        display: 'inline-block',
                        maxWidth: '90%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {event.name}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{event.name}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${event.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {event.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    <div className="flex items-center space-x-1">
                      <span>Lieu: {event.location || 'Non spécifié'}</span>
                    </div>
                    <div className="flex items-center space-x-1 mt-1">
                      <span>Date: {new Date(event.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* QR Code display for quick access */}
                  <div className="mt-3 flex justify-center bg-white p-2 rounded-lg border border-gray-100">
                    <div className="text-center">
                      <span className="text-xs font-medium text-gray-500 block mb-1">Accès Événement</span>
                      {typeof window !== 'undefined' && (
                        <div className="inline-block bg-white p-1 border border-gray-200 rounded">
                          <QRCanvas
                            text={getEventUrl(event.id)}
                            options={{
                              width: 80,
                              margin: 1,
                              color: {
                                dark: '#000000',
                                light: '#ffffff',
                              },
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                    <Link
                      href={`/admin/events/${event.id}/edit`}
                      className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border border-blue-200 shadow-sm hover:from-blue-200 hover:to-blue-300 hover:text-blue-900 transition"
                      title="Modifier l'événement"
                    >
                      <span className="inline-flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Modifier
                      </span>
                    </Link>
                    <Link
                      href={`/event/${event.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-green-100 to-green-200 text-green-800 border border-green-200 shadow-sm hover:from-green-200 hover:to-green-300 hover:text-green-900 transition"
                      title="Voir l'événement"
                    >
                      <span className="inline-flex items-center gap-1">
                        <FiEye className="w-4 h-4" />
                        Aperçu
                      </span>
                    </Link>
                    <Link
                      href={`/admin/analytics`}
                      className="flex-1 text-center text-xs px-3 py-2 rounded-lg font-semibold bg-gradient-to-br from-indigo-100 to-purple-200 text-indigo-800 border border-indigo-200 shadow-sm hover:from-indigo-200 hover:to-purple-300 hover:text-indigo-900 transition"
                    >
                      <span className="inline-flex items-center gap-1">
                        <FiExternalLink className="w-4 h-4" />
                        Statistiques
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {events.length > 6 && (
          <div className="mt-6 text-center">
            <Link 
              href="/admin/events" 
              className="text-indigo-600 font-medium hover:text-indigo-800"
            >
              Voir tous les événements
            </Link>
          </div>
        )}
      </div>

      {/* Gestion de contenu - Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        <div className="p-6 bg-blue-50 border-l-4 border-blue-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-blue-800">Chansons</h3>
            <span className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-full">
              {stats.totalSongs} total
            </span>
          </div>
          <p className="mt-2 text-sm text-blue-600">
            Gérez les chansons disponibles dans votre application
          </p>
          <div className="mt-4">
            <Link 
              href="/admin/songs" 
              className="text-blue-700 font-medium text-sm hover:text-blue-900"
            >
              Accéder à la gestion →
            </Link>
          </div>
        </div>
        <div className="p-6 bg-purple-50 border-l-4 border-purple-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-purple-800">Événements</h3>
            <span className="px-3 py-1 text-xs font-medium text-purple-600 bg-purple-100 rounded-full">
              {stats.totalEvents} total
            </span>
          </div>
          <p className="mt-2 text-sm text-purple-600">
            Gérez les événements et leurs paramètres
          </p>
          <div className="mt-4">
            <Link 
              href="/admin/events" 
              className="text-purple-700 font-medium text-sm hover:text-purple-900"
            >
              Accéder à la gestion →
            </Link>
          </div>
        </div>
        <div className="p-6 bg-green-50 border-l-4 border-green-400 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-green-800">Statistiques</h3>
            <span className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full">
              Analyses
            </span>
          </div>
          <p className="mt-2 text-sm text-green-600">
            Consultez les statistiques d'utilisation de l'application
          </p>
          <div className="mt-4">
            <Link 
              href="/admin/analytics" 
              className="text-green-700 font-medium text-sm hover:text-green-900"
            >
              Voir les statistiques →
            </Link>
          </div>
        </div>
      </div>

      {/* Guide rapide */}
      <div className="p-6 bg-white rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Guide rapide</h3>
        <div className="space-y-4">
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800">1. Création d'un nouvel événement</h4>
            <p className="mt-1 text-sm text-blue-600">
              Commencez par créer un nouvel événement dans la section "Événements". Renseignez le nom, la date,
              le lieu, et personnalisez les couleurs.
            </p>
          </div>
          <div className="p-4 border border-purple-200 bg-purple-50 rounded-md">
            <h4 className="font-medium text-purple-800">2. Personnalisation de l'événement</h4>
            <p className="mt-1 text-sm text-purple-600">
              Personnalisez les couleurs et l'apparence de votre événement pour refléter votre marque ou votre thème.
            </p>
          </div>
          <div className="p-4 border border-green-200 bg-green-50 rounded-md">
            <h4 className="font-medium text-green-800">3. Partage de l'URL ou du QR code</h4>
            <p className="mt-1 text-sm text-green-600">
              Chaque événement dispose d'une URL unique et d'un QR code que vous pouvez partager avec les participants.
            </p>
          </div>
          <div className="p-4 border border-blue-200 bg-blue-50 rounded-md">
            <h4 className="font-medium text-blue-800">4. Surveillance des performances</h4>
            <p className="mt-1 text-sm text-blue-600">
              Suivez les statistiques pour voir combien de personnes utilisent votre karaoké.
            </p>
          </div>
        </div>
      </div>

      {/* Événements populaires - Graphique */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-medium text-gray-800">Événements populaires</h3>
        <PopularEventsChart events={stats.popularEvents || []} />
      </div>
    </div>
  );
}

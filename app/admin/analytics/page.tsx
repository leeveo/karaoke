'use client';

import { useState, useEffect } from 'react';
import { 
  // Remove unused icons
  // FiGrid,
  FiPieChart,
  FiTrendingUp,
  // FiBarChart2,
  // FiUsers,
  FiCalendar,
  FiDownload,
  FiRefreshCw,
  FiMusic, // Add missing FiMusic icon
  FiVideo, // Add missing FiVideo icon
  FiChevronUp, // Add missing FiChevronUp icon
  FiChevronDown, // Add missing FiChevronDown icon
  FiPlay, // Add missing FiPlay icon
  FiArrowUp // Add missing FiArrowUp icon
} from 'react-icons/fi';
import Link from 'next/link';
import { fetchEvents } from '@/lib/supabase/events';
import { getS3Categories, getS3SongsByCategory } from '@/lib/aws/s3Admin';
import { Event } from '@/types/event';
import { VideoItem, getEventVideos } from '@/services/s3Service';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

// Enregistrer les composants Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// Interface pour les données de chansons populaires
interface TopSong {
  songId: string;
  count: number;
  title: string;
}

// Interface pour les statistiques par événement
interface EventStats {
  eventId: string;
  eventName: string;
  videoCount: number;
  topSongs: TopSong[];
  isActive: boolean;
  date: string;
}

export default function AnalyticsPage() {
  // États pour gérer les données
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalSongs: 0,
    totalCategories: 0,
    totalVideos: 0,
    recentVideoCount: 0,
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [eventStats, setEventStats] = useState<EventStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [eventCounts, setEventCounts] = useState({ total: 0, active: 0, inactive: 0 });
  const [songCounts, setSongCounts] = useState({ total: 0 });
  const [monthlyVideoData, setMonthlyVideoData] = useState<number[]>(Array(12).fill(0));
  const [selectedEventId, setSelectedEventId] = useState<string | 'all'>('all');

  // Charger les données au chargement de la page
  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        
        // 1. Charger les événements
        const eventData = await fetchEvents();
        setEvents(eventData);
        
        // 2. Compter le nombre total de chansons et catégories dans S3
        let songCount = 0;
        const categories = await getS3Categories();
        
        for (const category of categories) {
          const songs = await getS3SongsByCategory(category.name);
          songCount += songs.length;
        }
        
        // 3. Charger les statistiques par événement
        const eventStatsData: EventStats[] = [];
        let totalVideoCount = 0;
        const videosByEvent: Record<string, number> = {};
        
        // Récupérer toutes les vidéos pour chaque événement
        for (const event of eventData) {
          try {
            const eventVideos = await getEventVideos(event.id);
            videosByEvent[event.id] = eventVideos.length;
            totalVideoCount += eventVideos.length;
            
            // Compter les occurrences de chaque chanson
            const songCounts: Record<string, number> = {};
            const songTitles: Record<string, string> = {};
            
            eventVideos.forEach(video => {
              // Extraction du songId à partir du nom de fichier
              const filename = video.key.split('/').pop() || '';
              const songId = filename.split('-')[0];
              
              if (songId) {
                // Incrémenter le compteur pour ce songId
                songCounts[songId] = (songCounts[songId] || 0) + 1;
                
                // Extraire un titre plus lisible du songId
                const decodedSongId = decodeURIComponent(songId);
                const songName = decodedSongId.split('/').pop()?.replace('.mp4', '') || songId;
                songTitles[songId] = songName;
              }
            });
            
            // Convertir les compteurs en tableau et trier
            const topSongs = Object.keys(songCounts)
              .map(id => ({
                songId: id,
                count: songCounts[id],
                title: songTitles[id]
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5); // Prendre les 5 premiers
            
            // Ajouter les statistiques de cet événement
            // Vérifier que cet ID d'événement n'est pas déjà présent dans eventStatsData
            if (!eventStatsData.some(existingStat => existingStat.eventId === event.id)) {
              eventStatsData.push({
                eventId: event.id,
                eventName: event.name,
                videoCount: eventVideos.length,
                topSongs,
                isActive: event.is_active,
                date: event.date
              });
            } else {
              console.warn(`Événement en double détecté: ${event.id} - ${event.name}`);
            }
          } catch (err) {
            console.error(`Erreur lors du chargement des vidéos pour l'événement ${event.id}:`, err);
          }
        }
        
        // Trier les événements par date (du plus récent au plus ancien)
        eventStatsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setEventStats(eventStatsData);
        setEventCounts({
          total: eventData.length,
          active: eventData.filter(event => event.is_active).length,
          inactive: eventData.filter(event => !event.is_active).length,
        });
        
        // Préparer les données pour l'activité mensuelle (initialiser à zéro)
        const monthCounts: number[] = Array(12).fill(0);
        const allEventVideos: VideoItem[] = [];
        
        // Récupérer toutes les vidéos pour chaque événement
        for (const event of eventData) {
          try {
            const eventVideos = await getEventVideos(event.id);
            videosByEvent[event.id] = eventVideos.length;
            totalVideoCount += eventVideos.length;
            
            // Ajouter les vidéos à notre collection avec l'ID de l'événement
            allEventVideos.push(...eventVideos.map(video => ({
              ...video,
              eventId: event.id
            })));
            
            // Compter les occurrences de chaque chanson
            const songCounts: Record<string, number> = {};
            const songTitles: Record<string, string> = {};
            
            eventVideos.forEach(video => {
              // Extraction du songId à partir du nom de fichier
              const filename = video.key.split('/').pop() || '';
              const songId = filename.split('-')[0];
              
              if (songId) {
                // Incrémenter le compteur pour ce songId
                songCounts[songId] = (songCounts[songId] || 0) + 1;
                
                // Extraire un titre plus lisible du songId
                const decodedSongId = decodeURIComponent(songId);
                const songName = decodedSongId.split('/').pop()?.replace('.mp4', '') || songId;
                songTitles[songId] = songName;
              }
            });
            
            // Convertir les compteurs en tableau et trier
            const topSongs = Object.keys(songCounts)
              .map(id => ({
                songId: id,
                count: songCounts[id],
                title: songTitles[id]
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5); // Prendre les 5 premiers
            
            // Ajouter les statistiques de cet événement
            eventStatsData.push({
              eventId: event.id,
              eventName: event.name,
              videoCount: eventVideos.length,
              topSongs,
              isActive: event.is_active,
              date: event.date
            });
          } catch (err) {
            console.error(`Erreur lors du chargement des vidéos pour l'événement ${event.id}:`, err);
          }
        }
        
        // Compiler les données mensuelles pour toutes les vidéos
        allEventVideos.forEach(video => {
          const date = new Date(video.dateCreated);
          const month = date.getMonth(); // 0-11 pour Jan-Dec
          monthCounts[month]++;
        });
        
        // Mettre à jour l'état avec les données mensuelles
        setMonthlyVideoData(monthCounts);
        
        // Trier les événements par date (du plus récent au plus ancien)
        eventStatsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        setEventStats(eventStatsData);
        setEventCounts({
          total: eventData.length,
          active: eventData.filter(event => event.is_active).length,
          inactive: eventData.filter(event => !event.is_active).length,
        });
        
        // 4. Calculer le nombre de vidéos récentes (30 derniers jours)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentVideos = eventStatsData.reduce((count, event) => {
          if (new Date(event.date) >= thirtyDaysAgo) {
            return count + event.videoCount;
          }
          return count;
        }, 0);
        
        // Mettre à jour les statistiques globales
        setStats({
          totalEvents: eventData.length,
          activeEvents: eventData.filter(event => event.is_active).length,
          totalSongs: songCount,
          totalCategories: categories.length,
          totalVideos: totalVideoCount,
          recentVideoCount: recentVideos,
        });
        
      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadStats();
  }, []);

  // Fonction pour basculer l'expansion d'un événement
  const toggleEventExpansion = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
    } else {
      setExpandedEvent(eventId);
    }
  };

  // Préparer les données pour le graphique des événements les plus populaires
  const popularEventsChartData = {
    labels: eventStats.slice(0, 10).map(event => event.eventName),
    datasets: [
      {
        label: 'Nombre de vidéos',
        data: eventStats.slice(0, 10).map(event => event.videoCount),
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      }
    ],
  };

  // Préparer les données pour le graphique des catégories de chansons
  const categoriesChartData = {
    labels: ['Français', 'Anglais', 'Pop', 'Rock', 'Hip-Hop', 'Latino'],
    datasets: [
      {
        label: 'Chansons par catégorie',
        data: [25, 40, 30, 20, 15, 10],
        backgroundColor: [
          'rgba(255, 99, 132, 0.6)',
          'rgba(54, 162, 235, 0.6)',
          'rgba(255, 206, 86, 0.6)',
          'rgba(75, 192, 192, 0.6)',
          'rgba(153, 102, 255, 0.6)',
          'rgba(255, 159, 64, 0.6)',
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Options pour les graphiques
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Événements les plus populaires',
      },
    },
  };

  // Préparer les données pour le graphique d'activité mensuelle avec les données réelles
  const monthlyActivityData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [
      {
        label: 'Vidéos enregistrées',
        data: monthlyVideoData,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Fonction pour filtrer les données d'activité par événement
  const filterMonthlyDataByEvent = (eventId: string | 'all') => {
    if (eventId === 'all') {
      // Recalculer pour tous les événements
      const monthCounts: number[] = Array(12).fill(0);
      
      eventStats.forEach(stat => {
        const event = events.find(e => e.id === stat.eventId);
        if (event) {
          const date = new Date(event.date);
          const month = date.getMonth();
          monthCounts[month] += stat.videoCount;
        }
      });
      
      setMonthlyVideoData(monthCounts);
    } else {
      // Filtrer pour un événement spécifique
      const selectedEvent = eventStats.find(stat => stat.eventId === eventId);
      if (selectedEvent) {
        // Créer un tableau de 12 mois avec uniquement les vidéos de cet événement
        const monthCounts: number[] = Array(12).fill(0);
        const date = new Date(selectedEvent.date);
        const month = date.getMonth();
        monthCounts[month] = selectedEvent.videoCount;
        
        setMonthlyVideoData(monthCounts);
      }
    }
    
    setSelectedEventId(eventId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Statistiques détaillées</h1>
        
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-700 transition-all"
        >
          <FiRefreshCw className="h-5 w-5" />
          Actualiser
        </button>
      </div>

      {/* Statistiques globales */}
      <div className="p-6 bg-gradient-to-br from-blue-500 via-purple-500 to-blue-500 rounded-lg shadow text-white">
        <h3 className="text-xl font-medium mb-6">Vue d'ensemble</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {/* Événements */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiCalendar className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Événements</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalEvents}</span>
                <span className="ml-2 text-sm bg-green-500 bg-opacity-30 px-2 py-0.5 rounded-full flex items-center">
                  <span>{loading ? '...' : stats.activeEvents} actifs</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Nombre de chansons */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiMusic className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Catalogue</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalSongs}</span>
                <span className="ml-2 text-sm bg-purple-500 bg-opacity-30 px-2 py-0.5 rounded-full flex items-center">
                  <span>{loading ? '...' : stats.totalCategories} catégories</span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Vidéos enregistrées */}
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-10 rounded-lg p-3 flex items-center justify-center">
              <FiVideo className="h-10 w-10 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-white text-opacity-80">Vidéos enregistrées</p>
              <div className="flex items-center">
                <span className="text-4xl font-bold">{loading ? '...' : stats.totalVideos}</span>
                <span className="ml-2 text-sm bg-blue-500 bg-opacity-30 px-2 py-0.5 rounded-full flex items-center">
                  <FiArrowUp className="h-3 w-3 mr-1" />
                  <span>{stats.recentVideoCount} récentes</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section des graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des événements les plus populaires */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Événements les plus populaires</h3>
          <div className="h-80">
            <Bar options={chartOptions} data={popularEventsChartData} />
          </div>
        </div>
        
        {/* Graphique des catégories de chansons */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribution des catégories</h3>
          <div className="h-80 flex justify-center">
            <Doughnut
              data={categoriesChartData}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  title: {
                    display: true,
                    text: 'Répartition des chansons par catégorie',
                  },
                },
              }}
            />
          </div>
        </div>
        
        {/* Graphique d'activité mensuelle avec sélecteur d'événement */}
        <div className="bg-white p-6 rounded-lg shadow lg:col-span-2">
          <div className="flex flex-wrap justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Activité mensuelle</h3>
            
            <div className="flex items-center">
              <label htmlFor="event-filter" className="block text-sm font-medium text-gray-700 mr-2">
                Filtrer par événement:
              </label>
              <select
                id="event-filter"
                value={selectedEventId}
                onChange={(e) => filterMonthlyDataByEvent(e.target.value)}
                className="block py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="all">Tous les événements</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="h-80">
            <Line 
              data={monthlyActivityData}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      precision: 0 // Afficher uniquement des valeurs entières
                    }
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Statistiques par événement */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Statistiques par événement</h3>
        </div>
        
        {loading ? (
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : eventStats.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500">Aucune donnée disponible pour les événements</p>
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Utiliser un Set ou un Map pour stocker les IDs d'événements déjà rendus */}
            {(() => {
              const renderedIds = new Set();
              return eventStats
                .filter(eventStat => {
                  // Ne garder que les événements uniques
                  if (renderedIds.has(eventStat.eventId)) {
                    return false;
                  }
                  renderedIds.add(eventStat.eventId);
                  return true;
                })
                .map((eventStat, index) => (
                  <div key={`${eventStat.eventId}-${index}`} className="border-b border-gray-200 last:border-b-0">
                    <div 
                      className={`px-6 py-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center ${
                        expandedEvent === eventStat.eventId ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => toggleEventExpansion(eventStat.eventId)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h4 className="font-medium text-gray-900">{eventStat.eventName}</h4>
                          <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                            eventStat.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {eventStat.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Date: {new Date(eventStat.date).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-md flex items-center mr-4">
                          <FiVideo className="h-4 w-4 mr-1" />
                          <span className="font-medium">{eventStat.videoCount} vidéos</span>
                        </div>
                        {expandedEvent === eventStat.eventId ? 
                          <FiChevronUp className="h-5 w-5 text-gray-500" /> : 
                          <FiChevronDown className="h-5 w-5 text-gray-500" />
                        }
                      </div>
                    </div>
                    
                    {/* Contenu détaillé de l'événement (visible si expanded) */}
                    {expandedEvent === eventStat.eventId && (
                      <div className="px-6 py-4 bg-indigo-50/50">
                        <h5 className="font-medium text-gray-900 mb-2">Les 5 chansons les plus populaires</h5>
                        
                        {eventStat.topSongs.length === 0 ? (
                          <p className="text-gray-500 text-sm italic">Aucune donnée disponible</p>
                        ) : (
                          <div className="space-y-3">
                            {eventStat.topSongs.map((song, idx) => (
                              <div key={song.songId} className="bg-white p-3 rounded-lg shadow-sm">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-medium">
                                    {idx + 1}
                                  </div>
                                  <div className="ml-4 flex-1">
                                    <div className="font-medium text-gray-900">{song.title}</div>
                                    <div className="text-sm text-gray-500 truncate">{decodeURIComponent(song.songId)}</div>
                                  </div>
                                  <div className="flex items-center bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                                    <FiPlay className="h-3 w-3 mr-1" />
                                    <span>{song.count} enregistrements</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="mt-4 flex justify-end">
                          <Link 
                            href={`/admin/events/${eventStat.eventId}/videos`}
                            className="text-indigo-600 text-sm font-medium hover:text-indigo-800 flex items-center"
                          >
                            Voir toutes les vidéos
                            <svg className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ));
            })()}
          </div>
        )}
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Notes sur les données</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>• Les statistiques sont basées sur les vidéos enregistrées dans le système de stockage des vidéos.</p>
          <p>• Les événements sans vidéos enregistrées ne sont pas inclus dans certaines statistiques.</p>
          <p>• Les "vidéos récentes" correspondent aux enregistrements des 30 derniers jours.</p>
          <p>• Pour voir toutes les vidéos d'un événement spécifique, cliquez sur "Voir toutes les vidéos".</p>
        </div>
      </div>
    </div>
  );
}

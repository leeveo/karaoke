'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventVideos, VideoItem, getSignedVideoUrl, deleteS3Video, deleteAllEventVideos } from '@/services/s3Service';
import { fetchEventById } from '@/lib/supabase/events';
import Link from 'next/link';
import { Event } from '@/types/event';
import { FiDownload, FiEye, FiChevronLeft, FiPlay, FiVideo, FiX, FiClock, FiTrash2, FiAlertTriangle, FiCheck, FiCopy } from 'react-icons/fi';

export default function EventVideosAdminPage() {
  // Correction : extraction sécurisée du paramètre id
  const params = useParams() as Record<string, string | string[]>;
  let id = '';
  if (params && typeof params === 'object') {
    const rawId = params.id;
    id = Array.isArray(rawId) ? rawId[0] : rawId || '';
  }
  const router = useRouter();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Remove unused state variables
  // const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  
  // Nouveaux états pour gérer la suppression
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState<boolean>(false);
  const [videoToDelete, setVideoToDelete] = useState<VideoItem | null>(null);

  // Nouveaux états pour la modal de visualisation
  const [viewingVideo, setViewingVideo] = useState<VideoItem | null>(null);
  const [signedVideoUrl, setSignedVideoUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        
        // Charger les informations de l'événement
        if (typeof id === 'string') {
          const eventData = await fetchEventById(id);
          setEvent(eventData);
          
          // Charger les vidéos pour cet événement
          try {
            const eventVideos = await getEventVideos(id);
            setVideos(eventVideos);
          } catch (videoError) {
            console.error("Erreur lors du chargement des vidéos:", videoError);
            setError("Les vidéos n'ont pas pu être chargées. Le format de stockage a peut-être changé ou aucune vidéo n'est disponible.");
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données d'événement:", err);
        setError("Impossible de charger les informations de l'événement.");
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, [id]);

  // Remove unused function or implement it properly
  // const getVideoThumbnailUrl = (videoUrl: string) => {
  //   return '/placeholder-thumbnail.jpg';
  // };

  // Formater la date
  const formatDate = (date: Date) => {
    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fonction pour actualiser la liste des vidéos
  const refreshVideos = async () => {
    try {
      setLoading(true);
      if (typeof id === 'string') {
        const eventVideos = await getEventVideos(id);
        setVideos(eventVideos);
      }
    } catch (err) {
      console.error("Erreur lors de l'actualisation des vidéos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour supprimer une vidéo spécifique
  const handleDeleteVideo = async (video: VideoItem) => {
    setVideoToDelete(video);
    setShowDeleteConfirm(true);
  };

  // Fonction pour confirmer la suppression d'une vidéo
  const confirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      const success = await deleteS3Video(videoToDelete.key);
      
      if (success) {
        setDeleteSuccess(`La vidéo a été supprimée avec succès.`);
        // Mettre à jour la liste des vidéos
        setVideos(videos.filter(v => v.key !== videoToDelete.key));
      } else {
        setDeleteError("Impossible de supprimer la vidéo. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Erreur lors de la suppression de la vidéo:", err);
      setDeleteError("Une erreur s'est produite lors de la suppression de la vidéo.");
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
      setVideoToDelete(null);
      
      // Masquer le message de succès après 3 secondes
      if (setDeleteSuccess) {
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);
      }
    }
  };

  // Fonction pour supprimer toutes les vidéos
  const handleDeleteAllVideos = () => {
    setShowDeleteAllConfirm(true);
  };

  // Fonction pour confirmer la suppression de toutes les vidéos
  const confirmDeleteAllVideos = async () => {
    if (typeof id !== 'string') return;
    
    try {
      setDeleteLoading(true);
      setDeleteError(null);
      
      const result = await deleteAllEventVideos(id);
      
      if (result.success) {
        setDeleteSuccess(`${result.deletedCount} vidéos ont été supprimées avec succès.`);
        // Recharger la liste des vidéos (qui devrait être vide maintenant)
        await refreshVideos();
      } else if (result.deletedCount > 0) {
        setDeleteSuccess(`${result.deletedCount} vidéos ont été supprimées, mais certaines n'ont pas pu être supprimées.`);
        await refreshVideos();
      } else {
        setDeleteError("Impossible de supprimer les vidéos. Veuillez réessayer.");
      }
    } catch (err) {
      console.error("Erreur lors de la suppression des vidéos:", err);
      setDeleteError("Une erreur s'est produite lors de la suppression des vidéos.");
    } finally {
      setDeleteLoading(false);
      setShowDeleteAllConfirm(false);
      
      // Masquer le message de succès après 3 secondes
      if (setDeleteSuccess) {
        setTimeout(() => {
          setDeleteSuccess(null);
        }, 3000);
      }
    }
  };

  // Nouvelle fonction pour ouvrir la modal avec l'URL signée de la vidéo
  const openVideoViewer = async (video: VideoItem) => {
    try {
      setViewingVideo(video);
      // Générer une URL signée pour la vidéo
      const signedUrl = await getSignedVideoUrl(video.key);
      if (signedUrl) {
        setSignedVideoUrl(signedUrl);
      } else {
        setError("Impossible de générer l&apos;URL d&apos;accès pour cette vidéo");
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de l&apos;URL signée:", err);
      setError("Erreur d&apos;accès à la vidéo");
    }
  };

  // Fonction pour copier l'URL de la vidéo dans le presse-papiers
  const copyVideoUrl = () => {
    if (!signedVideoUrl) return;
    
    navigator.clipboard.writeText(signedVideoUrl)
      .then(() => {
        setUrlCopied(true);
        // Reset the copied state after 2 seconds
        setTimeout(() => setUrlCopied(false), 2000);
      })
      .catch(err => {
        console.error("Erreur lors de la copie:", err);
        setError("Impossible de copier l'URL");
      });
  };

  // Fonction pour extraire un titre convivial à partir de la clé vidéo
  const getFormattedSongTitle = (videoKey: string): string => {
    try {
      // Extraire le nom de fichier (dernière partie du chemin)
      const filename = videoKey.split('/').pop() || '';
      
      // Extraire le song_id (partie avant le tiret et le timestamp)
      const songId = filename.split('-')[0];
      
      if (!songId) return "Vidéo";
      
      // Décoder l'URI du song_id pour avoir le chemin complet
      const decodedSongId = decodeURIComponent(songId);
      
      // Extraire le nom du fichier sans extension
      const songFilename = decodedSongId.split('/').pop() || '';
      const songNameWithoutExt = songFilename.replace(/\.(mp4|mp3|webm)$/, '');
      
      // Formater le nom pour qu'il soit plus lisible
      return songNameWithoutExt.replace(/_/g, ' ');
    } catch (error) {
      console.error("Erreur lors de l'extraction du titre:", error);
      return "Vidéo";
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-l-4 border-red-400 text-red-700">
        <p>{error}</p>
        <button 
          onClick={() => router.back()}
          className="mt-4 px-4 py-2 bg-white border border-red-400 rounded text-red-600 hover:bg-red-50"
        >
          Retour
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link 
          href={`/admin/events`} 
          className="text-blue-600 hover:text-blue-800 flex items-center"
        >
          <FiChevronLeft className="mr-1" /> Retour à l&apos;événement
        </Link>
        
        {videos.length > 0 && (
          <button 
            onClick={handleDeleteAllVideos}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
          >
            <FiTrash2 className="mr-2" /> Supprimer toutes les vidéos
          </button>
        )}
      </div>
      
      <h1 className="text-2xl font-semibold text-gray-800">
        Vidéos de l&apos;événement: {event?.name || id}
      </h1>

      {deleteSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md text-green-700 flex items-center">
          <FiCheck className="h-5 w-5 mr-2" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {deleteError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md text-red-700 flex items-center">
          <FiAlertTriangle className="h-5 w-5 mr-2" />
          <span>{deleteError}</span>
        </div>
      )}
      
      {videos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-gray-100">
            <FiVideo className="h-8 w-8 text-gray-500" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucune vidéo trouvée</h3>
          <p className="mt-2 text-base text-gray-500">
            Aucune vidéo n&apos;a été enregistrée pour cet événement ou le format de stockage n&apos;est pas compatible.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Les vidéos apparaîtront ici lorsque les participants utiliseront la fonctionnalité karaoké lors de l&apos;événement.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video, index) => {
            // Amélioration de l'extraction du nom de la chanson à partir du song_id
            const getSongNameFromKey = (key: string): string => {
              try {
                // Extrait le nom de fichier de la vidéo (dernière partie du chemin)
                const filename = key.split('/').pop() || '';
                
                // Extrait le song_id (partie avant le tiret et le timestamp)
                const songId = filename.split('-')[0];
                
                if (!songId) return `Vidéo ${index + 1}`;
                
                // Décode l'URI du song_id pour obtenir le chemin complet
                const decodedSongId = decodeURIComponent(songId);
                
                // Extrait le nom du fichier sans extension et sans chemin
                const songFilename = decodedSongId.split('/').pop() || '';
                const songNameWithoutExt = songFilename.replace(/\.(mp4|mp3|webm)$/, '');
                
                // Si le format est "titre-artiste", sépare-les et formate proprement
                if (songNameWithoutExt.includes('-')) {
                  const [title, artist] = songNameWithoutExt.split('-');
                  // Ajouter "Titre : " devant le nom de la chanson
                  return `Titre : ${title.trim()} - ${artist.trim()}`.replace(/_/g, ' ');
                }
                
                // Sinon retourne juste le nom de fichier formaté avec le préfixe "Titre : "
                return `Titre : ${songNameWithoutExt.replace(/_/g, ' ')}`;
              } catch (error) {
                console.error("Erreur lors de l'extraction du nom de la chanson:", error);
                return `Vidéo ${index + 1}`;
              }
            };
            
            // Utilise la nouvelle fonction pour obtenir un nom plus lisible
            const displayName = getSongNameFromKey(video.key);
            
            // Extraire la clé courte pour l'URL (juste le nom du fichier sans le chemin complet)
            const shortKey = video.key.split('/').pop() || '';
            
            return (
              <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div 
                  className="aspect-video bg-gray-100 relative cursor-pointer" 
                  onClick={() => router.push(`/admin/events/${id}/videos/${encodeURIComponent(shortKey)}`)}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-black/50 p-4">
                      <FiPlay className="h-10 w-10 text-white" />
                    </div>
                  </div>
                  
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white flex justify-between items-center">
                      <span className="text-sm font-medium truncate">{displayName}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 line-clamp-1">{displayName}</h3>
                  <p className="text-sm text-gray-500 mt-1 flex items-center">
                    <FiClock className="mr-1 h-4 w-4" />
                    {formatDate(video.dateCreated)}
                  </p>
                  <div className="mt-3 flex justify-between">
                    {/* Modifier le bouton "Voir" pour ouvrir la modal au lieu de naviguer */}
                    <button
                      onClick={() => openVideoViewer(video)}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <FiEye className="mr-1 h-4 w-4" /> Voir
                    </button>
                    
                    <a
                      href={video.url}
                      download
                      className="text-green-600 hover:text-green-800 text-sm flex items-center"
                    >
                      <FiDownload className="mr-1 h-4 w-4" /> Télécharger
                    </a>
                    
                    {/* Ajouter le bouton de suppression */}
                    <button
                      onClick={() => handleDeleteVideo(video)}
                      className="text-red-600 hover:text-red-800 text-sm flex items-center"
                    >
                      <FiTrash2 className="mr-1 h-4 w-4" /> Supprimer
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Modal de visualisation de la vidéo */}
      {viewingVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-black rounded-lg overflow-hidden relative">
            <div className="absolute top-2 right-2 z-10">
              <button 
                onClick={() => {
                  setViewingVideo(null);
                  setSignedVideoUrl(null);
                }} 
                className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            
            <div className="aspect-video">
              {!signedVideoUrl ? (
                <div className="w-full h-full flex items-center justify-center bg-black">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-white"></div>
                </div>
              ) : (
                <video 
                  src={signedVideoUrl} 
                  controls 
                  autoPlay
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            
            <div className="bg-black p-4">
              <h3 className="font-medium text-white">
                {/* Remplacer viewingVideo.title par le titre formaté */}
                Titre : {getFormattedSongTitle(viewingVideo.key)}
              </h3>
              <p className="text-gray-400 text-sm">
                Enregistré le {formatDate(viewingVideo.dateCreated)}
              </p>
              
              {/* URL copiable */}
              <div className="mt-3 flex items-center border border-gray-700 rounded overflow-hidden">
                <div className="flex-1 bg-gray-800 p-2 text-gray-300 text-sm overflow-hidden overflow-ellipsis whitespace-nowrap">
                  {signedVideoUrl || "Chargement de l'URL..."}
                </div>
                <button
                  onClick={copyVideoUrl}
                  disabled={!signedVideoUrl}
                  className={`p-2 text-white ${urlCopied ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  {urlCopied ? (
                    <span className="flex items-center">
                      <FiCheck className="mr-1" /> Copié
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <FiCopy className="mr-1" /> Copier
                    </span>
                  )}
                </button>
              </div>
              
              <div className="mt-3 flex justify-end">
                {/* Replace the anchor with disabled attribute */}
                {signedVideoUrl ? (
                  <a
                    href={signedVideoUrl}
                    download
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
                  >
                    <FiDownload className="mr-2" />
                    Télécharger
                  </a>
                ) : (
                  <span
                    className="bg-green-600 opacity-50 cursor-not-allowed text-white px-4 py-2 rounded flex items-center"
                  >
                    <FiDownload className="mr-2" />
                    Télécharger
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmation pour la suppression d'une vidéo */}
      {showDeleteConfirm && videoToDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg overflow-hidden">
            <div className="bg-red-600 p-4 flex justify-center">
              <FiAlertTriangle className="h-12 w-12 text-white" />
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Confirmer la suppression</h3>
              <p className="mb-4">Êtes-vous sûr de vouloir supprimer cette vidéo ? Cette action est irréversible.</p>
              
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmDeleteVideo}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm flex items-center"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Suppression...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" /> Supprimer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de confirmation pour la suppression de toutes les vidéos */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg overflow-hidden">
            <div className="bg-red-600 p-4 flex justify-center">
              <FiAlertTriangle className="h-12 w-12 text-white" />
            </div>
            
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">⚠️ Attention</h3>
              <p className="mb-4">Vous êtes sur le point de supprimer <span className="font-bold">toutes les vidéos</span> de cet événement.</p>
              <p className="mb-6 text-red-600 font-medium">Cette action est irréversible et définitive.</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmDeleteAllVideos}
                  className="px-4 py-3 bg-red-600 text-white rounded-md flex items-center justify-center"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Suppression en cours...
                    </>
                  ) : (
                    <>
                      <FiTrash2 className="mr-2" /> Oui, supprimer toutes les vidéos
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => setShowDeleteAllConfirm(false)}
                  className="px-4 py-3 border border-gray-300 rounded-md"
                  disabled={deleteLoading}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Disclaimer RGPD et droit à l'image */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-8 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">Important - Conformité légale</h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">
                <strong>RGPD et droit à l&apos;image :</strong> Veuillez vous assurer que tous les utilisateurs dont les vidéos sont visionnées ont explicitement consenti au traitement de leurs données personnelles et à l&apos;utilisation de leur image, conformément au Règlement Général sur la Protection des Données (RGPD) et au droit à l&apos;image.
              </p>
              <p>
                L&apos;accès à ces vidéos doit être strictement limité aux personnes autorisées. En cas de demande de suppression par un utilisateur, vous êtes tenu de retirer rapidement la vidéo concernée de votre système.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

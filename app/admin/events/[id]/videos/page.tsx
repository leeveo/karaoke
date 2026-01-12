'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getEventVideos, VideoItem, getSignedVideoUrl, deleteS3Video, deleteAllEventVideos } from '@/services/s3Service';
import { fetchEventById } from '@/lib/supabase/events';
import Link from 'next/link';
import { Event } from '@/types/event';
import { FiDownload, FiEye, FiChevronLeft, FiVideo, FiX, FiTrash2, FiAlertTriangle, FiCheck, FiCopy } from 'react-icons/fi';

export default function EventVideosAdminPage() {
  const { id } = useParams();
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
  
  // Nouveaux états pour batch email
  const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
  const [showBatchEmailConfirm, setShowBatchEmailConfirm] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [batchEmailError, setBatchEmailError] = useState<string | null>(null);
  const [batchEmailSuccess, setBatchEmailSuccess] = useState<string | null>(null);

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

  // Fonction pour toggle la sélection d'une vidéo
  const toggleVideoSelection = (videoKey: string) => {
    const newSelected = new Set(selectedVideos);
    if (newSelected.has(videoKey)) {
      newSelected.delete(videoKey);
    } else {
      newSelected.add(videoKey);
    }
    setSelectedVideos(newSelected);
  };

  // Fonction pour envoyer les emails batch
  const handleSendBatchEmails = () => {
    if (selectedVideos.size === 0) {
      setBatchEmailError("Aucune vidéo sélectionnée");
      return;
    }
    setShowBatchEmailConfirm(true);
  };

  // Fonction pour confirmer et envoyer les emails
  const confirmSendBatchEmails = async () => {
    try {
      setIsSendingEmails(true);
      setBatchEmailError(null);
      setBatchEmailSuccess(null);

      // Préparer les vidéos sélectionnées avec leurs emails
      const videosToEmail = videos.filter(v => selectedVideos.has(v.key));
      
      // Grouper par email
      const emailGroups: { [email: string]: VideoItem[] } = {};
      for (const video of videosToEmail) {
        // Utiliser l'email du service, sinon l'email extrait du nom de fichier, sinon fallback
        const email = video.userEmail || getEmailFromKey(video.key) || 'unknown@example.com';
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(video);
      }

      // Appeler l'API pour envoyer les emails
      const response = await fetch('/api/admin/send-batch-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: id,
          emailGroups: emailGroups
        })
      });

      const result = await response.json();

      if (response.ok) {
        setBatchEmailSuccess(`✅ ${result.videosCount || result.successCount} vidéo(s) envoyée(s) avec succès!`);
        setSelectedVideos(new Set());
        setShowBatchEmailConfirm(false);
        
        // Réinitialiser le message après 5 secondes
        setTimeout(() => setBatchEmailSuccess(null), 5000);
      } else {
        setBatchEmailError(result.error || 'Erreur lors de l\'envoi des emails');
      }
    } catch (err) {
      console.error('Erreur lors de l\'envoi batch:', err);
      setBatchEmailError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsSendingEmails(false);
    }
  };

  // Fonction pour extraire l'email du filename
  const getEmailFromKey = (key: string): string | undefined => {
    try {
      const filename = key.split('/').pop() || '';
      
      // Format: songPath_email-timestamp.webm (email can be literal or URL-encoded)
      if (filename.includes('_')) {
        const parts = filename.split('_');
        if (parts.length >= 2) {
          const emailTimestampPart = parts[1];
          // Email is before the first hyphen followed by digits (the timestamp)
          const emailMatch = emailTimestampPart.match(/^(.+?)-\d+\.webm$/);
          if (emailMatch) {
            let email = emailMatch[1]; // Get the email part
            // Decode if it contains URL-encoded characters (e.g., %40 for @)
            if (email.includes('%')) {
              email = decodeURIComponent(email);
            }
            return email;
          }
        }
      }
      
      return undefined;
    } catch (error) {
      console.error("Erreur lors de l'extraction de l'email:", error);
      return undefined;
    }
  };

  // Fonction pour extraire le titre de la vidéo à partir de la clé
  const getSongNameFromKey = (key: string): string => {
    try {
      const filename = key.split('/').pop() || '';
      console.log('🔍 getSongNameFromKey - filename:', filename);
      
      // NOUVEAU FORMAT: songPath_emailEncoded-timestamp.webm
      if (filename.includes('_')) {
        console.log('📋 Nouveau format détecté (avec _)');
        const parts = filename.split('_');
        const songPathPart = parts[0];
        
        // Décode DEUX FOIS (double encoding)
        let decodedPath = decodeURIComponent(songPathPart);
        console.log('✅ First decode:', decodedPath);
        
        decodedPath = decodeURIComponent(decodedPath);
        console.log('✅ Second decode:', decodedPath);
        
        // Extrait juste le dernier segment après le dernier /
        let songNameFull = decodedPath.split('/').pop() || '';
        console.log('📝 Song name full (before timestamp removal):', songNameFull);
        
        // Enlève le timestamp qui pourrait être attaché au .mp4
        songNameFull = songNameFull.replace(/\.mp4-\d+$/, '');
        console.log('📝 Song name full (after timestamp removal):', songNameFull);
        
        return formatSongName(songNameFull);
      } 
      // ANCIEN FORMAT: Karaokesaas%2fanglais%2ftitle-artist-category.mp4-timestamp.webm
      else {
        console.log('📋 Ancien format détecté (sans _)');
        
        // Décode TOUT le filename
        const decoded = decodeURIComponent(filename);
        console.log('✅ Decoded filename:', decoded);
        
        // Enlève le timestamp et l'extension: .mp4-TIMESTAMP.webm → rien
        let withoutExt = decoded.replace(/\.mp4-\d+\.webm$/, '');
        console.log('📝 After removing .mp4-timestamp.webm:', withoutExt);
        
        // Si ça n'a pas marché, essaie juste d'enlever l'extension
        if (withoutExt === decoded) {
          withoutExt = decoded.replace(/\.(mp4|mp3|webm)(-\d+)?$/, '');
          console.log('📝 Fallback - After extension removal:', withoutExt);
        }
        
        // Extrait le dernier segment après le dernier /
        const lastSegment = withoutExt.split('/').pop() || '';
        console.log('📝 Last segment:', lastSegment);
        
        // Enlève la catégorie (dernier mot après tiret)
        // Pattern: "title - artist-category" -> enlever "-category"
        const noCategory = lastSegment.replace(/-[a-z]+$/i, '');
        console.log('📝 Without category:', noCategory);
        
        return formatSongName(noCategory);
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'extraction du nom:", error);
      return 'Vidéo';
    }
  };

  // Fonction helper pour formater le nom de la chanson
  const formatSongName = (songName: string): string => {
    if (!songName) return 'Vidéo';
    
    console.log('🎵 formatSongName input:', songName);
    
    // Remplacer les # par des - (certains fichiers utilisent # comme séparateur)
    songName = songName.replace(/#/g, '-');
    
    // Supprimer les catégories répétées à la fin (ex: "Title - Artist - anglais - anglais.mp4")
    // Patterns à supprimer: "-anglais", "-francais", etc. et .mp4
    songName = songName
      .replace(/-(anglais|francais|espanol|deutsch|italiano|portugues|chinese|japanese|korean)$/i, '')
      .replace(/-(anglais|francais|espanol|deutsch|italiano|portugues|chinese|japanese|korean)-\1$/i, '-$1')
      .replace(/\.mp4$/i, '');
    
    // Split par tiret pour séparer titre et artiste
    // Pattern attendu: "Title - Artist"
    if (songName.includes('-')) {
      const parts = songName.split('-');
      const title = parts[0].trim();
      const artist = parts.slice(1).join('-').trim();
      
      console.log('🎬 Title:', title, '🎤 Artist:', artist);
      
      // Formater chaque partie
      const formattedTitle = capitalizeWords(title);
      const formattedArtist = capitalizeWords(artist);
      
      const result = `${formattedTitle} - ${formattedArtist}`;
      console.log('✨ Final result:', result);
      return result;
    }
    
    // Si pas de tiret
    const result = capitalizeWords(songName);
    console.log('✨ Final result (no dash):', result);
    return result;
  };

  // Fonction helper pour capitaliser les mots
  const capitalizeWords = (str: string): string => {
    return str
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  };

  // Fonction pour extraire un titre convivial à partir de la clé vidéo
  const getFormattedSongTitle = (videoKey: string): string => {
    try {
      // Extraire le nom de fichier (dernière partie du chemin)
      const filename = videoKey.split('/').pop() || '';
      
      // Split par _ pour séparer le titre du email et du timestamp
      // Format: songPathEncoded_emailEncoded-timestamp.webm
      const parts = filename.split('_');
      
      if (parts.length === 0) return "Vidéo";
      
      // Première partie = le chemin de la chanson encodé
      const encodedSongPath = parts[0];
      
      // Décode l'URI pour obtenir le chemin complet
      const decodedSongPath = decodeURIComponent(encodedSongPath);
      
      // Extrait SEULEMENT le dernier segment (le nom de la chanson)
      const songName = decodedSongPath.split('/').pop() || '';
      
      if (!songName) return "Vidéo";
      
      // Retire l'extension du fichier
      const songNameWithoutExt = songName.replace(/\.(mp4|mp3|webm)$/, '');
      
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
        
        <div className="flex gap-3">
          {selectedVideos.size > 0 && (
            <button 
              onClick={handleSendBatchEmails}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              ✉️ Envoyer {selectedVideos.size} email(s)
            </button>
          )}
          
          {videos.length > 0 && (
            <button 
              onClick={handleDeleteAllVideos}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center"
            >
              <FiTrash2 className="mr-2" /> Supprimer toutes les vidéos
            </button>
          )}
        </div>
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
      
      {batchEmailSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md text-green-700 flex items-center">
          <FiCheck className="h-5 w-5 mr-2" />
          <span>{batchEmailSuccess}</span>
        </div>
      )}

      {batchEmailError && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-md text-red-700 flex items-center">
          <FiAlertTriangle className="h-5 w-5 mr-2" />
          <span>{batchEmailError}</span>
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
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Titre</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date/Heure</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {videos.map((video, index) => {
                  const displayName = getSongNameFromKey(video.key);
                  const emailFromFilename = getEmailFromKey(video.key);
                  const displayEmail = video.userEmail || emailFromFilename || '-';
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="font-medium truncate max-w-xs" title={displayName}>
                          {displayName}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="truncate max-w-xs" title={displayEmail}>
                          {displayEmail}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                        {formatDate(video.dateCreated)}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => openVideoViewer(video)}
                            className="text-blue-600 hover:text-blue-800 font-medium flex items-center text-xs sm:text-sm"
                            title="Voir la vidéo"
                          >
                            <FiEye className="mr-1 h-4 w-4" /> 
                            <span className="hidden sm:inline">Voir</span>
                          </button>
                          
                          
                          <a
                            href={video.url}
                            download
                            className="text-green-600 hover:text-green-800 font-medium flex items-center text-xs sm:text-sm"
                            title="Télécharger la vidéo"
                          >
                            <FiDownload className="mr-1 h-4 w-4" />
                            <span className="hidden sm:inline">DL</span>
                          </a>
                          
                          <button
                            onClick={() => handleDeleteVideo(video)}
                            className="text-red-600 hover:text-red-800 font-medium flex items-center text-xs sm:text-sm"
                            title="Supprimer la vidéo"
                          >
                            <FiTrash2 className="h-4 w-4" />
                          </button>
                          
                          <input
                            type="checkbox"
                            checked={selectedVideos.has(video.key)}
                            onChange={() => toggleVideoSelection(video.key)}
                            className="w-4 h-4 cursor-pointer"
                            title="Sélectionner"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
      
      {/* Modal de confirmation pour l'envoi batch d'emails */}
      {showBatchEmailConfirm && selectedVideos.size > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg overflow-hidden">
            <div className="bg-blue-600 p-4 flex justify-center">
              <FiCheck className="h-12 w-12 text-white" />
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-medium mb-4">Confirmer l&apos;envoi des emails</h3>
              <p className="mb-4 text-gray-600">
                Êtes-vous sûr de vouloir envoyer <span className="font-bold">{selectedVideos.size}</span> email(s) avec les vidéos sélectionnées?
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Les utilisateurs recevront leurs vidéos directement par email.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmSendBatchEmails}
                  className="px-4 py-3 bg-blue-600 text-white rounded-md flex items-center justify-center hover:bg-blue-700"
                  disabled={isSendingEmails}
                >
                  {isSendingEmails ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      ✉️ Envoyer les emails
                    </>
                  )}
                </button>
                
                <button 
                  onClick={() => setShowBatchEmailConfirm(false)}
                  className="px-4 py-3 border border-gray-300 rounded-md"
                  disabled={isSendingEmails}
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

import { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage';
const BASE_PATH = 'karaokesaas';

// Client S3 pour les opérations de vidéo côté client (avec credentials publiques)
// Note: Pour les chansons, on utilise l'API route côté serveur
const getS3ClientForVideos = () => {
  // On vérifie si on a les credentials côté client
  if (typeof window !== 'undefined') {
    return new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
      },
    });
  }
  // Côté serveur, on utilise les credentials sans préfixe
  return new S3Client({
    region: process.env.AWS_REGION || process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

export interface Song {
  key: string;
  title: string;
  artist: string;
  size?: number;
  lastModified?: Date;
  imageUrl?: string;
}

// Fonction améliorée pour extraire le titre et l'artiste du nom de fichier
function parseFileName(fileName: string): { title: string; artist: string } {
  // Supprimer l'extension de fichier
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  
  // Diviser par tirets
  const parts = nameWithoutExt.split('-');
  
  if (parts.length >= 2) {
    // Première partie = titre, deuxième partie = artiste
    // Parfois le format peut être titre-artiste-catégorie_nomFichier
    const title = parts[0].trim();
    const artist = parts[1].trim().split('_')[0]; // Enlever tout ce qui suit un underscore
    
    // Capitaliser la première lettre
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      artist: artist.charAt(0).toUpperCase() + artist.slice(1)
    };
  }
  
  // Fallback si le format n'est pas celui attendu
  return {
    title: nameWithoutExt,
    artist: 'Artiste inconnu'
  };
}

export async function getCategories(): Promise<string[]> {
  try {
    console.log("Service S3: Récupération des catégories via API");
    
    // Vérifier d'abord si nous avons des catégories en cache
    if (typeof window !== 'undefined') {
      const cachedCategories = sessionStorage.getItem('s3-categories');
      if (cachedCategories) {
        console.log("Utilisation des catégories en cache");
        return JSON.parse(cachedCategories);
      }
    }
    
    // Appel à l'API route côté serveur
    const response = await fetch('/api/songs?action=categories');
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des catégories');
    }
    
    const categories = await response.json();
    
    console.log("Catégories trouvées:", categories);
    
    // Mettre en cache les catégories pour les futurs appels
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('s3-categories', JSON.stringify(categories));
    }
    
    return categories;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    // Utiliser des catégories par défaut en cas d'erreur
    return ['pop', 'rock', 'rap', 'français', 'anglais', 'latino'];
  }
}

export async function getSongsByCategory(category: string): Promise<Song[]> {
  try {
    console.log(`Récupération des chansons pour la catégorie: ${category}`);
    
    // Appel à l'API route côté serveur
    const response = await fetch(`/api/songs?action=songs&category=${encodeURIComponent(category)}`);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des chansons: ${response.statusText}`);
    }
    
    const songs = await response.json();
    console.log(`${songs.length} chansons trouvées pour ${category}`);
    
    return songs;
  } catch (error) {
    console.error('Erreur lors de la récupération des chansons:', error);
    throw error;
  }
}

// Fonction pour obtenir une URL de chanson signée
export async function getSongUrl(key: string): Promise<string> {
  try {
    console.log(`Demande d'URL signée pour: ${key}`);
    
    // Vérifier le cache d'abord
    if (typeof window !== 'undefined') {
      const cachedUrl = sessionStorage.getItem(`s3-url-${key}`);
      if (cachedUrl) {
        console.log("Utilisation de l'URL en cache:", cachedUrl);
        return cachedUrl;
      }
    }
    
    // Appel à l'API route pour obtenir une URL signée
    const response = await fetch(`/api/songs?action=url&key=${encodeURIComponent(key)}`);
    
    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de l'URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    const url = data.url;
    
    console.log(`URL signée générée: ${url}`);
    
    // Cache l'URL réussie pour référence future
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(`s3-url-${key}`, url);
      } catch (e) {
        console.warn("Impossible de mettre en cache l'URL:", e);
      }
    }
    
    return url;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL de la chanson:', error);
    
    // Tenter de récupérer une URL précédemment mise en cache
    if (typeof window !== 'undefined') {
      try {
        const cachedUrl = sessionStorage.getItem(`s3-url-${key}`);
        if (cachedUrl) {
          console.log("Utilisation de l'URL en cache après erreur:", cachedUrl);
          return cachedUrl;
        }
      } catch (e) {
        // Ignorer les erreurs de session storage
      }
    }
    
    // Fallback: retourner une URL directe même en cas d'erreur
    return `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3'}.amazonaws.com/${key}`;
  }
}

export interface VideoItem {
  key: string;
  url: string;
  title?: string;
  timestamp: number;
  dateCreated: Date;
}

export async function getEventVideos(eventId: string): Promise<VideoItem[]> {
  try {
    console.log(`Recherche des vidéos pour l'événement: ${eventId}`);
    
    const s3Client = getS3ClientForVideos();
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `karaoke-videos/event_${eventId}/`
    });

    const response = await s3Client.send(command);
    const videos: VideoItem[] = [];
    
    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key && item.Key.endsWith('.webm')) {
          // Format: karaoke-videos/event_[eventId]/[sessionId]-[timestamp].webm
          const keyParts = item.Key.split('/');
          const filename = keyParts[keyParts.length - 1];
          const [sessionId, timestampStr] = filename.split('-');
          const timestamp = parseInt(timestampStr?.replace('.webm', '') || '0');
          
          const url = `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3'}.amazonaws.com/${item.Key}`;
          
          videos.push({
            key: item.Key,
            url: url,
            title: sessionId,
            timestamp: timestamp,
            dateCreated: item.LastModified || new Date()
          });
        }
      }
      
      // Trier par date de création (plus récent en premier)
      videos.sort((a, b) => b.timestamp - a.timestamp);
    }
    
    console.log(`Trouvé ${videos.length} vidéos pour l'événement ${eventId}`);
    return videos;
  } catch (error) {
    console.error(`Erreur lors de la récupération des vidéos pour l'événement ${eventId}:`, error);
    throw error;
  }
}

/**
 * Génère une URL signée pour accéder à une vidéo spécifique sur S3
 * @param videoPath Chemin complet de la vidéo dans le bucket S3
 * @returns URL signée valide pour 1 heure
 */
export async function getSignedVideoUrl(videoPath: string): Promise<string | null> {
  try {
    const s3Client = getS3ClientForVideos();

    const command = new GetObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage',
      Key: videoPath,
    });

    // URL signée valide pendant 1 heure (3600 secondes)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
    
    return signedUrl;
  } catch (error) {
    console.error("Erreur lors de la génération de l'URL signée:", error);
    return null;
  }
}

/**
 * Supprime une vidéo spécifique du bucket S3
 * @param videoKey Clé S3 de la vidéo à supprimer
 * @returns true si la suppression a réussi, false sinon
 */
export async function deleteS3Video(videoKey: string): Promise<boolean> {
  try {
    console.log(`Suppression de la vidéo: ${videoKey}`);
    const s3Client = getS3ClientForVideos();
    
    const command = new DeleteObjectCommand({
      Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage',
      Key: videoKey,
    });

    await s3Client.send(command);
    console.log(`Vidéo supprimée avec succès: ${videoKey}`);
    return true;
  } catch (error) {
    console.error("Erreur lors de la suppression de la vidéo:", error);
    return false;
  }
}

/**
 * Supprime toutes les vidéos d'un événement spécifique
 * @param eventId ID de l'événement dont les vidéos doivent être supprimées
 * @returns Objet indiquant le succès et le nombre de vidéos supprimées
 */
export async function deleteAllEventVideos(eventId: string): Promise<{
  success: boolean;
  deletedCount: number;
}> {
  try {
    console.log(`Suppression de toutes les vidéos de l'événement: ${eventId}`);
    
    // 1. Lister toutes les vidéos de l'événement
    const videos = await getEventVideos(eventId);
    
    if (videos.length === 0) {
      return { success: true, deletedCount: 0 };
    }
    
    // 2. Supprimer chaque vidéo
    let deletedCount = 0;
    const s3Client = getS3ClientForVideos();
    
    for (const video of videos) {
      try {
        const command = new DeleteObjectCommand({
          Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage',
          Key: video.key,
        });
        
        await s3Client.send(command);
        deletedCount++;
        console.log(`Vidéo supprimée: ${video.key} (${deletedCount}/${videos.length})`);
      } catch (error) {
        console.error(`Erreur lors de la suppression de la vidéo ${video.key}:`, error);
      }
    }
    
    return { 
      success: deletedCount === videos.length,
      deletedCount 
    };
  } catch (error) {
    console.error(`Erreur lors de la suppression des vidéos de l'événement ${eventId}:`, error);
    return { success: false, deletedCount: 0 };
  }
}
import { S3Client, GetObjectCommand, ListObjectsV2Command, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuration du client S3
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET || 'leeveostockage';
const BASE_PATH = 'karaokesaas';

export interface Song {
  key: string;
  title: string;
  artist: string;
  size?: number;
  lastModified?: Date;
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
    console.log("Service S3: Récupération des catégories");
    // Vérifier d'abord si nous avons des catégories en cache
    const cachedCategories = sessionStorage.getItem('s3-categories');
    if (cachedCategories) {
      console.log("Utilisation des catégories en cache");
      return JSON.parse(cachedCategories);
    }
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BASE_PATH + '/',
      Delimiter: '/'
    });

    const response = await s3Client.send(command);
    const categories: string[] = [];

    if (response.CommonPrefixes && response.CommonPrefixes.length > 0) {
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const category = prefix.Prefix.replace(BASE_PATH + '/', '').replace('/', '');
          if (category) {
            categories.push(category);
          }
        }
      }
      
      console.log("Catégories trouvées:", categories);
      // Mettre en cache les catégories pour les futurs appels
      sessionStorage.setItem('s3-categories', JSON.stringify(categories));
      
      return categories;
    } else {
      console.warn("Aucun préfixe commun trouvé pour les catégories");
      // Utiliser des catégories par défaut en cas d'erreur
      const defaultCategories = ['pop', 'rock', 'rap', 'français', 'anglais', 'latino'];
      return defaultCategories;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    // Utiliser des catégories par défaut en cas d'erreur
    return ['pop', 'rock', 'rap', 'français', 'anglais', 'latino'];
  }
}

export async function getSongsByCategory(category: string): Promise<Song[]> {
  try {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: `${BASE_PATH}/${category}/`
    });

    const response = await s3Client.send(command);
    const songs: Song[] = [];

    if (response.Contents) {
      for (const item of response.Contents) {
        // Ne pas inclure le dossier lui-même ou les fichiers cachés
        if (item.Key && 
            item.Key !== `${BASE_PATH}/${category}/` && 
            !item.Key.split('/').pop()?.startsWith('.')) {
          
          const fileName = item.Key.split('/').pop() || '';
          const { title, artist } = parseFileName(fileName);
          
          songs.push({
            key: item.Key,
            title,
            artist,
            size: item.Size,
            lastModified: item.LastModified
          });
        }
      }
    }

    return songs;
  } catch (error) {
    console.error('Erreur lors de la récupération des chansons:', error);
    throw error;
  }
}

// Fonction pour obtenir une URL de chanson
export async function getSongUrl(key: string): Promise<string> {
  try {
    console.log(`Demande d'URL pour: ${key}`);
    
    // Générer l'URL directement sans vérifier l'existence (évite les problèmes CORS)
    const url = `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3'}.amazonaws.com/${key}`;
    console.log(`URL générée: ${url}`);
    
    // Cache l'URL réussie pour référence future
    try {
      sessionStorage.setItem(`s3-url-${key}`, url);
    } catch (e) {
      console.warn("Impossible de mettre en cache l'URL:", e);
    }
    
    return url;
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'URL de la chanson:', error);
    
    // Tenter de récupérer une URL précédemment mise en cache
    try {
      const cachedUrl = sessionStorage.getItem(`s3-url-${key}`);
      if (cachedUrl) {
        console.log("Utilisation de l'URL en cache:", cachedUrl);
        return cachedUrl;
      }
    } catch (e) {
      // Ignorer les erreurs de session storage
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
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
      },
    });

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
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
      },
    });
    
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
    const s3Client = new S3Client({
      region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
      credentials: {
        accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
      },
    });
    
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
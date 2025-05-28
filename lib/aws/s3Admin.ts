import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Modèle pour les éléments S3
export interface S3Item {
  key: string;
  type: 'folder' | 'file';
  name: string;
  category?: string;
  path: string;
  url?: string; // Propriété URL ajoutée
  size?: number;
  lastModified?: Date;
}

// Configuration du client S3
const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_S3_BUCKET || 'leeveostockage';
const BASE_PREFIX = 'karaokesaas/';

// Récupère toutes les catégories (dossiers de premier niveau)
export async function getS3Categories(): Promise<S3Item[]> {
  try {
    console.log("Récupération des catégories depuis S3...");
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: BASE_PREFIX,
      Delimiter: '/'
    });

    const response = await s3Client.send(command);
    console.log("Réponse S3:", response);
    
    const categories: S3Item[] = [];
    
    if (response.CommonPrefixes) {
      console.log(`${response.CommonPrefixes.length} catégories trouvées`);
      for (const prefix of response.CommonPrefixes) {
        if (prefix.Prefix) {
          const key = prefix.Prefix;
          const name = key.replace(BASE_PREFIX, '').replace('/', '');
          
          // Ignorer les dossiers vides ou les dossiers dont le nom commence par un point
          if (name && !name.startsWith('.')) {
            categories.push({
              key,
              type: 'folder',
              name,
              path: key,
            });
            console.log(`Catégorie ajoutée: ${name}`);
          }
        }
      }
    } else {
      console.warn("Aucune catégorie trouvée (CommonPrefixes vide)");
    }
    
    return categories;
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories S3:', error);
    throw error;
  }
}

// Récupère tous les fichiers d'une catégorie
export async function getS3SongsByCategory(category: string): Promise<S3Item[]> {
  try {
    const prefix = `${BASE_PREFIX}${category}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix
    });

    const response = await s3Client.send(command);
    const songs: S3Item[] = [];
    
    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key && item.Key !== prefix) {
          const key = item.Key;
          const name = key.replace(prefix, '');
          
          // Ne pas inclure les fichiers cachés
          if (!name.startsWith('.')) {
            // Générer l'URL directement
            const url = `https://${BUCKET_NAME}.s3.${process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3'}.amazonaws.com/${key}`;
            
            songs.push({
              key,
              type: 'file',
              name,
              category,
              path: key,
              url: url, // Ajouter l'URL directement
              size: item.Size,
              lastModified: item.LastModified
            });
          }
        }
      }
    }
    
    return songs;
  } catch (error) {
    console.error(`Erreur lors de la récupération des chansons pour la catégorie ${category}:`, error);
    throw error;
  }
}

// Récupère tous les fichiers de toutes les catégories
export async function getAllS3Songs(): Promise<S3Item[]> {
  try {
    const categories = await getS3Categories();
    const allSongs: S3Item[] = [];
    
    for (const category of categories) {
      const songs = await getS3SongsByCategory(category.name);
      allSongs.push(...songs);
    }
    
    return allSongs;
  } catch (error) {
    console.error('Erreur lors de la récupération de toutes les chansons S3:', error);
    throw error;
  }
}

// Supprime un fichier
export async function deleteS3Song(key: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error(`Erreur lors de la suppression du fichier ${key}:`, error);
    throw error;
  }
}

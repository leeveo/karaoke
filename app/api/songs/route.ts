import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Configuration du client S3 côté serveur (sécurisé)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
  requestHandler: {
    requestTimeout: 10000, // Timeout de 10 secondes
  },
  maxAttempts: 3, // Retry jusqu'à 3 fois
});

const BUCKET_NAME = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage';
const BASE_PATH = 'karaokesaas';

// Configuration pour Next.js
export const maxDuration = 30; // 30 secondes max
export const dynamic = 'force-dynamic';

interface Song {
  key: string;
  title: string;
  artist: string;
  size?: number;
  lastModified?: Date;
  imageUrl?: string;
  categoryId?: string;
}

function parseFileName(fileName: string): { title: string; artist: string } {
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
  const parts = nameWithoutExt.split('-');
  
  if (parts.length >= 2) {
    const title = parts[0].trim();
    const artist = parts[1].trim().split('_')[0];
    
    return {
      title: title.charAt(0).toUpperCase() + title.slice(1),
      artist: artist.charAt(0).toUpperCase() + artist.slice(1)
    };
  }
  
  return {
    title: nameWithoutExt,
    artist: 'Artiste inconnu'
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const category = searchParams.get('category');
    const songKey = searchParams.get('key');

    console.log(`[API Songs] Action: ${action}, Category: ${category}, Key: ${songKey}`);
    console.log(`[API Songs] AWS Config - Region: ${process.env.AWS_REGION}, Bucket: ${BUCKET_NAME}`);
    console.log(`[API Songs] AWS Credentials - AccessKeyId présent: ${!!process.env.AWS_ACCESS_KEY_ID}`);

    // Action: Récupérer les catégories
    if (action === 'categories') {
      console.log(`[API Songs] Récupération des catégories...`);
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
            const cat = prefix.Prefix.replace(BASE_PATH + '/', '').replace('/', '');
            if (cat) {
              categories.push(cat);
            }
          }
        }
      }

      if (categories.length === 0) {
        console.log(`[API Songs] Aucune catégorie trouvée, utilisation des valeurs par défaut`);
        return NextResponse.json(['pop', 'rock', 'rap', 'français', 'anglais', 'latino']);
      }

      console.log(`[API Songs] ${categories.length} catégories trouvées:`, categories);
      return NextResponse.json(categories);
    }

    // Action: Récupérer les chansons d'une catégorie
    if (action === 'songs' && category) {
      console.log(`[API Songs] Récupération des chansons pour: ${category}`);
      const command = new ListObjectsV2Command({
        Bucket: BUCKET_NAME,
        Prefix: `${BASE_PATH}/${category}/`
      });

      const response = await s3Client.send(command);
      const songs: Song[] = [];
      const fileMap = new Map<string, { video?: { Key?: string; LastModified?: Date; Size?: number }; image?: string }>();

      // Premier passage : regrouper les fichiers vidéo et image
      if (response.Contents) {
        for (const item of response.Contents) {
          if (item.Key && 
              item.Key !== `${BASE_PATH}/${category}/` && 
              !item.Key.split('/').pop()?.startsWith('.')) {
            
            const fileName = item.Key.split('/').pop() || '';
            const baseName = fileName.replace(/\.(mp4|png|jpg|jpeg)$/i, '');
            
            if (!fileMap.has(baseName)) {
              fileMap.set(baseName, {});
            }
            
            const fileData = fileMap.get(baseName)!;
            
            if (fileName.match(/\.mp4$/i)) {
              fileData.video = {
                Key: item.Key,
                LastModified: item.LastModified,
                Size: item.Size
              };
            } else if (fileName.match(/\.(jpg|jpeg|png)$/i)) {
              // Construire l'URL de l'image - donner la priorité aux JPG
              const imageUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-west-3'}.amazonaws.com/${item.Key}`;
              
              // Ne remplacer l'image que si c'est un JPG/JPEG ou si on n'a pas encore d'image
              if (fileName.match(/\.(jpg|jpeg)$/i) || !fileData.image) {
                fileData.image = imageUrl;
              }
            }
          }
        }
      }

      // Deuxième passage : créer les objets Song
      for (const [baseName, fileData] of fileMap.entries()) {
        if (fileData.video && fileData.video.Key) {
          const { title, artist } = parseFileName(baseName);
          
          songs.push({
            key: fileData.video.Key,
            title,
            artist,
            size: fileData.video.Size,
            lastModified: fileData.video.LastModified,
            imageUrl: fileData.image,
            categoryId: category
          });
        }
      }

      console.log(`[API Songs] ${songs.length} chansons trouvées pour ${category}`);
      return NextResponse.json(songs);
    }

    // Action: Obtenir une URL signée pour une chanson
    if (action === 'url' && songKey) {
      console.log(`[API Songs] Génération d'URL signée pour: ${songKey}`);
      const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: songKey,
      });

      // Générer une URL signée valide pour 1 heure
      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      console.log(`[API Songs] URL signée générée avec succès`);
      
      return NextResponse.json({ url: signedUrl });
    }

    console.warn(`[API Songs] Action non valide: ${action}`);
    return NextResponse.json(
      { error: 'Action non valide' },
      { status: 400 }
    );
  } catch (error: unknown) {
    const err = error as Error & { $metadata?: { httpStatusCode?: number; requestId?: string }; message?: string };
    console.error('[API Songs] Erreur:', err);
    console.error('[API Songs] Détails:', {
      name: err.name,
      message: err.message,
      code: err.$metadata?.httpStatusCode,
      requestId: err.$metadata?.requestId
    });
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des données',
        details: err.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

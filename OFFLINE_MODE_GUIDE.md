# Guide de Mise en Place du Mode Hors-Ligne (Offline Mode)

Ce guide détaille la stratégie et les scripts nécessaires pour transformer l'application Karaoke Web App en une version "Local First" capable de fonctionner sans connexion internet lors d'événements, avec une synchronisation différée des données.

## Architecture Globale

1.  **Contenu (Chansons/Images)** : Téléchargé localement depuis S3 avant l'événement.
2.  **Base de données** : Remplacée par un fichier JSON statique généré avant l'événement.
3.  **Uploads Utilisateurs** : Sauvegardés sur le disque dur du serveur pendant l'événement.
4.  **Synchronisation** : Un script post-événement envoie les vidéos sur S3 et les emails via Brevo une fois la connexion rétablie.

---

## Phase 1 : Préparation (Avant l'événement)

### 1. Script de téléchargement des assets (`scripts/download-assets.js`)

Ce script va cloner votre bucket S3 (dossier `karaokesaas`) vers le dossier `public/local-assets` de votre application.

```javascript
// scripts/download-assets.js
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { pipeline } = require('stream/promises');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;
const PREFIX = 'karaokesaas/'; // Dossier source sur S3
const LOCAL_DIR = path.join(__dirname, '../public/local-assets');

async function downloadAssets() {
  console.log('🚀 Démarrage du téléchargement des assets...');

  let continuationToken = undefined;
  
  do {
    const command = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    
    for (const item of response.Contents || []) {
      if (item.Key.endsWith('/')) continue; // Ignorer les dossiers

      const relativePath = item.Key.replace(PREFIX, '');
      const localPath = path.join(LOCAL_DIR, relativePath);
      const dirName = path.dirname(localPath);

      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }

      if (!fs.existsSync(localPath)) {
        console.log(`⬇️ Téléchargement: ${item.Key}`);
        const getCommand = new GetObjectCommand({ Bucket: BUCKET, Key: item.Key });
        const data = await s3Client.send(getCommand);
        await pipeline(data.Body, fs.createWriteStream(localPath));
      } else {
        console.log(`✅ Déjà présent: ${item.Key}`);
      }
    }
    
    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  console.log('✨ Téléchargement terminé !');
}

downloadAssets().catch(console.error);
```

### 2. Script de génération de la liste des chansons (`scripts/generate-offline-songs.js`)

Ce script scanne le dossier local pour créer un fichier JSON que l'application utilisera à la place de l'API S3/Supabase.

```javascript
// scripts/generate-offline-songs.js
const fs = require('fs');
const path = require('path');

const LOCAL_DIR = path.join(__dirname, '../public/local-assets');
const OUTPUT_FILE = path.join(__dirname, '../src/data/offline-songs.json');

function scanSongs() {
  const categories = fs.readdirSync(LOCAL_DIR);
  const songs = [];

  categories.forEach(category => {
    const catPath = path.join(LOCAL_DIR, category);
    if (fs.statSync(catPath).isDirectory()) {
      const files = fs.readdirSync(catPath);
      
      files.forEach(file => {
        if (file.endsWith('.mp4')) {
          const nameWithoutExt = file.replace('.mp4', '');
          // Vérifier si l'image existe
          const hasImage = fs.existsSync(path.join(catPath, nameWithoutExt + '.png'));
          
          songs.push({
            key: `local-assets/${category}/${file}`,
            name: file,
            category: category,
            image: hasImage ? `local-assets/${category}/${nameWithoutExt}.png` : null,
            localUrl: `/local-assets/${category}/${file}`
          });
        }
      });
    }
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(songs, null, 2));
  console.log(`📝 ${songs.length} chansons indexées dans ${OUTPUT_FILE}`);
}

scanSongs();
```

---

## Phase 2 : Adaptation de l'Application

### 1. Configuration `.env.local`

Ajoutez une variable pour basculer facilement de mode :

```dotenv
# .env.local
NEXT_PUBLIC_OFFLINE_MODE=true
```

### 2. Modification de l'API d'Upload (`app/api/upload/route.ts`)

Modifiez votre route API pour sauvegarder localement si le mode hors-ligne est activé.

```typescript
// Extrait de logique à intégrer dans votre route POST
import fs from 'fs';
import path from 'path';
import { writeFile } from 'fs/promises';

export async function POST(request: Request) {
  // ... récupération du formData ...
  
  if (process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true') {
    const file = formData.get('file') as File;
    const email = formData.get('email') as string;
    const sessionId = formData.get('sessionId') as string;
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `video_${sessionId}_${Date.now()}.webm`;
    const uploadDir = path.join(process.cwd(), 'pending_uploads');
    
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    
    // 1. Sauvegarder la vidéo
    await writeFile(path.join(uploadDir, fileName), buffer);
    
    // 2. Sauvegarder les métadonnées pour l'envoi futur
    const metadata = {
      fileName,
      email,
      sessionId,
      timestamp: new Date().toISOString(),
      // ... autres champs nécessaires pour l'email
    };
    
    await writeFile(
      path.join(uploadDir, fileName.replace('.webm', '.json')), 
      JSON.stringify(metadata, null, 2)
    );
    
    return NextResponse.json({ success: true, offline: true });
  }
  
  // ... logique S3 habituelle ...
}
```

### 3. Adaptation du Player et des Listes

Dans vos composants (`SongSelector`, `KaraokePlayer`), utilisez la variable d'environnement :

```typescript
const isOffline = process.env.NEXT_PUBLIC_OFFLINE_MODE === 'true';

// Dans le sélecteur de chansons
const songs = isOffline 
  ? require('@/data/offline-songs.json') 
  : songsFromApi;

// Dans le player
const videoSrc = isOffline ? song.localUrl : song.s3Url;
```

---

## Phase 3 : L'Événement (Mode Hors-Ligne)

1.  **Lancement** :
    *   Exécutez `npm run build` puis `npm start` sur le serveur local.
    *   Assurez-vous que `NEXT_PUBLIC_OFFLINE_MODE=true`.

2.  **Réseau Local** :
    *   Utilisez un routeur Wi-Fi (même sans internet).
    *   Connectez le serveur (PC) en Ethernet ou Wi-Fi.
    *   Les bornes (tablettes/écrans) se connectent au Wi-Fi du routeur.
    *   Accédez à l'app via l'IP du serveur : `http://192.168.1.X:3000`.

---

## Phase 4 : Post-Événement (Synchronisation)

Une fois de retour au bureau avec une connexion internet.

### Script de synchronisation (`scripts/sync-uploads.js`)

```javascript
// scripts/sync-uploads.js
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// Importez votre service d'email ou utilisez fetch vers l'API Brevo directement

const PENDING_DIR = path.join(__dirname, '../pending_uploads');
const ARCHIVE_DIR = path.join(__dirname, '../archived_uploads');

async function sync() {
  if (!fs.existsSync(PENDING_DIR)) return;
  if (!fs.existsSync(ARCHIVE_DIR)) fs.mkdirSync(ARCHIVE_DIR);

  const files = fs.readdirSync(PENDING_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  console.log(`🔄 Synchronisation de ${jsonFiles.length} vidéos...`);

  for (const jsonFile of jsonFiles) {
    const metadata = JSON.parse(fs.readFileSync(path.join(PENDING_DIR, jsonFile)));
    const videoFile = metadata.fileName;
    const videoPath = path.join(PENDING_DIR, videoFile);

    if (fs.existsSync(videoPath)) {
      try {
        console.log(`📤 Uploading ${videoFile}...`);
        
        // 1. Upload S3
        const fileContent = fs.readFileSync(videoPath);
        // ... Code d'upload S3 ...

        // 2. Envoi Email
        console.log(`📧 Envoi email à ${metadata.email}...`);
        // ... Appel API Brevo ...

        // 3. Archivage (Déplacement des fichiers pour ne pas les re-traiter)
        fs.renameSync(videoPath, path.join(ARCHIVE_DIR, videoFile));
        fs.renameSync(path.join(PENDING_DIR, jsonFile), path.join(ARCHIVE_DIR, jsonFile));
        
        console.log(`✅ Terminé pour ${videoFile}`);
      } catch (e) {
        console.error(`❌ Erreur pour ${videoFile}:`, e);
      }
    }
  }
}

sync();
```

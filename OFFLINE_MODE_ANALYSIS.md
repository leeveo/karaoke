# 📋 Analyse Complète - Mode Offline & Plan d'Implémentation

## PARTIE 1: ANALYSE ACTUELLE DE L'APP

### 🔴 ARCHITECTURE FRONTEND

#### Stack Actuel:
- **Next.js 15** (App Router, Client/Server Components)
- **React 19** avec TypeScript
- **Supabase JS** pour la base de données
- **AWS SDK** pour S3
- **Nodemailer** pour les emails (via API route)

#### Flux Actuel de Karaoke:

```
1. BACKOFFICE (Admin)
   └─> Créer Événement (Supabase)
       ├─> Événement metadata (name, date, location)
       ├─> Event Customization (couleurs, logo, background image)
       │   └─> Images uploadées dans Supabase Storage
       └─> is_active = true

2. FRONTEND PUBLIC
   └─> Afficher Événement (/event/[id])
       ├─> Fetch événement depuis Supabase
       ├─> Fetch logo/background depuis Supabase Storage
       ├─> Display CategorySelector
       └─> User sélectionne catégorie → va à /event/[id]/category/[category]

3. SELECTION CHANSON
   └─> Voir les chansons AWS S3 (karaokesaas/)
       ├─> getSongUrl() → Presigned URL AWS
       └─> Click chanson → /karaoke/[songId]

4. ENREGISTREMENT KARAOKE
   └─> /karaoke/[songId] → LiveKaraokeRecorder
       ├─> Load chansons depuis AWS S3 (presigned URL)
       ├─> Accès webcam
       ├─> MediaRecorder enregistre canvas
       ├─> Canvas contient:
       │   ├─ Vidéo webcam (flipped)
       │   ├─ Vidéo karaoke (transparent overlay)
       │   ├─ Logo (toujours visible)
       │   └─ Audio (combiné: mic + karaoke)
       └─> Blob vidéo stocké sessionStorage

5. REVIEW VIDEO
   └─> /review/[sessionId] OU /event/[id]/review/[songId]
       ├─> Display vidéo depuis sessionStorage (blob URL)
       ├─> Button "Valider"
       │   └─> uploadToS3() → AWS S3
       │       └─> karaoke-videos/[sessionId]-[date].webm
       └─> Success → /qr/[sessionId]

6. QR CODE & PARTAGE
   └─> /qr/[sessionId]
       ├─> Display QR code
       ├─> Display vidéo depuis S3 (signed URL)
       └─> Form Partage Email
           ├─> Récupère email depuis formulaire
           └─> sendEmail() via API route
               ├─> Nodemailer
               ├─> Email body avec lien S3
               └─> SMTP (Brevo)
```

---

### 🔴 BASE DE DONNEES (Supabase PostgreSQL)

#### Tables Clés:
1. **events**
   - id, name, description, date, location, user_id, is_active
   - Contain 1:1 avec event_customizations

2. **event_customizations**
   - id, event_id, primary_color, secondary_color, background_image, logo
   - Images stockées dans Supabase Storage (`karaokestorage` bucket)

3. **templates** (optionnel, prédéfinis)
   - name, description, background_image, primary_color, secondary_color

#### RLS Policies:
- Events: Visibles publiquement si is_active = true
- Event Customizations: Visibles avec l'événement

---

### 🔴 AWS S3 INTERACTIONS

#### 1. Chansons (Lecture seule - Public)
- **Bucket**: `leeveostockage`
- **Path**: `karaokesaas/[category]/[artist]-[title].webm`
- **Access**: Presigned URLs 7j
- **Operation**: getSongUrl() → S3Client.getSignedUrl()

#### 2. Vidéos (Upload - Public)
- **Bucket**: `leeveostockage`
- **Path**: `karaoke-videos/[sessionId]-[timestamp].webm`
- **Access**: Public-read ACL
- **Operation**: uploadToS3() → s3.upload()

#### Problème ACL AWS:
```typescript
// Actuellement utilise aws-sdk v2 (deprecated)
ACL: 'public-read'  // Permet accès direct sans auth
```

---

### 🔴 EMAIL WORKFLOW

#### Actuel:
```
ReviewPage → handleValidation()
  └─> uploadToS3(blob, filename)
      └─> S3 URL retournée
          └─> Redirect /qr/[sessionId]?pageUrl=[s3Url]
              └─> QRPage → handleSubmit()
                  ├─ sendEmail(email, videoUrl)
                  │   └─ API route /api/send-email
                  │       └─ Nodemailer + SMTP Brevo
                  └─ Success notification
```

---

## PARTIE 2: SOLUTION OFFLINE

### 🟢 ARCHITECTURE OFFLINE MODE

#### Concept Global:
```
BACKOFFICE (Online, comme maintenant)
├─ Admin crée événement normalement
├─ Button: "Télécharger pour Mode Offline"
│   └─ Crée un "Export Offline" avec:
│       ├─ Événement metadata (JSON)
│       ├─ Customization (couleurs, metadata)
│       ├─ Chansons (WebM blobs)
│       ├─ Logo/Background (images)
│       └─ Service Worker + IndexedDB schema
│
└─ Event page peut scanner QR ou charger export
    └─ Télécharge ZIP ou IndexedDB synced localement

FRONTEND (Online OU Offline)
├─ ServiceWorker intercepte requêtes
├─ Check IndexedDB si offline
├─ Si online → normalement
├─ Si offline:
│   ├─ Utilise IndexedDB pour événement
│   ├─ Utilise IDB pour chansons
│   ├─ Enregistre vidéo localement (IndexedDB Blob)
│   ├─ Enregistre email dans queue (IndexedDB)
│   └─ UI indique "OFFLINE MODE"
│
└─ Quand reconnecté:
    ├─ Sync vidéos → S3 (uploadToS3)
    ├─ Sync emails → API (sendEmail)
    ├─ Marquer comme synced
    └─ Notification "Sync complète"
```

---

## PARTIE 3: TECHNOLOGIES REQUISES

### 📦 Nouvelles Dépendances:

```json
{
  "idb": "^8.0.0",              // IndexedDB wrapper
  "workbox-window": "^7.0.0",   // ServiceWorker client
  "axios": "^1.6.0"             // HTTP client avec retry
}
```

### 📁 Nouvelle Structure:

```
lib/offline/
├─ db.ts                    // IndexedDB schema & operations
├─ sync.ts                  // Sync manager
└─ service-worker.ts        // ServiceWorker logic

public/
└─ offline-worker.js        // ServiceWorker entrypoint

contexts/
└─ OfflineContext.tsx       // State management pour offline

hooks/
├─ useOfflineMode.ts        // Hook pour vérifier mode offline
├─ useIndexedDB.ts          // Wrapper IDB operations
└─ useSync.ts               // Sync manager hook
```

---

## PARTIE 4: IMPLEMENTATION DÉTAILLÉE

### Phase 1: IndexedDB Schema

```typescript
// db.ts - IndexedDB Structure

interface OfflineEvent {
  id: string;
  name: string;
  customization: {
    primary_color: string;
    secondary_color: string;
    logoBlob: Blob;
    backgroundBlob: Blob;
  };
}

interface OfflineSong {
  id: string;
  title: string;
  artist: string;
  categoryId: string;
  blob: Blob;  // WebM file
  size: number;
}

interface RecordedVideo {
  id: string;
  sessionId: string;
  userEmail: string;
  userName: string;
  videoBlob: Blob;     // Enregistrement utilisateur
  timestamp: number;
  status: 'pending' | 'uploading' | 'synced' | 'failed';
  s3Key: string;
  s3Url?: string;
}

interface EmailQueue {
  id: string;
  to: string;
  videoUrl: string;
  userName: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'failed';
}

// Stores:
// 1. offlineEvents: {keyPath: 'id'}
// 2. offlineSongs: {keyPath: 'id', indexes: ['categoryId']}
// 3. recordedVideos: {keyPath: 'id', indexes: ['status', 'sessionId']}
// 4. emailQueue: {keyPath: 'id', indexes: ['status']}
// 5. syncStatus: {keyPath: 'eventId'} → {lastSync, syncState}
```

---

### Phase 2: ServiceWorker Implementation

```typescript
// offline-worker.js

const CACHE_NAME = 'karaoke-offline-v1';
const API_ROUTES = ['/api/upload', '/api/send-email', '/api/songs'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API calls - try network first, fallback to IDB
  if (API_ROUTES.some(route => url.pathname.includes(route))) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Static assets - cache first
  else if (request.destination === 'document' || 
           request.destination === 'style' ||
           request.destination === 'script') {
    event.respondWith(cacheFirstStrategy(request));
  }
});

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    // Cache successful responses
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline - return from cache or IDB
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // For data requests, IndexedDB handled by app
    return new Response('Offline', { status: 503 });
  }
}
```

---

### Phase 3: Offline Context & Hooks

```typescript
// contexts/OfflineContext.tsx
interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: number;
  pendingVideos: number;
  pendingEmails: number;
  startSync: () => Promise<void>;
}

// hooks/useOfflineMode.ts
export function useOfflineMode() {
  const context = useContext(OfflineContext);
  return {
    isOffline: !context.isOnline,
    canRecord: true,  // Toujours possible
    canShare: context.isOnline,  // Seulement si online
    showOfflineIndicator: !context.isOnline,
    syncStatus: context.isSyncing ? 'syncing' : 'idle'
  };
}
```

---

### Phase 4: Flow Modifications

#### Backoffice - Download Offline

```tsx
// admin/settings/page.tsx - NEW BUTTON

<button onClick={downloadOfflineMode}>
  📥 Télécharger pour Mode Offline
</button>

// Fonction:
async function downloadOfflineMode(eventId: string) {
  // 1. Fetch événement + customization
  const event = await fetchEventById(eventId);
  
  // 2. Fetch logo/background blobs
  const logoBlob = await fetch(event.customization.logoUrl).then(r => r.blob());
  const bgBlob = await fetch(event.customization.backgroundImageUrl).then(r => r.blob());
  
  // 3. Fetch toutes les chansons pour cet événement
  const songs = await fetchSongsForEvent(eventId);
  const songBlobs = await Promise.all(
    songs.map(song => fetch(songUrl).then(r => r.blob()))
  );
  
  // 4. Store dans IndexedDB
  await db.offlineEvents.add({
    id: event.id,
    name: event.name,
    customization: {
      ...event.customization,
      logoBlob,
      backgroundBlob
    }
  });
  
  await Promise.all(
    songs.map((song, i) => db.offlineSongs.add({
      id: song.id,
      ...song,
      blob: songBlobs[i]
    }))
  );
  
  // 5. Optional: Create ZIP for download
  const zip = createZip({ event, songs, logoBlob, bgBlob });
  downloadFile(zip);
  
  // 6. Register ServiceWorker
  navigator.serviceWorker.register('/offline-worker.js');
}
```

#### Frontend - Category Selection

```tsx
// event/[id]/category/[category]/page.tsx

const offlineEvent = await db.offlineEvents.get(eventId);
const isOffline = !navigator.onLine;

if (isOffline && offlineEvent) {
  // Use offline event
  const songs = await db.offlineSongs
    .where('categoryId').equals(category)
    .toArray();
} else if (!offlineEvent && isOffline) {
  // Can't load - not downloaded
  showError('Événement non disponible offline');
} else {
  // Normal online flow
  const songs = await fetchSongsFromS3(eventId, category);
}
```

#### Frontend - Recording (Offline)

```tsx
// karaoke/[songId]/page.tsx - LiveKaraokeRecorder

const isOffline = !navigator.onLine;
const offlineEvent = await db.offlineEvents.get(eventId);

// 1. Load song blob instead of S3 URL
let karaokeBlob;
if (isOffline) {
  const offlineSong = await db.offlineSongs.get(songId);
  karaokeBlob = offlineSong.blob;
  karaokeVideoRef.current.src = URL.createObjectURL(karaokeBlob);
} else {
  karaokeVideoRef.current.src = presignedUrl; // Normal
}

// 2. Recording part is SAME
// Canvas drawing, MediaRecorder tout pareil

// 3. Store locally instead of S3
if (isOffline) {
  const recordedVideo: RecordedVideo = {
    id: uuid(),
    sessionId: sessionId,
    userEmail: '', // Will be asked later
    userName: '',
    videoBlob: recordedBlob,
    timestamp: Date.now(),
    status: 'pending'
  };
  
  await db.recordedVideos.add(recordedVideo);
} else {
  // Normal flow - upload to S3 immediately
  const s3Url = await uploadToS3(recordedBlob, filename);
}
```

#### Frontend - Review (Offline)

```tsx
// event/[id]/review/[songId]/page.tsx ou review/[sessionId]/page.tsx

const isOffline = !navigator.onLine;
const recordedVideo = await db.recordedVideos.get(sessionId);

if (isOffline) {
  // Show from IndexedDB blob
  const blobUrl = URL.createObjectURL(recordedVideo.videoBlob);
  
  // On validation - just mark as ready to sync
  handleValidation = async () => {
    recordedVideo.status = 'pending';
    recordedVideo.userEmail = emailFromForm;
    recordedVideo.userName = nameFromForm;
    await db.recordedVideos.put(recordedVideo);
    
    // Add to email queue
    await db.emailQueue.add({
      id: uuid(),
      to: emailFromForm,
      videoUrl: sessionStorage.getItem('karaoke-review-url'),
      userName: nameFromForm,
      timestamp: Date.now(),
      status: 'pending'
    });
    
    // Redirect to QR
    router.push(`/qr/${sessionId}`);
  };
} else {
  // Normal flow - upload to S3
  const s3Url = await uploadToS3(recordedBlob, filename);
}
```

#### Frontend - QR Page (Offline)

```tsx
// qr/[sessionId]/page.tsx

const isOffline = !navigator.onLine;
const recordedVideo = await db.recordedVideos.get(sessionId);

if (isOffline) {
  // Show local blob
  const blobUrl = URL.createObjectURL(recordedVideo.videoBlob);
  
  // QR code - can be local or placeholder
  showOfflineQRPlaceholder('Partage disponible quand reconnecté');
  
  // Form - stored locally
  handleSubmit = async () => {
    // Already queued from Review page
    showSuccess('Partagé localement, synced automatiquement');
  };
} else {
  // Normal flow
  const s3Url = sessionStorage.getItem('video-s3-url-signed');
  // Generate QR code for S3 URL
}
```

---

### Phase 5: Sync Manager

```typescript
// lib/offline/sync.ts

export async function startSync() {
  const isOnline = navigator.onLine;
  if (!isOnline) return;

  try {
    // 1. Sync recorded videos to S3
    const pendingVideos = await db.recordedVideos
      .where('status').equals('pending')
      .toArray();

    for (const video of pendingVideos) {
      try {
        video.status = 'uploading';
        await db.recordedVideos.put(video);

        const s3Url = await uploadToS3(video.videoBlob, 
          `karaoke-videos/${video.sessionId}-${Date.now()}.webm`
        );

        video.status = 'synced';
        video.s3Url = s3Url;
        await db.recordedVideos.put(video);

        // Update email queue with S3 URL
        const emailEntry = await db.emailQueue
          .where('videoUrl').equals(sessionStorage.getItem('karaoke-review-url'))
          .first();
        if (emailEntry) {
          emailEntry.videoUrl = s3Url;
          await db.emailQueue.put(emailEntry);
        }
      } catch (error) {
        video.status = 'failed';
        await db.recordedVideos.put(video);
      }
    }

    // 2. Sync emails
    const pendingEmails = await db.emailQueue
      .where('status').equals('pending')
      .toArray();

    for (const email of pendingEmails) {
      try {
        await sendEmail(email.to, email.videoUrl, email.userName);
        email.status = 'sent';
        await db.emailQueue.put(email);
      } catch (error) {
        email.status = 'failed';
        await db.emailQueue.put(email);
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error };
  }
}
```

---

### Phase 6: UI Components

#### Offline Indicator

```tsx
// components/OfflineIndicator.tsx

export function OfflineIndicator() {
  const { isOnline, isSyncing, syncProgress } = useOfflineMode();

  if (isOnline && !isSyncing) return null;

  return (
    <div className="fixed top-4 right-4 bg-yellow-500 text-white px-4 py-2 rounded-lg">
      {!isOnline && '📡 Mode Offline'}
      {isSyncing && `Sync en cours... ${syncProgress}%`}
    </div>
  );
}
```

#### Offline Mode Toggle (Admin)

```tsx
// admin/settings/page.tsx - ADDITIONAL CONTROLS

<section>
  <h3>Mode Offline</h3>
  
  <button onClick={downloadOfflineMode}>
    📥 Télécharger pour Mode Offline
  </button>
  
  <button onClick={generateQRForOfflineSetup}>
    📱 QR Code Installation
  </button>
  
  <div>
    <p>Taille offline: {calculateEventSize(eventId)} MB</p>
    <p>Chansons disponibles: {songCount}</p>
  </div>
</section>
```

---

## PARTIE 5: WORKFLOW COMPLET OFFLINE

### Scénario Utilisateur:

```
JOUR 1 - Admin (Online)
├─ Backoffice: Créer événement "Gala Soirée"
├─ Customization: Logo + Background
├─ Button: "📥 Download for Offline"
│   └─ IndexedDB populated + ServiceWorker registered
└─ QR Code généré pour partage

JOUR 2 - Participant (Offline à Venue)
├─ Scanne QR ou ouvre lien événement
├─ App détecte offline, utilise IndexedDB
├─ Affiche "🔴 Mode Offline"
├─ Sélectionne catégorie (local)
├─ Sélectionne chanson (local blob)
├─ Enregistre karaoke (canvas + MediaRecorder)
├─ Review vidéo (blob local)
├─ Entre email + nom
├─ Validation → Stored dans IndexedDB
│   ├─ recordedVideos
│   └─ emailQueue
└─ QR affiche "Partagé localement"

JOUR 3 - Sync (App Online again)
├─ App détecte reconnexion
├─ Sync automatique démarre
├─ Videos uploadées S3 progressivement
├─ Emails envoyés avec liens S3
├─ Notification: "✅ Tous vos vidéos synchronisés"
└─ Participants reçoivent emails avec liens
```

---

## PARTIE 6: DATA FLOW DIAGRAM

```
┌─────────────────────────────────┐
│   OFFLINE EVENT DOWNLOAD        │
│   (Admin, any time online)      │
└────────┬────────────────────────┘
         │
    ┌────▼────┐
    │ Supabase│ fetch event + customization
    │Database │
    └────┬────┘
         │
    ┌────▼──────────────────────────┐
    │ Fetch Asset Blobs              │
    │ - Logo (Supabase Storage)     │
    │ - Background (Supabase)       │
    │ - Songs (AWS S3)              │
    └────┬──────────────────────────┘
         │
    ┌────▼────────────────┐
    │ Store in IndexedDB  │
    │ - offlineEvents     │
    │ - offlineSongs      │
    │ - syncStatus        │
    └────┬────────────────┘
         │
    ┌────▼─────────────────────┐
    │ Register ServiceWorker   │
    │ (offline-worker.js)      │
    └──────────────────────────┘


┌──────────────────────────────┐
│   OFFLINE KARAOKE RECORDING  │
│   (Participant, offline)     │
└────────┬─────────────────────┘
         │
    ┌────▼────────────────┐
    │ Check: Online?      │
    │ YES → Normal flow   │
    │ NO → Offline flow   │
    └────┬────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Load from IndexedDB       │
    │ - Event metadata          │
    │ - Songs (blob URLs)       │
    │ - Logo/Background         │
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Record Karaoke            │
    │ - Canvas + MediaRecorder  │
    │ (exactly same as online)  │
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Store RecordedVideo       │
    │ - videoBlob               │
    │ - status: 'pending'       │
    │ - Store in IndexedDB      │
    └────┬──────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Add to EmailQueue         │
    │ - to, userName            │
    │ - status: 'pending'       │
    │ - Store in IndexedDB      │
    └──────────────────────────┘


┌──────────────────────────────┐
│   SYNC WHEN RECONNECTED      │
│   (Automatic or manual)      │
└────────┬─────────────────────┘
         │
    ┌────▼──────────────────┐
    │ Online detected       │
    │ (window.online event) │
    └────┬──────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ Fetch pending from IndexedDB  │
    │ - recordedVideos (pending)    │
    │ - emailQueue (pending)        │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ For each video:               │
    │ 1. uploadToS3(blob, key)      │
    │ 2. Get S3 URL                 │
    │ 3. Update recordedVideo       │
    │    status = 'synced'          │
    │ 4. Update emailQueue with URL │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────────┐
    │ For each email in queue:      │
    │ 1. sendEmail(to, videoUrl)    │
    │    via API (/api/send-email)  │
    │ 2. Update status = 'sent'     │
    └────┬──────────────────────────┘
         │
    ┌────▼──────────────────────┐
    │ Show completion notice    │
    │ "✅ Sync completed"       │
    └──────────────────────────┘
```

---

## PARTIE 7: CONSIDERATIONS TECHNIQUES

### ⚠️ Storage Limits:

| Storage | Limite |
|---------|--------|
| IndexedDB | ~50MB (varies by browser) |
| LocalStorage | ~5-10MB |
| ServiceWorker Cache | ~50MB |
| Total Offline | ~100-150MB |

**Solution**: 
- Limiter à 10-20 chansons par événement
- Compression vidéo possible avec ffmpeg.js
- Avertir user si > limite

### 🔐 Security:

- ✅ Vidéos offline ne quittent pas le device
- ✅ IndexedDB accessible seulement par app domain
- ⚠️ Emails NOT envoyés offline (queued)
- ⚠️ Pas d'authentification requise pour utiliser event offline

### 📦 Browser Compatibility:

```
✅ Chrome/Edge 24+
✅ Firefox 16+
✅ Safari 15.1+
✅ Mobile Safari 15.2+
⚠️ IE 11: NOT supported (no IndexedDB)
```

### 🔄 Conflict Resolution:

Si même video uploadée 2x:
- S3 key unique par sessionId + timestamp
- EmailQueue prevents duplicate sends
- User sees "Already synced" message

---

## PARTIE 8: PLAN D'IMPLEMENTATION DÉTAILLÉ

```
PHASE 1: Infrastructure (2-3 jours)
├─ Create IndexedDB schema & operations
├─ Create ServiceWorker registration
├─ Create offline context & hooks
└─ Create sync manager logic

PHASE 2: Backend Modifications (1 jour)
├─ Modify /api/send-email to handle video URLs
├─ Ensure uploadToS3 works without change
└─ Add error handling

PHASE 3: Frontend Modifications (3-4 jours)
├─ Modify event loading (check IDB first)
├─ Modify song selection (local blobs)
├─ Modify karaoke recording (same code)
├─ Modify review page (offline detection)
├─ Modify QR page (offline handling)
└─ Add offline UI indicators

PHASE 4: Admin Features (1-2 jours)
├─ Add "Download for Offline" button
├─ Add sync status dashboard
├─ Add offline event management
└─ Add storage usage indicator

PHASE 5: Testing & Optimization (2-3 jours)
├─ Test offline workflow end-to-end
├─ Test sync on reconnection
├─ Test error scenarios
├─ Optimize blob sizes
└─ Performance testing

TOTAL: ~9-13 jours
```

---

## PARTIE 9: QUESTIONS POUR TOI

**Avant d'implémenter, tes préférences:**

1. **Stockage Données**:
   - Veux-tu que l'export offline soit automatique (button admin) ou manuel (ZIP download)?
   - Ou les deux?

2. **Taille des Fichiers**:
   - Limite max par événement (ex: 10 chansons)?
   - Compression auto des vidéos enregistrées?

3. **Sync**:
   - Sync automatique dès reconnexion ou user clique bouton?
   - Notifications de sync?

4. **QR Code Offline**:
   - Afficher QR code local (non-fonctionnel) ou placeholder?
   - Message spécial pendant offline?

5. **Admin Dashboard**:
   - Veux-tu voir liste des vidéos offline à uploader?
   - Status sync en temps réel?

6. **Événements**:
   - Un seul événement offline par device ou plusieurs?
   - Possibilité d'archiver ancien événement offline?


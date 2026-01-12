# 🎤 Documentation Complète du Projet Karaoké SaaS

## 📋 Table des Matières
1. [Vue d'ensemble](#vue-densemble)
2. [Stack Technique](#stack-technique)
3. [Architecture](#architecture)
4. [Base de Données Supabase](#base-de-données-supabase)
5. [Structure des Dossiers](#structure-des-dossiers)
6. [Configuration](#configuration)
7. [Fonctionnalités](#fonctionnalités)
8. [APIs et Services](#apis-et-services)
9. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

**Karaoké SaaS** est une application web complète permettant de créer et gérer des événements karaoké personnalisés. Les utilisateurs peuvent :
- Créer des événements avec personnalisation complète (couleurs, images, logos)
- Partager des événements via URL ou QR code
- Permettre aux participants d'enregistrer leurs performances karaoké
- Gérer une bibliothèque de chansons stockée sur AWS S3
- Visualiser des statistiques et analyses des événements

---

## 🛠️ Stack Technique

### Frontend
- **Framework**: Next.js 15.3.1 (App Router)
- **Language**: TypeScript 5
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4.1.4
- **Animations**: Framer Motion 12.12.2
- **Icons**: React Icons 5.5.0

### Backend & Services
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: 
  - AWS S3 (chansons, vidéos)
  - Supabase Storage (images événements, logos)
- **Video Processing**: FFmpeg (@ffmpeg/ffmpeg 0.12.15)
- **Email**: Nodemailer 6.10.1

### Bibliothèques Spécifiques
- **AWS SDK**: 
  - @aws-sdk/client-s3 3.812.0
  - @aws-sdk/s3-request-presigner 3.812.0
  - aws-sdk 2.1692.0
- **QR Code**: next-qrcode 2.5.1
- **Charts**: Chart.js 4.4.9 + react-chartjs-2 5.3.0
- **Color Picker**: react-color 2.19.3 + react-colorful 5.6.1
- **Camera Filters**: @snap/camera-kit 0.10.0
- **UUID**: uuid 11.1.0

---

## 🏗️ Architecture

### Architecture Globale
```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│  Next.js App Router + React Components                   │
└───────────────────┬─────────────────────────────────────┘
                    │
    ┌───────────────┼───────────────┐
    │               │               │
    ▼               ▼               ▼
┌─────────┐   ┌──────────┐   ┌──────────┐
│Supabase │   │  AWS S3  │   │Next.js   │
│Database │   │ Storage  │   │API Routes│
│ & Auth  │   │          │   │          │
└─────────┘   └──────────┘   └──────────┘
```

### Flux de Données
1. **Authentification**: Supabase Auth (JWT)
2. **Événements**: Supabase PostgreSQL avec RLS
3. **Médias**: 
   - Chansons → AWS S3 (bucket: leeveostockage)
   - Vidéos → AWS S3 (karaoke-videos/)
   - Images → Supabase Storage (karaokestorage)

---

## 🗄️ Base de Données Supabase

### Tables Principales

#### 1. **`events`** - Table des Événements
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);
```

**Colonnes:**
- `id`: Identifiant unique de l'événement
- `name`: Nom de l'événement
- `description`: Description de l'événement (optionnel)
- `date`: Date de l'événement
- `location`: Lieu de l'événement
- `created_at`: Date de création
- `user_id`: Référence à l'utilisateur créateur
- `is_active`: Statut actif/inactif

**Indexes:**
- Index sur `user_id` pour les requêtes par utilisateur
- Index sur `date` pour les tris chronologiques

---

#### 2. **`event_customizations`** - Personnalisation des Événements
```sql
CREATE TABLE event_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#FF5500',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#00AAFF',
  background_image TEXT,
  logo VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(event_id)
);
```

**Colonnes:**
- `id`: Identifiant unique
- `event_id`: Référence à l'événement (relation 1-1)
- `primary_color`: Couleur primaire (format hexadécimal)
- `secondary_color`: Couleur secondaire (format hexadécimal)
- `background_image`: Nom du fichier image de fond
- `logo`: Nom du fichier logo
- `created_at`: Date de création

**Relation:**
- **One-to-One** avec `events` (CASCADE on DELETE)

---

#### 3. **`templates`** - Templates Prédéfinis
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  background_image TEXT NOT NULL,
  primary_color TEXT NOT NULL,
  secondary_color TEXT NOT NULL,
  thumbnail TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_primary_color CHECK (primary_color ~* '^#([A-Fa-f0-9]{6})$'),
  CONSTRAINT valid_secondary_color CHECK (secondary_color ~* '^#([A-Fa-f0-9]{6})$')
);
```

**Colonnes:**
- `id`: Identifiant unique
- `name`: Nom du template
- `description`: Description du template
- `background_image`: Fichier image de fond
- `primary_color`: Couleur primaire (validé format hex)
- `secondary_color`: Couleur secondaire (validé format hex)
- `thumbnail`: Miniature pour aperçu
- `created_at`: Date de création

**Templates par Défaut:**
- Nuit étoilée (#1a237e / #4fc3f7)
- Fête tropicale (#00695c / #ffab40)
- Néon rétro (#6a1b9a / #00e5ff)
- Élégance dorée (#4e342e / #ffd54f)

---

### Row Level Security (RLS)

#### Événements (`events`)
```sql
-- Lecture: utilisateur authentifié peut voir ses propres événements
CREATE POLICY "Users can view their own events"
  ON events FOR SELECT
  USING (auth.uid() = user_id);

-- Insertion: utilisateur authentifié peut créer des événements
CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Modification: utilisateur peut modifier ses propres événements
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  USING (auth.uid() = user_id);

-- Suppression: utilisateur peut supprimer ses propres événements
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  USING (auth.uid() = user_id);
```

#### Templates (`templates`)
```sql
-- Lecture publique
CREATE POLICY "Templates are visible to all users"
  ON templates FOR SELECT
  USING (true);

-- Modification réservée aux administrateurs
CREATE POLICY "Only admins can modify templates"
  ON templates FOR ALL
  USING (auth.role() = 'authenticated' AND auth.email() IN ('admin@example.com'));
```

---

### Storage Buckets

#### 1. **`karaokestorage`** (Supabase Storage)
**Structure:**
```
karaokestorage/
├── backgrounds/       # Images de fond des événements
│   ├── starry-night.jpg
│   ├── tropical-party.jpg
│   └── [custom-images]
└── logos/            # Logos des événements
    └── [event-logos]
```

**Politiques:**
- Public read access
- Authenticated upload

---

#### 2. **`leeveostockage`** (AWS S3)
**Structure:**
```
leeveostockage/
├── karaokesaas/          # Bibliothèque de chansons
│   ├── pop/
│   ├── rock/
│   ├── rap/
│   ├── français/
│   ├── anglais/
│   └── latino/
└── karaoke-videos/       # Vidéos enregistrées
    ├── event_[id]/
    │   └── [sessionId]-[timestamp].webm
    └── ...
```

**Format des chansons:**
- Nom: `[titre]-[artiste].[ext]`
- Formats supportés: MP3, MP4, WebM
- Région: `eu-west-3`

---

## 📁 Structure des Dossiers

```
karaoke-web-app/
├── app/                        # Next.js App Router
│   ├── (public)/              # Routes publiques
│   │   └── layout.tsx
│   ├── admin/                 # Zone d'administration
│   │   ├── dashboard/         # Tableau de bord
│   │   ├── events/            # Gestion événements
│   │   │   ├── [id]/
│   │   │   │   ├── edit/
│   │   │   │   ├── view/
│   │   │   │   ├── videos/    # Gestion vidéos
│   │   │   │   └── shares/
│   │   │   └── create/
│   │   ├── songs/             # Gestion chansons
│   │   └── analytics/         # Statistiques
│   ├── api/                   # API Routes
│   │   ├── s3/               # Proxy AWS S3
│   │   │   ├── categories/
│   │   │   ├── songs/
│   │   │   ├── song-url/
│   │   │   └── videos/
│   │   ├── send-email/
│   │   └── upload/
│   ├── auth/                  # Pages d'authentification
│   │   └── login/
│   ├── event/                 # Pages événement public
│   │   └── [id]/
│   │       ├── karaoke/[songId]/
│   │       ├── category/[category]/
│   │       ├── qr/[sessionId]/
│   │       └── review/[sessionId]/
│   ├── karaoke/[songId]/      # Karaoké standalone
│   ├── qr/[sessionId]/        # QR code viewer
│   ├── review/[sessionId]/    # Review vidéo
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/                 # Composants React
│   ├── admin/                 # Composants admin
│   │   ├── AdminHeader.tsx
│   │   ├── AdminSidebar.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── auth/                  # Composants auth
│   │   └── LoginForm.tsx
│   ├── forms/                 # Formulaires
│   │   ├── EventForm.tsx
│   │   ├── TemplateSelector.tsx
│   │   └── TemplatePreviewModal.tsx
│   ├── ui/                    # UI Components
│   │   └── ColorPicker.tsx
│   ├── AudioEqualizer.tsx
│   ├── CategorySelector.tsx
│   ├── ClientLayout.tsx
│   ├── EmailForm.tsx
│   ├── FFmpegProvider.tsx
│   ├── FFmpegRunner.tsx
│   ├── FiltersSelector.tsx
│   ├── KaraokePlayer.tsx
│   ├── LiveKaraokeRecorder.tsx
│   ├── MusicTransitionLoader.tsx
│   ├── PageTransitionLoader.tsx
│   ├── QRCodeDisplay.tsx
│   ├── ReviewPlayer.tsx
│   ├── SnapchatFilters.tsx
│   └── SongSelector.tsx
│
├── lib/                       # Bibliothèques et utilitaires
│   ├── aws/                   # AWS S3
│   │   └── s3Admin.ts         # Administration S3
│   ├── supabase/              # Supabase
│   │   ├── client.ts          # Client Supabase
│   │   ├── auth.ts            # Authentification
│   │   ├── events.ts          # Gestion événements
│   │   ├── templates.ts       # Gestion templates
│   │   ├── storage.ts         # Upload fichiers
│   │   └── mock.ts            # Données de test
│   ├── snapchat/              # Snapchat Camera Kit
│   │   ├── cameraKitService.ts
│   │   └── debugger.ts
│   ├── aws.ts                 # AWS SDK legacy
│   ├── email.ts               # Service email
│   └── ffmpeg.ts              # FFmpeg
│
├── services/                  # Services métier
│   └── s3Service.ts           # Service S3 (client-side)
│
├── types/                     # Types TypeScript
│   ├── event.ts               # Types événements
│   └── template.ts            # Types templates
│
├── contexts/                  # React Contexts
│   └── CameraKitContext.tsx   # Context Camera Kit
│
├── hooks/                     # Custom Hooks
│   └── useCameraKit.ts
│
├── utils/                     # Utilitaires
│   └── recorder.ts            # Enregistrement audio/vidéo
│
├── config/                    # Configuration
│   └── api.ts
│
├── migrations/                # Migrations SQL
│   └── add_logo_field.sql
│
├── scripts/                   # Scripts SQL
│   └── create_templates_table.sql
│
├── public/                    # Fichiers statiques
│   ├── logo/
│   └── songs_copy/
│
├── .env.local                 # Variables d'environnement
├── next.config.js             # Configuration Next.js
├── tailwind.config.js         # Configuration Tailwind
├── tsconfig.json              # Configuration TypeScript
└── package.json               # Dépendances
```

---

## ⚙️ Configuration

### Variables d'Environnement (`.env.local`)

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=eu-west-3
NEXT_PUBLIC_AWS_S3_BUCKET=leeveostockage
NEXT_PUBLIC_AWS_REGION=eu-west-3

# Email Configuration (Gmail SMTP)
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=noreply@karaokeapp.com

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://afiuphbdniyfuubgwxqr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFmaXVwaGJkbml5ZnV1Ymd3eHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc4NTU4OTIsImV4cCI6MjA2MzQzMTg5Mn0.-4bVWDTzOgez1jKx3tDivBtFT-CalswYHdXR3WjZL5U

# Features Flags
NEXT_PUBLIC_DISABLE_CAMERA_KIT=false
```

### Configuration Next.js (`next.config.js`)

```javascript
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'leeveostockage.s3.eu-west-3.amazonaws.com',
      },
    ],
    domains: ['afiuphbdniyfuubgwxqr.supabase.co'],
  },
};
```

---

## 🎨 Fonctionnalités

### 1. **Gestion des Événements**
- ✅ Création d'événements avec formulaire complet
- ✅ Personnalisation (couleurs primaire/secondaire)
- ✅ Upload d'image de fond personnalisée
- ✅ Upload de logo personnalisé
- ✅ Sélection de templates prédéfinis
- ✅ Modification/suppression d'événements
- ✅ Activation/désactivation d'événements

### 2. **Bibliothèque de Chansons**
- ✅ Organisation par catégories (pop, rock, rap, etc.)
- ✅ Lecture depuis AWS S3
- ✅ Recherche et filtrage
- ✅ Affichage titre et artiste
- ✅ Player audio intégré

### 3. **Enregistrement Karaoké**
- ✅ Lecteur karaoké avec paroles synchronisées
- ✅ Enregistrement audio + vidéo
- ✅ Filtres Snapchat en temps réel (Camera Kit)
- ✅ Égaliseur audio visuel
- ✅ Preview avant sauvegarde
- ✅ Upload automatique vers S3

### 4. **Partage et Diffusion**
- ✅ URL unique par événement
- ✅ QR Code dynamique
- ✅ Page publique personnalisée
- ✅ Envoi par email

### 5. **Administration**
- ✅ Dashboard avec statistiques
- ✅ Gestion des événements
- ✅ Gestion des vidéos enregistrées
- ✅ Visualisation des performances
- ✅ Analytics (Chart.js)
- ✅ Suppression en masse

### 6. **Authentification**
- ✅ Connexion via Supabase Auth
- ✅ Inscription utilisateur
- ✅ Session persistante
- ✅ Protection des routes admin
- ✅ Row Level Security (RLS)

---

## 🔌 APIs et Services

### API Routes Next.js

#### 1. **`/api/s3/categories`** (GET)
Récupère la liste des catégories de chansons depuis S3.

**Réponse:**
```json
{
  "categories": ["pop", "rock", "rap", "français", "anglais", "latino"]
}
```

#### 2. **`/api/s3/songs`** (GET)
Récupère les chansons d'une catégorie.

**Paramètres:**
- `category` (query): nom de la catégorie

**Réponse:**
```json
{
  "songs": [
    {
      "key": "karaokesaas/pop/song-artist.mp3",
      "title": "Song",
      "artist": "Artist",
      "size": 5242880,
      "lastModified": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 3. **`/api/s3/song-url`** (GET)
Génère l'URL publique d'une chanson.

**Paramètres:**
- `key` (query): clé S3 de la chanson

**Réponse:**
```json
{
  "url": "https://leeveostockage.s3.eu-west-3.amazonaws.com/karaokesaas/pop/song.mp3"
}
```

#### 4. **`/api/s3/videos`** (GET/DELETE)
Gère les vidéos enregistrées.

**GET - Liste des vidéos:**
```
?action=list&eventId=123
```

**GET - URL signée:**
```
?action=signedUrl&videoPath=karaoke-videos/event_123/session-123456.webm
```

**DELETE - Supprimer une vidéo:**
```
?videoKey=karaoke-videos/event_123/session-123456.webm
```

**DELETE - Supprimer toutes les vidéos d'un événement:**
```
?eventId=123&deleteAll=true
```

#### 5. **`/api/send-email`** (POST)
Envoie un email avec Nodemailer.

**Body:**
```json
{
  "to": "user@example.com",
  "subject": "Invitation Karaoké",
  "html": "<p>Contenu HTML</p>"
}
```

#### 6. **`/api/upload`** (POST)
Upload de fichiers (formulaire multipart).

---

### Services Client-Side

#### **`services/s3Service.ts`**
- `getCategories()`: Liste des catégories
- `getSongsByCategory(category)`: Chansons par catégorie
- `getSongUrl(key)`: URL de chanson
- `getEventVideos(eventId)`: Vidéos d'un événement
- `getSignedVideoUrl(videoPath)`: URL signée
- `deleteS3Video(videoKey)`: Suppression vidéo
- `deleteAllEventVideos(eventId)`: Suppression en masse

#### **`lib/supabase/events.ts`**
- `fetchEvents()`: Tous les événements
- `fetchEventById(id)`: Un événement
- `createEvent(data)`: Créer événement
- `updateEvent(id, data)`: Modifier événement
- `deleteEvent(id)`: Supprimer événement
- `getEventPublicUrl(id)`: URL publique

#### **`lib/supabase/templates.ts`**
- `fetchTemplates()`: Tous les templates
- `fetchTemplateById(id)`: Un template
- `createTemplate(data)`: Créer template
- `getTemplateImageUrl(filename)`: URL image

#### **`lib/supabase/storage.ts`**
- `uploadEventImage(file)`: Upload image événement

#### **`lib/aws.ts`** (Legacy)
- `uploadToS3(file, filename)`: Upload vers S3
- `getSignedUrl(key)`: URL signée

---

## 🚀 Déploiement

### Prérequis
1. **Node.js** 18+
2. **npm** ou **yarn**
3. **Compte Supabase** (avec projet créé)
4. **Compte AWS** (avec bucket S3 configuré)
5. **Compte Email** (Gmail avec app password)

### Installation

```bash
# Cloner le projet
git clone <repo-url>
cd karaoke-web-app

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials

# Lancer en développement
npm run dev

# Build pour production
npm run build

# Lancer en production
npm start
```

### Déploiement Vercel

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Configurer les variables d'environnement dans Vercel Dashboard
# Project Settings > Environment Variables
```

### Configuration AWS S3

1. Créer un bucket S3 (`leeveostockage`)
2. Activer l'accès public (pour les chansons)
3. Configurer CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": []
  }
]
```
4. Créer un utilisateur IAM avec politique S3 complète

### Configuration Supabase

1. **Créer les tables** (exécuter les scripts SQL):
   - `scripts/create_templates_table.sql`
   - `migrations/add_logo_field.sql`

2. **Configurer Storage**:
   - Créer bucket `karaokestorage`
   - Activer l'accès public
   - Créer dossiers `backgrounds/` et `logos/`

3. **Activer l'authentification**:
   - Auth > Providers > Email
   - Auth > URL Configuration

4. **Configurer RLS**:
   - Appliquer les politiques RLS (voir section Base de Données)

---

## 📊 Schéma des Relations

```
┌──────────────┐
│    users     │ (Supabase Auth)
│  (auth.users)│
└──────┬───────┘
       │ 1
       │
       │ N
┌──────┴───────┐         1         ┌─────────────────────┐
│   events     │───────────────────│ event_customizations │
│              │                   │                     │
│ - id         │                   │ - id                │
│ - name       │                   │ - event_id (FK)     │
│ - date       │                   │ - primary_color     │
│ - user_id    │                   │ - secondary_color   │
│ - is_active  │                   │ - background_image  │
└──────────────┘                   │ - logo              │
                                   └─────────────────────┘

┌──────────────┐
│  templates   │ (Référence pour customizations)
│              │
│ - id         │
│ - name       │
│ - colors     │
│ - images     │
└──────────────┘
```

---

## 🎥 Processus d'Enregistrement Audio/Vidéo

### 📋 Vue d'ensemble

Le système d'enregistrement permet aux utilisateurs d'enregistrer leurs performances en combinant **3 flux vidéo/audio** en temps réel :
1. **Webcam** de l'utilisateur (vidéo + audio microphone)
2. **Vidéo karaoké** avec paroles synchronisées
3. **Logo** de l'événement (watermark)

Le tout est traité en temps réel via HTML5 Canvas et enregistré avec l'API MediaRecorder.

---

### 🏗️ Architecture du Système d'Enregistrement

```
┌─────────────────────────────────────────────────────────────┐
│                    NAVIGATEUR (Client-Side)                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌───────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Webcam      │  │   Vidéo      │  │   Logo Image    │  │
│  │   Stream      │  │   Karaoké    │  │   (Supabase)    │  │
│  │ (getUserMedia)│  │   (S3)       │  │                 │  │
│  └───────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│          │                  │                    │            │
│          └──────────────────┴────────────────────┘            │
│                             │                                 │
│                    ┌────────▼────────┐                       │
│                    │  HTML5 CANVAS   │                       │
│                    │  (Compositing)  │                       │
│                    └────────┬────────┘                       │
│                             │                                 │
│                    ┌────────▼────────┐                       │
│                    │  Audio Context  │                       │
│                    │  (Audio Mixing) │                       │
│                    └────────┬────────┘                       │
│                             │                                 │
│                    ┌────────▼────────┐                       │
│                    │ MediaRecorder   │                       │
│                    │   (WebM VP8)    │                       │
│                    └────────┬────────┘                       │
│                             │                                 │
│                    ┌────────▼────────┐                       │
│                    │   Blob Video    │                       │
│                    │ (SessionStorage)│                       │
│                    └────────┬────────┘                       │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │   AWS S3 Upload   │
                    │ karaoke-videos/   │
                    │ event_[id]/       │
                    └───────────────────┘
```

---

### 🔄 Les 5 Phases du Processus d'Enregistrement

#### Phase 1️⃣ : **Initialisation** (2-3 secondes)

**Composant** : `LiveKaraokeRecorder.tsx`

**Étapes** :

1. **Configuration Vidéo Karaoké**
```typescript
karaokeVideoRef.current.crossOrigin = "anonymous";
karaokeVideoRef.current.src = karaokeSrc; // URL S3
karaokeVideoRef.current.volume = 0.7;
karaokeVideoRef.current.onended = () => stopRecording(); // Auto-stop
```

2. **Activation Webcam**
```typescript
const stream = await navigator.mediaDevices.getUserMedia({ 
  video: { 
    facingMode: 'user',
    width: { ideal: 1280 },
    height: { ideal: 720 }
  }, 
  audio: true 
});

webcamVideoRef.current.srcObject = stream;
await webcamVideoRef.current.play();
```

3. **Chargement Logo** (Supabase ou défaut)
```typescript
const logoUrl = supabase.storage
  .from('karaokestorage')
  .getPublicUrl(`logos/${eventData.customization.logo}`);

const img = new Image();
img.crossOrigin = "anonymous";
img.src = logoUrl;
```

4. **Configuration Canvas** (Compositing)
```typescript
const canvas = canvasRef.current;
canvas.width = webcamVideoRef.current.videoWidth || 640;
canvas.height = webcamVideoRef.current.videoHeight || 480;
```

5. **Configuration Web Audio API** (Mixage)
```typescript
audioContextRef.current = new AudioContext();
audioDestinationRef.current = audioContext.createMediaStreamDestination();

const microphoneSource = audioContext.createMediaStreamSource(stream);
microphoneSource.connect(audioDestinationRef.current);
```

6. **Configuration MediaRecorder**
```typescript
const canvasStream = canvas.captureStream(30); // 30 FPS
const combinedStream = new MediaStream([
  ...canvasStream.getVideoTracks(),
  ...audioDestinationRef.current.stream.getAudioTracks()
]);

mediaRecorderRef.current = new MediaRecorder(combinedStream, {
  mimeType: 'video/webm;codecs=vp8,opus'
});
```

7. **Boucle de Rendu Canvas** (60 FPS)
```typescript
const drawFrame = () => {
  const ctx = canvasRef.current.getContext('2d');
  
  // 1. Effacer le canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 2. Dessiner la webcam (avec effet miroir)
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height);
  ctx.restore();
  
  // 3. Superposer la vidéo karaoké (40% opacité)
  ctx.globalAlpha = 0.4;
  ctx.drawImage(karaokeVideoRef.current, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1.0;
  
  // 4. Ajouter le logo (coin supérieur droit)
  if (logoRef.current && logoLoaded) {
    const logoWidth = canvas.width * 0.20;
    const logoHeight = (logoRef.current.height / logoRef.current.width) * logoWidth;
    ctx.drawImage(logoRef.current, canvas.width - logoWidth - 20, 20, logoWidth, logoHeight);
  }
  
  animationFrameId = requestAnimationFrame(drawFrame);
};
```

---

#### Phase 2️⃣ : **Démarrage Enregistrement** (<500ms)

**Fonction** : `startRecording()`

**Ordre Critique** :
```typescript
// 1. Réinitialiser les chunks
recordedChunksRef.current = [];
karaokeVideoRef.current.currentTime = 0;

// 2. Configuration Audio Karaoké
const mediaElement = new Audio();
mediaElement.src = karaokeVideoRef.current.src;
mediaElement.volume = 0.7;

const karaokeSource = audioContext.createMediaElementSource(mediaElement);
karaokeSource.connect(audioDestinationRef.current); // → Enregistrement
karaokeSource.connect(audioContext.destination); // → Haut-parleurs

// 3. DÉMARRER L'ENREGISTREMENT (AVANT la lecture)
mediaRecorderRef.current.start();
setRecordingStarted(true);

await new Promise(resolve => setTimeout(resolve, 200));

// 4. Démarrer la lecture vidéo
await karaokeVideoRef.current.play();

// 5. Démarrer la lecture audio
await mediaElement.play();
```

**Graphe Audio** :
```
┌──────────────┐
│  Microphone  │
└──────┬───────┘
       │
       ▼
┌──────────────┐      ┌─────────────────────────┐
│ AudioContext │─────→│ AudioDestination        │─→ MediaRecorder
└──────┬───────┘      │ (Mixed Stream)          │
       │              └─────────────────────────┘
       ▼
┌──────────────┐      ┌─────────────────────────┐
│Karaoké Audio │─────→│ Speakers                │─→ Haut-parleurs
└──────────────┘      └─────────────────────────┘
```

---

#### Phase 3️⃣ : **Enregistrement en Cours**

**Processus continu** :

```typescript
// Boucle de rendu Canvas (60 FPS)
drawFrame() // Composite webcam + karaoké + logo

// MediaRecorder collecte les chunks
mediaRecorder.ondataavailable = (e) => {
  if (e.data.size > 0) {
    recordedChunksRef.current.push(e.data);
  }
}

// Auto-stop à la fin de la vidéo
karaokeVideoRef.current.onended = () => {
  if (recordingStarted) {
    stopRecording();
  }
}
```

**Métriques** :
- Rendu Canvas : 60 FPS
- Capture vidéo : 30 FPS
- Chunks générés : ~1 par seconde
- Taille typique : ~500 KB/sec à 1280x720

---

#### Phase 4️⃣ : **Arrêt et Finalisation** (1-2 secondes)

**Fonction** : `stopRecording()`

```typescript
// 1. Arrêter le MediaRecorder
if (mediaRecorderRef.current?.state === 'recording') {
  mediaRecorderRef.current.stop(); // Déclenche 'onstop'
}

// 2. Arrêter la vidéo karaoké
karaokeVideoRef.current.pause();

// 3. Arrêter la webcam
const tracks = (webcamVideoRef.current.srcObject as MediaStream)?.getTracks();
tracks?.forEach((track) => track.stop());

// 4. Fermer le contexte audio
await audioContextRef.current.close();

// 5. Création du Blob (dans onstop)
mediaRecorderRef.current.onstop = () => {
  const blob = new Blob(recordedChunksRef.current, {
    type: 'video/webm'
  });
  
  const url = URL.createObjectURL(blob);
  sessionStorage.setItem('karaoke-review-url', url);
  
  router.push(`/event/${eventId}/review/${songId}`);
};
```

---

#### Phase 5️⃣ : **Review et Upload** (5-15 secondes)

**Page Review** : `app/event/[id]/review/[sessionId]/page.tsx`

```typescript
// 1. Récupérer le Blob depuis SessionStorage
const videoUrl = sessionStorage.getItem('karaoke-review-url');

// 2. Afficher avec ReviewPlayer
<ReviewPlayer videoUrl={videoUrl} />

// 3. Upload vers S3 (optionnel)
await uploadToS3(blob, `karaoke-videos/event_${eventId}/${sessionId}-${timestamp}.webm`);
```

**Upload S3** : `lib/aws.ts`
```typescript
s3.upload({
  Bucket: 'leeveostockage',
  Key: `karaoke-videos/event_${eventId}/${sessionId}-${timestamp}.webm`,
  Body: Buffer.from(buffer),
  ContentType: 'video/webm',
  ACL: 'public-read',
}, (err, data) => {
  // Générer URL signée (7 jours)
  const signedUrl = s3.getSignedUrl('getObject', {
    Bucket: 'leeveostockage',
    Key: filename,
    Expires: 604800
  });
});
```

---

### 🎨 Canvas Compositing (Couches)

```
┌────────────────────────────────┐
│  Couche 1: Webcam              │ ← 100% opacité, effet miroir
│  (avec filtres Snapchat opt.)  │
├────────────────────────────────┤
│  Couche 2: Vidéo Karaoké       │ ← 40% opacité
│  (paroles synchronisées)       │
├────────────────────────────────┤
│  Couche 3: Logo/Watermark      │ ← 100% opacité, coin supérieur droit
│  (personnalisé par événement)  │
└────────────────────────────────┘
         ↓
    Capture 30 FPS
         ↓
    MediaRecorder
         ↓
    Blob WebM (VP8 + Opus)
```

---

### 🎵 Mixage Audio

```
Source Audio 1: Microphone
    ↓
AudioContext.createMediaStreamSource()
    ↓
    ├─→ AudioDestination → MediaRecorder (enregistrement)
    │
Source Audio 2: Karaoké
    ↓
AudioContext.createMediaElementSource()
    ↓
    ├─→ AudioDestination → MediaRecorder (enregistrement)
    └─→ AudioContext.destination → Haut-parleurs (monitoring)
```

**Avantages** :
- ✅ Mixage en temps réel
- ✅ Volume indépendant (micro / karaoké)
- ✅ Monitoring simultané (utilisateur entend tout)

---

### 📦 Format Vidéo Final

```javascript
{
  container: 'WebM',
  videoCodec: 'VP8',
  audioCodec: 'Opus',
  mimeType: 'video/webm;codecs=vp8,opus',
  frameRate: 30, // canvas.captureStream(30)
  resolution: '1280x720', // Basé sur webcam
  videoBitrate: '~2.5 Mbps',
  audioBitrate: '~128 kbps',
  tailleMoyenne: '5-15 MB pour 3 minutes'
}
```

---

### 🎛️ Filtres Snapchat Camera Kit (Optionnel)

**Activation** :
```typescript
const [useSnapFilters, setUseSnapFilters] = useState(false);

// Dans drawFrame()
if (useSnapFilters && session?.output?.live) {
  // Camera Kit fournit le canvas déjà filtré
  ctx.drawImage(session.output.live, 0, 0, canvas.width, canvas.height);
} else {
  // Webcam brute
  ctx.drawImage(webcamVideoRef.current, 0, 0, canvas.width, canvas.height);
}
```

**Filtres disponibles** :
- Beautification
- AR effects
- Color grading
- Face tracking

---

### ⚡ Optimisations Performances

#### 1. Canvas Rendering
```typescript
// Limiter à 60 FPS natif (requestAnimationFrame)
// Capture à 30 FPS (canvas.captureStream(30))
// Résolution adaptative selon appareil
```

#### 2. Gestion Mémoire
```typescript
// Libérer les Blobs après usage
URL.revokeObjectURL(videoUrl);
sessionStorage.removeItem('karaoke-review-url');
```

#### 3. Audio Context
```typescript
// Réutiliser le contexte (éviter créations multiples)
if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
  audioContextRef.current = new AudioContext();
}
```

#### 4. Compression Adaptative
```typescript
// Ajuster selon connexion
const options = {
  videoBitsPerSecond: isMobile ? 1500000 : 2500000,
  audioBitsPerSecond: 128000
};
```

---

### 🐛 Gestion des Erreurs

#### Erreur 1 : **NotAllowedError** (Permissions refusées)
```typescript
catch (error) {
  if (error.name === 'NotAllowedError') {
    alert('Veuillez autoriser l\'accès à la caméra et au microphone');
  }
}
```

#### Erreur 2 : **Play() Interrupted**
```typescript
// Intercepteur pour ignorer les erreurs play() non critiques
console.error = function(...args) {
  const errorMessage = args.join(' ');
  if (errorMessage.includes('play() request was interrupted')) {
    return; // Ignorer
  }
  return originalConsoleError.apply(console, args);
};
```

#### Erreur 3 : **CORS Logo**
```typescript
const img = new Image();
img.crossOrigin = "anonymous"; // OBLIGATOIRE pour Canvas
img.src = logoUrl;
```

#### Erreur 4 : **Audio Context Suspended**
```typescript
if (audioContext.state === 'suspended') {
  await audioContext.resume();
}
```

---

### 📱 Support Mobile

**Adaptations iOS/Android** :
```typescript
// Forcer inline pour iOS
<video playsInline muted />

// Résolution adaptée
const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);
const constraints = {
  video: {
    width: { ideal: isMobile ? 720 : 1280 },
    height: { ideal: isMobile ? 480 : 720 }
  }
};

// Orientation paysage (optionnel)
screen.orientation.lock('landscape').catch(() => {});
```

---

### 📊 Diagramme de Séquence

```
Utilisateur → Composant: Cliquer "Préparez-vous !"
Composant → Webcam: getUserMedia()
Webcam → Composant: MediaStream (vidéo + audio)
Composant → S3: Charger vidéo karaoké
S3 → Composant: Vidéo prête
Composant → Supabase: Charger logo
Supabase → Composant: Image logo
Composant → Canvas: Démarrer drawFrame() loop (60 FPS)
Composant → AudioContext: Mixer microphone + karaoké
Composant → MediaRecorder: Créer (canvas + audio)
Composant → MediaRecorder: start()
Composant → Vidéo: play()
Composant → Audio: play()

[Enregistrement en cours...]

Utilisateur → Composant: Cliquer "Arrêter"
Composant → MediaRecorder: stop()
MediaRecorder → MediaRecorder: Assembler chunks → Blob
Composant → SessionStorage: Sauvegarder URL Blob
Composant → Utilisateur: Redirection /review/[sessionId]

Utilisateur → Composant: Cliquer "Uploader"
Composant → AWS S3: Upload Blob
AWS S3 → Composant: URL signée (7 jours)
Composant → Utilisateur: "Vidéo uploadée ✓"
```

---

### 📈 Métriques Typiques

| Métrique | Valeur |
|----------|--------|
| **Initialisation** | 2-3 secondes |
| **Démarrage enregistrement** | <500ms |
| **Rendu Canvas** | 60 FPS |
| **Capture vidéo** | 30 FPS |
| **Taille chunks** | ~500 KB/sec |
| **Arrêt + Blob** | 1-2 secondes |
| **Upload S3 (3 min)** | 5-15 secondes |
| **Taille finale** | 5-15 MB |

---

### 🛠️ Composants Techniques

| Technologie | Rôle | Fichier |
|-------------|------|---------|
| **getUserMedia** | Accès webcam + micro | `LiveKaraokeRecorder.tsx` |
| **HTML5 Canvas** | Compositing vidéo | `LiveKaraokeRecorder.tsx` |
| **Web Audio API** | Mixage audio | `LiveKaraokeRecorder.tsx` |
| **MediaRecorder** | Enregistrement WebM | `LiveKaraokeRecorder.tsx` |
| **Blob API** | Manipulation fichier | `LiveKaraokeRecorder.tsx` |
| **SessionStorage** | Stockage temporaire | `LiveKaraokeRecorder.tsx` |
| **AWS S3** | Upload vidéo | `lib/aws.ts` |
| **Snapchat Camera Kit** | Filtres AR | `contexts/CameraKitContext.tsx` |

---

### 🔐 Sécurité et Confidentialité

#### Permissions Utilisateur
- ✅ Demande explicite caméra/microphone
- ✅ Indicateur visuel d'enregistrement
- ✅ Possibilité d'arrêter à tout moment

#### Stockage
- ✅ SessionStorage (temporaire, efface à la fermeture)
- ✅ Nettoyage automatique après upload
- ✅ Pas de stockage permanent côté client

#### Upload S3
- ✅ Signed URLs avec expiration (7 jours)
- ✅ Organisation par événement (isolation)
- ✅ ACL configuré selon besoins

---

### 🎓 Résumé du Processus

```
┌──────────────────────────────────────────────────────────┐
│ Phase 1: Init (2-3s)                                     │
│ Webcam + Vidéo + Logo + Canvas + Audio + MediaRecorder  │
├──────────────────────────────────────────────────────────┤
│ Phase 2: Start (<500ms)                                  │
│ Synchroniser et démarrer enregistrement                 │
├──────────────────────────────────────────────────────────┤
│ Phase 3: Record (variable)                               │
│ Boucle rendu 60 FPS + collecte chunks                   │
├──────────────────────────────────────────────────────────┤
│ Phase 4: Stop (1-2s)                                     │
│ Arrêt + assemblage Blob + nettoyage                     │
├──────────────────────────────────────────────────────────┤
│ Phase 5: Review & Upload (5-15s)                        │
│ Lecture locale + envoi S3 + URL signée                  │
└──────────────────────────────────────────────────────────┘
```

**Durée totale** : ~20-30 secondes de setup + durée performance + upload

---

## 🔐 Sécurité

### Bonnes Pratiques Implémentées
- ✅ Credentials AWS non exposés au client (API Routes)
- ✅ Row Level Security (RLS) sur Supabase
- ✅ JWT pour l'authentification
- ✅ Validation des entrées utilisateur
- ✅ CORS configuré correctement
- ✅ Signed URLs pour vidéos privées
- ✅ Variables d'environnement sécurisées

### À Améliorer
- 🔄 Rate limiting sur les API routes
- 🔄 Validation côté serveur plus stricte
- 🔄 Sanitisation des uploads de fichiers
- 🔄 Audit logs pour actions admin
- 🔄 2FA pour comptes admin

---

## 📝 Notes Importantes

### Architecture AWS S3
- Les chansons sont stockées dans `karaokesaas/[catégorie]/`
- Les vidéos sont stockées dans `karaoke-videos/event_[id]/`
- Format vidéo: WebM (compression optimale)
- Région: `eu-west-3` (Paris)

### Supabase Storage
- Images d'événements: `karaokestorage/backgrounds/`
- Logos: `karaokestorage/logos/`
- Accès public pour les images

### Performances
- Cache SessionStorage pour catégories S3
- Images optimisées avec Next.js Image
- Lazy loading des composants
- Code splitting automatique (Next.js)

### Compatibilité
- Navigateurs modernes (Chrome, Firefox, Safari, Edge)
- Support mobile complet
- Responsive design (Tailwind)

---

## 🐛 Problèmes Connus

1. **Erreur AWS Authorization**
   - ✅ **Résolu**: Utilisation d'API Routes server-side

2. **CORS sur S3**
   - ⚠️ Vérifier la configuration CORS du bucket

3. **RLS Supabase**
   - ⚠️ Peut nécessiter des ajustements selon les permissions

4. **FFmpeg Performance**
   - ⚠️ Traitement vidéo peut être lent en dev

---

## 📞 Support et Contact

- **Email Support**: support@karaoke.example.com
- **Documentation**: [README.md](./README.md)
- **Issues**: GitHub Issues

---

## 📄 Licence

Projet propriétaire - Tous droits réservés

---

**Dernière mise à jour**: 25 Novembre 2025  
**Version**: 0.1.0  
**Auteur**: KaraokeSaaS Team

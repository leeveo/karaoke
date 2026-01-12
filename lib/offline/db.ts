import { IDBPDatabase, openDB } from 'idb';

/**
 * IndexedDB Schema for Offline Mode
 * Stores: offlineEvents, offlineSongs, recordedVideos, syncStatus
 */

export interface OfflineEvent {
  id: string;
  name: string;
  description?: string;
  customization: {
    primary_color: string;
    secondary_color: string;
    logo?: string;
    background_image?: string;
    logoBlob?: Blob;
    backgroundBlob?: Blob;
    backgroundImageBlob?: Blob;
    logoUrl?: string;
  };
}

export interface OfflineSong {
  id: string;
  title: string;
  artist: string;
  categoryId: string;
  blob: Blob;
  size: number;
  key: string;
  imageBlob?: Blob;
  imageUrl?: string;
}

export interface RecordedVideo {
  id: string;
  sessionId: string;
  userEmail: string;
  videoBlob: Blob;
  timestamp: number;
  status: 'pending' | 'uploading' | 'synced' | 'failed';
  s3Key?: string;
  s3Url?: string;
  errorMessage?: string;
}

export interface SyncStatus {
  eventId: string;
  lastSync: number;
  syncState: 'idle' | 'syncing' | 'error';
  pendingVideos: number;
  syncedVideos: number;
}

const DB_NAME = 'karaoke-offline-db';
const DB_VERSION = 1;

let db: IDBPDatabase | null = null;

/**
 * Initialize IndexedDB
 */
export async function initDB(): Promise<IDBPDatabase> {
  if (db) return db;

  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Store 1: Offline Events
      if (!db.objectStoreNames.contains('offlineEvents')) {
        db.createObjectStore('offlineEvents', { keyPath: 'id' });
      }

      // Store 2: Offline Songs
      if (!db.objectStoreNames.contains('offlineSongs')) {
        const songStore = db.createObjectStore('offlineSongs', { keyPath: 'id' });
        songStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      // Store 3: Recorded Videos
      if (!db.objectStoreNames.contains('recordedVideos')) {
        const videoStore = db.createObjectStore('recordedVideos', { keyPath: 'id' });
        videoStore.createIndex('status', 'status', { unique: false });
        videoStore.createIndex('userEmail', 'userEmail', { unique: false });
        videoStore.createIndex('sessionId', 'sessionId', { unique: false });
      }

      // Store 4: Sync Status
      if (!db.objectStoreNames.contains('syncStatus')) {
        db.createObjectStore('syncStatus', { keyPath: 'eventId' });
      }
    },
  });

  return db;
}

/**
 * Get the IndexedDB instance
 */
export async function getDB(): Promise<IDBPDatabase> {
  if (!db) {
    await initDB();
  }
  return db!;
}

/**
 * Store an offline event
 */
export async function storeOfflineEvent(event: OfflineEvent): Promise<void> {
  const database = await getDB();
  await database.put('offlineEvents', event);
}

/**
 * Get offline event by ID
 */
export async function getOfflineEvent(eventId: string): Promise<OfflineEvent | undefined> {
  const database = await getDB();
  return database.get('offlineEvents', eventId);
}

/**
 * Get all offline events
 */
export async function getAllOfflineEvents(): Promise<OfflineEvent[]> {
  const database = await getDB();
  return database.getAll('offlineEvents');
}

/**
 * Delete offline event
 */
export async function deleteOfflineEvent(eventId: string): Promise<void> {
  const database = await getDB();
  await database.delete('offlineEvents', eventId);
}

/**
 * Store offline song
 */
export async function storeOfflineSong(song: OfflineSong): Promise<void> {
  const database = await getDB();
  await database.put('offlineSongs', song);
}

/**
 * Get offline songs by category
 */
export async function getOfflineSongsByCategory(categoryId: string): Promise<OfflineSong[]> {
  const database = await getDB();
  return database.getAllFromIndex('offlineSongs', 'categoryId', categoryId);
}

/**
 * Get offline song by ID
 */
export async function getOfflineSong(songId: string): Promise<OfflineSong | undefined> {
  const database = await getDB();
  return database.get('offlineSongs', songId);
}

/**
 * Delete offline songs for event
 */
export async function deleteOfflineSongsForEvent(eventId: string): Promise<void> {
  const database = await getDB();
  const allSongs = await database.getAll('offlineSongs');
  const songsToDelete = allSongs.filter(song => song.id.startsWith(eventId));
  
  for (const song of songsToDelete) {
    await database.delete('offlineSongs', song.id);
  }
}

/**
 * Store recorded video
 */
export async function storeRecordedVideo(video: RecordedVideo): Promise<void> {
  const database = await getDB();
  await database.put('recordedVideos', video);
}

/**
 * Get recorded video by ID
 */
export async function getRecordedVideo(videoId: string): Promise<RecordedVideo | undefined> {
  const database = await getDB();
  return database.get('recordedVideos', videoId);
}

/**
 * Get all pending videos
 */
export async function getPendingVideos(): Promise<RecordedVideo[]> {
  const database = await getDB();
  return database.getAllFromIndex('recordedVideos', 'status', 'pending');
}

/**
 * Get videos by email
 */
export async function getVideosByEmail(email: string): Promise<RecordedVideo[]> {
  const database = await getDB();
  return database.getAllFromIndex('recordedVideos', 'userEmail', email);
}

/**
 * Get all recorded videos
 */
export async function getAllRecordedVideos(): Promise<RecordedVideo[]> {
  const database = await getDB();
  return database.getAll('recordedVideos');
}

/**
 * Update video status
 */
export async function updateVideoStatus(
  videoId: string,
  status: RecordedVideo['status'],
  s3Url?: string,
  errorMessage?: string
): Promise<void> {
  const database = await getDB();
  const video = await database.get('recordedVideos', videoId);
  
  if (video) {
    video.status = status;
    if (s3Url) video.s3Url = s3Url;
    if (errorMessage) video.errorMessage = errorMessage;
    await database.put('recordedVideos', video);
  }
}

/**
 * Get sync status for event
 */
export async function getSyncStatus(eventId: string): Promise<SyncStatus | undefined> {
  const database = await getDB();
  return database.get('syncStatus', eventId);
}

/**
 * Update sync status
 */
export async function updateSyncStatus(eventId: string, syncState: SyncStatus['syncState']): Promise<void> {
  const database = await getDB();
  
  const videos = await getAllRecordedVideos();
  const pendingVideos = videos.filter(v => v.status === 'pending').length;
  const syncedVideos = videos.filter(v => v.status === 'synced').length;

  await database.put('syncStatus', {
    eventId,
    lastSync: Date.now(),
    syncState,
    pendingVideos,
    syncedVideos,
  });
}

/**
 * Clear all offline data
 */
export async function clearAllOfflineData(): Promise<void> {
  const database = await getDB();
  
  await database.clear('offlineEvents');
  await database.clear('offlineSongs');
  await database.clear('recordedVideos');
  await database.clear('syncStatus');
}

/**
 * Get storage info
 */
export async function getOfflineStorageInfo(): Promise<{
  eventsCount: number;
  songsCount: number;
  videosCount: number;
  pendingVideos: number;
}> {
  const database = await getDB();

  const eventsCount = await database.count('offlineEvents');
  const songsCount = await database.count('offlineSongs');
  const videos = await database.getAll('recordedVideos');
  const pendingVideos = videos.filter(v => v.status === 'pending').length;

  return {
    eventsCount,
    songsCount,
    videosCount: videos.length,
    pendingVideos,
  };
}

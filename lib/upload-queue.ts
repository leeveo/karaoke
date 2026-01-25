/**
 * Service de file d'attente pour l'upload des vidéos en arrière-plan
 * Permet de continuer la navigation pendant que les vidéos s'uploadent
 */

import { uploadToS3 } from './aws';

export interface UploadQueueItem {
  id: string;
  sessionId: string;
  eventId: string;
  blobUrl: string;
  filename: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  s3Url?: string;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

type UploadStatusCallback = (item: UploadQueueItem) => void;

class UploadQueueService {
  private queue: UploadQueueItem[] = [];
  private isProcessing = false;
  private statusCallbacks: Map<string, UploadStatusCallback[]> = new Map();

  /**
   * Ajoute une vidéo à la file d'attente d'upload
   */
  async addToQueue(
    sessionId: string,
    eventId: string,
    blobUrl: string
  ): Promise<string> {
    const id = `upload-${sessionId}-${Date.now()}`;
    const filename = `karaoke-videos/event_${eventId}/${sessionId}-${Date.now()}.webm`;

    const item: UploadQueueItem = {
      id,
      sessionId,
      eventId,
      blobUrl,
      filename,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
    };

    this.queue.push(item);
    console.log(`[UploadQueue] ➕ Ajouté à la queue: ${id}`);

    // Sauvegarder dans sessionStorage pour persistance
    this.saveToStorage();

    // Démarrer le traitement si pas déjà en cours
    this.processQueue();

    return id;
  }

  /**
   * Récupère le statut d'un upload
   */
  getStatus(id: string): UploadQueueItem | undefined {
    return this.queue.find((item) => item.id === id);
  }

  /**
   * Récupère le statut par sessionId
   */
  getStatusBySession(sessionId: string): UploadQueueItem | undefined {
    return this.queue.find((item) => item.sessionId === sessionId);
  }

  /**
   * S'abonner aux mises à jour de statut
   */
  subscribe(sessionId: string, callback: UploadStatusCallback): () => void {
    if (!this.statusCallbacks.has(sessionId)) {
      this.statusCallbacks.set(sessionId, []);
    }
    this.statusCallbacks.get(sessionId)!.push(callback);

    // Retourner la fonction de désabonnement
    return () => {
      const callbacks = this.statusCallbacks.get(sessionId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * Notifier les abonnés d'une mise à jour
   */
  private notifySubscribers(item: UploadQueueItem) {
    const callbacks = this.statusCallbacks.get(item.sessionId);
    if (callbacks) {
      callbacks.forEach((cb) => cb(item));
    }
  }

  /**
   * Traite la file d'attente
   */
  private async processQueue() {
    if (this.isProcessing) return;

    const pendingItem = this.queue.find((item) => item.status === 'pending');
    if (!pendingItem) return;

    this.isProcessing = true;
    console.log(`[UploadQueue] 🚀 Démarrage upload: ${pendingItem.id}`);

    try {
      pendingItem.status = 'uploading';
      pendingItem.progress = 10;
      this.notifySubscribers(pendingItem);
      this.saveToStorage();

      // Récupérer le blob
      const response = await fetch(pendingItem.blobUrl);
      if (!response.ok) {
        throw new Error('Impossible de charger la vidéo locale');
      }
      const blob = await response.blob();

      pendingItem.progress = 30;
      this.notifySubscribers(pendingItem);

      // Upload vers S3
      console.log(`[UploadQueue] 📤 Upload S3: ${pendingItem.filename}`);
      const s3Url = await uploadToS3(blob, pendingItem.filename);

      if (s3Url) {
        pendingItem.status = 'completed';
        pendingItem.progress = 100;
        pendingItem.s3Url = s3Url;
        pendingItem.completedAt = Date.now();
        
        // Sauvegarder l'URL S3 dans sessionStorage pour la page QR
        sessionStorage.setItem(`video-s3-url-${pendingItem.sessionId}`, s3Url);
        sessionStorage.setItem('video-s3-url', s3Url);
        
        console.log(`[UploadQueue] ✅ Upload terminé: ${s3Url}`);
      } else {
        throw new Error('S3 upload returned no URL');
      }
    } catch (error) {
      console.error(`[UploadQueue] ❌ Erreur upload:`, error);
      pendingItem.status = 'failed';
      pendingItem.error = error instanceof Error ? error.message : 'Erreur inconnue';
    }

    this.notifySubscribers(pendingItem);
    this.saveToStorage();
    this.isProcessing = false;

    // Traiter l'élément suivant s'il y en a
    this.processQueue();
  }

  /**
   * Sauvegarde la queue dans sessionStorage
   */
  private saveToStorage() {
    try {
      // On ne sauvegarde que les métadonnées, pas les blobUrls (qui ne sont pas sérialisables)
      const serializable = this.queue.map((item) => ({
        ...item,
        blobUrl: item.status === 'completed' ? '' : item.blobUrl,
      }));
      sessionStorage.setItem('upload-queue', JSON.stringify(serializable));
    } catch (e) {
      console.warn('[UploadQueue] Erreur sauvegarde:', e);
    }
  }

  /**
   * Restaure la queue depuis sessionStorage
   */
  restoreFromStorage() {
    try {
      const stored = sessionStorage.getItem('upload-queue');
      if (stored) {
        const items: UploadQueueItem[] = JSON.parse(stored);
        // Ne restaurer que les items en cours (pas les anciens complétés)
        const recentItems = items.filter(
          (item) =>
            item.status !== 'completed' ||
            Date.now() - (item.completedAt || item.createdAt) < 60 * 60 * 1000 // 1 heure
        );
        this.queue = recentItems;
        console.log(`[UploadQueue] 📥 Restauré ${recentItems.length} items`);
      }
    } catch (e) {
      console.warn('[UploadQueue] Erreur restauration:', e);
    }
  }

  /**
   * Nettoie les anciens uploads terminés
   */
  cleanup() {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.queue = this.queue.filter(
      (item) =>
        item.status !== 'completed' ||
        (item.completedAt && item.completedAt > oneHourAgo)
    );
    this.saveToStorage();
  }
}

// Singleton
export const uploadQueue = new UploadQueueService();

// Restaurer au chargement
if (typeof window !== 'undefined') {
  uploadQueue.restoreFromStorage();
}

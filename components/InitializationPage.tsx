'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Asset {
  id: string;
  title?: string;
  artist?: string;
  url: string;
  type: string;
}

interface InitializationPageProps {
  eventId: string;
}

export default function InitializationPage({ eventId }: InitializationPageProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [status, setStatus] = useState<'initializing' | 'downloading' | 'complete' | 'error'>('initializing');
  const [totalAssets, setTotalAssets] = useState(0);
  const [downloadedAssets, setDownloadedAssets] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [estimatedTime, setEstimatedTime] = useState<string>('');

  useEffect(() => {
    const initializeAssets = async () => {
      try {
        setStatus('initializing');
        setCurrentFile('Récupération de la liste des chansons...');

        // 1. Fetch asset list from API
        const syncResponse = await fetch('/api/sync-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventId })
        });

        if (!syncResponse.ok) {
          throw new Error('Failed to fetch asset list');
        }

        const syncData = await syncResponse.json();
        const allAssets: Asset[] = [...syncData.assets.songs, ...syncData.assets.images];

        setTotalAssets(allAssets.length);
        setEstimatedTime(calculateEstimatedTime(allAssets.length));

        // Check if assets are already cached in IndexedDB
        const idbAssets = await getAssetsFromIDB();
        const missingAssets = allAssets.filter(
          asset => !idbAssets.some(cached => cached.id === asset.id)
        );

        if (missingAssets.length === 0) {
          // All assets already cached
          setProgress(100);
          setStatus('complete');
          setTimeout(() => router.push(`/event/${eventId}`), 1000);
          return;
        }

        setStatus('downloading');
        setCurrentFile(`Téléchargement: ${missingAssets.length} fichiers manquants...`);

        // 2. Download missing assets in parallel
        let downloaded = 0;
        const downloadPromises = missingAssets.map(async (asset) => {
          try {
            setCurrentFile(`Téléchargement: ${asset.title || asset.id}...`);
            const blob = await fetchWithRetry(asset.url);
            await saveAssetToIDB(eventId, { ...asset, blob });
            
            downloaded++;
            setDownloadedAssets(downloaded);
            setProgress(Math.round((downloaded / missingAssets.length) * 100));
          } catch (error) {
            console.error(`Failed to download ${asset.id}:`, error);
            // Continue with other assets
          }
        });

        await Promise.allSettled(downloadPromises);

        setProgress(100);
        setStatus('complete');
        setCurrentFile('✅ Prêt!');
        
        // Redirect after a short delay
        setTimeout(() => router.push(`/event/${eventId}`), 2000);

      } catch (error) {
        console.error('Initialization error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Une erreur est survenue');
      }
    };

    initializeAssets();
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎤</div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Karaoke Offline
          </h1>
          <p className="text-purple-200 text-sm">
            {status === 'initializing' && 'Initialisation en cours...'}
            {status === 'downloading' && 'Téléchargement des chansons...'}
            {status === 'complete' && 'Prêt à utiliser!'}
            {status === 'error' && 'Une erreur est survenue'}
          </p>
        </div>

        {/* Progress Card */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-8 mb-6">
          {/* Current File */}
          {currentFile && (
            <div className="mb-6">
              <p className="text-purple-200 text-sm font-medium truncate">
                {currentFile}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="relative h-3 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Progress Text */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-2xl font-bold text-white">{progress}%</p>
              <p className="text-purple-200 text-xs mt-1">
                {downloadedAssets}/{totalAssets}
              </p>
            </div>
            <div className="text-right">
              {estimatedTime && status === 'downloading' && (
                <p className="text-purple-200 text-sm">
                  Temps restant: <span className="font-semibold">{estimatedTime}</span>
                </p>
              )}
            </div>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'initializing' && (
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
              </div>
            )}
            {status === 'downloading' && (
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-4 border-pink-500/20 border-t-pink-500 rounded-full animate-spin" />
              </div>
            )}
            {status === 'complete' && (
              <div className="text-4xl">✅</div>
            )}
            {status === 'error' && (
              <div className="text-4xl">❌</div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {status === 'error' && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 w-full px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg transition-colors font-medium"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-200 text-xs leading-relaxed">
            <strong>ℹ️ Note:</strong> Les chansons et images sont téléchargées une seule fois et stockées localement.
            Les démarrages suivants seront beaucoup plus rapides!
          </p>
        </div>
      </div>
    </div>
  );
}

// ============ HELPERS ============

async function fetchWithRetry(url: string, maxRetries = 3): Promise<Blob> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Range': 'bytes=0-'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
  throw new Error('Failed to fetch');
}

async function getAssetsFromIDB() {
  try {
    const db = await openIDB();
    const tx = db.transaction(['events', 'songs', 'images'], 'readonly');
    
    return new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
      const songsRequest = tx.objectStore('songs').getAll();
      const imagesRequest = tx.objectStore('images').getAll();
      
      let songResults: Record<string, unknown>[] = [];
      let imageResults: Record<string, unknown>[] = [];
      let completed = 0;
      
      songsRequest.onsuccess = () => {
        songResults = songsRequest.result;
        completed++;
        if (completed === 2) {
          resolve([...songResults, ...imageResults]);
        }
      };
      
      imagesRequest.onsuccess = () => {
        imageResults = imagesRequest.result;
        completed++;
        if (completed === 2) {
          resolve([...songResults, ...imageResults]);
        }
      };
      
      songsRequest.onerror = () => reject(songsRequest.error);
      imagesRequest.onerror = () => reject(imagesRequest.error);
    });
  } catch {
    return [];
  }
}

async function saveAssetToIDB(eventId: string, asset: Record<string, unknown>) {
  const db = await openIDB();
  
  if (asset.type === 'video/mp4') {
    const tx = db.transaction(['songs'], 'readwrite');
    await tx.objectStore('songs').put({
      id: asset.id,
      title: asset.title,
      artist: asset.artist,
      eventId,
      blob: asset.blob,
      cachedAt: new Date().toISOString()
    });
  } else {
    const tx = db.transaction(['images'], 'readwrite');
    await tx.objectStore('images').put({
      id: asset.id,
      type: asset.type,
      eventId,
      blob: asset.blob,
      cachedAt: new Date().toISOString()
    });
  }
}

async function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('KaraokeDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('events')) {
        db.createObjectStore('events', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('songs')) {
        db.createObjectStore('songs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('images')) {
        db.createObjectStore('images', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('recordings')) {
        db.createObjectStore('recordings', { keyPath: 'id' });
      }
    };
  });
}

function calculateEstimatedTime(fileCount: number): string {
  // Assume average 2MB/s download speed
  const avgFileSize = 10; // 10 MB per song
  const estimatedSeconds = (fileCount * avgFileSize) / 2;
  
  if (estimatedSeconds < 60) {
    return `${Math.round(estimatedSeconds)}s`;
  } else if (estimatedSeconds < 3600) {
    return `${Math.round(estimatedSeconds / 60)}min`;
  } else {
    const hours = Math.round(estimatedSeconds / 3600);
    const mins = Math.round((estimatedSeconds % 3600) / 60);
    return `${hours}h ${mins}min`;
  }
}

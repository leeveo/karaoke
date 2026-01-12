'use client';

import { useCallback, useState, useEffect } from 'react';
import {
  storeOfflineEvent,
  getOfflineEvent,
  storeOfflineSong,
  getOfflineSongsByCategory,
  storeRecordedVideo,
  getRecordedVideo,
  getPendingVideos,
  getVideosByEmail,
  updateVideoStatus,
  OfflineEvent,
  OfflineSong,
  RecordedVideo,
  initDB,
} from '@/lib/offline/db';

/**
 * Hook for offline database operations
 */
export function useIndexedDB() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initDB();
      setIsInitialized(true);
    };
    init();
  }, []);

  const saveOfflineEvent = useCallback(async (event: OfflineEvent) => {
    await storeOfflineEvent(event);
  }, []);

  const loadOfflineEvent = useCallback(async (eventId: string) => {
    return await getOfflineEvent(eventId);
  }, []);

  const saveOfflineSong = useCallback(async (song: OfflineSong) => {
    await storeOfflineSong(song);
  }, []);

  const loadOfflineSongsByCategory = useCallback(async (categoryId: string) => {
    return await getOfflineSongsByCategory(categoryId);
  }, []);

  const saveRecordedVideo = useCallback(async (video: RecordedVideo) => {
    await storeRecordedVideo(video);
  }, []);

  const loadRecordedVideo = useCallback(async (videoId: string) => {
    return await getRecordedVideo(videoId);
  }, []);

  const loadPendingVideos = useCallback(async () => {
    return await getPendingVideos();
  }, []);

  const loadVideosByEmail = useCallback(async (email: string) => {
    return await getVideosByEmail(email);
  }, []);

  const updateVideoUploadStatus = useCallback(
    async (videoId: string, status: RecordedVideo['status'], s3Url?: string) => {
      await updateVideoStatus(videoId, status, s3Url);
    },
    []
  );

  return {
    isInitialized,
    saveOfflineEvent,
    loadOfflineEvent,
    saveOfflineSong,
    loadOfflineSongsByCategory,
    saveRecordedVideo,
    loadRecordedVideo,
    loadPendingVideos,
    loadVideosByEmail,
    updateVideoUploadStatus,
  };
}

/**
 * Hook to detect online/offline status
 * Supports offline mode simulator for testing
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    // Check if simulator is enabled
    const isSimulatorEnabled = sessionStorage.getItem('offline_mode_simulated') === 'true';
    setIsSimulating(isSimulatorEnabled);
    
    // Set initial state based on actual network + simulator
    const actualOnline = navigator.onLine;
    setIsOnline(isSimulatorEnabled ? false : actualOnline);

    const handleOnline = () => {
      const isSimulated = sessionStorage.getItem('offline_mode_simulated') === 'true';
      setIsOnline(isSimulated ? false : true);
      setIsSimulating(isSimulated);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };
    
    // Listen for simulator changes
    const handleSimulatorChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newState = customEvent.detail?.isSimulating || false;
      setIsSimulating(newState);
      setIsOnline(newState ? false : navigator.onLine);
      console.log(`[useOnlineStatus] Simulator changed: ${newState ? 'offline' : 'online'}`);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-simulator-changed', handleSimulatorChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-simulator-changed', handleSimulatorChange);
    };
  }, []);

  return isOnline;
}

/**
 * Hook for service worker registration
 */
export function useServiceWorker() {
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const registerSW = async () => {
      if (!('serviceWorker' in navigator)) {
        setError('Service Workers not supported');
        return;
      }

      try {
        const registration = await navigator.serviceWorker.register('/offline-worker.js');
        console.log('[ServiceWorker] Registered successfully:', registration);
        setRegistered(true);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[ServiceWorker] Registration failed:', err);
        setError(errorMsg);
      }
    };

    registerSW();
  }, []);

  return { registered, error };
}

/**
 * Hook to download event for offline mode
 */
export function useDownloadEventOffline() {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { saveOfflineEvent, saveOfflineSong } = useIndexedDB();
  const { registered: swRegistered } = useServiceWorker();

  const downloadEventOffline = useCallback(
    async (eventId: string) => {
      try {
        setIsDownloading(true);
        setError(null);
        setProgress(0);

        console.log(`[useDownloadEventOffline] Starting download for event: ${eventId}`);

        // Fetch event from API
        const eventResponse = await fetch(`/api/songs?action=event&id=${eventId}`);
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event');
        }
        const eventData = await eventResponse.json();
        setProgress(10);

        // Fetch all songs for the event
        const songsResponse = await fetch(`/api/songs?action=songs&eventId=${eventId}`);
        if (!songsResponse.ok) {
          throw new Error('Failed to fetch songs');
        }
        const songsData = await songsResponse.json();
        const songs = songsData.songs || [];
        setProgress(15);

        // Store event with customization
        await saveOfflineEvent({
          id: eventData.id,
          name: eventData.name,
          description: eventData.description,
          customization: eventData.customization || {},
        });

        console.log(`[useDownloadEventOffline] Event stored. Downloading ${songs.length} songs...`);
        setProgress(20);

        // Download all songs with their blobs
        const totalSongs = songs.length;
        for (let i = 0; i < totalSongs; i++) {
          const song = songs[i];

          try {
            console.log(`[useDownloadEventOffline] Downloading song: ${song.title}`);
            
            // Fetch song blob from S3
            const songResponse = await fetch(song.url);
            if (!songResponse.ok) {
              throw new Error(`Failed to fetch song: ${song.title}`);
            }
            const blob = await songResponse.blob();

            await saveOfflineSong({
              id: `${eventId}-${song.key}`,
              title: song.title,
              artist: song.artist,
              categoryId: song.categoryId,
              blob,
              size: blob.size,
              key: song.key,
            });

            console.log(`[useDownloadEventOffline] Song saved: ${song.title}`);
          } catch (err) {
            console.warn(`[useDownloadEventOffline] Failed to download song ${song.key}:`, err);
          }

          setProgress(20 + ((i + 1) / totalSongs) * 60);
        }

        setProgress(100);
        setIsDownloading(false);

        console.log(`[useDownloadEventOffline] Download complete for event: ${eventId}`);
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error(`[useDownloadEventOffline] Error:`, err);
        setError(errorMsg);
        setIsDownloading(false);
        return false;
      }
    },
    [saveOfflineEvent, saveOfflineSong]
  );

  return {
    downloadEventOffline,
    isDownloading,
    progress,
    error,
    swRegistered,
  };
}

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

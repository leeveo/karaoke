'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getOfflineStorageInfo } from '@/lib/offline/db';
import { setupAutoSync, SyncProgress, isSyncInProgress } from '@/lib/offline/sync';

export interface OfflineContextType {
  isOnline: boolean;
  isSyncing: boolean;
  syncProgress: SyncProgress;
  pendingVideos: number;
  storageInfo: {
    eventsCount: number;
    songsCount: number;
    videosCount: number;
    pendingVideos: number;
  } | null;
  offlineModeEnabled: boolean;
  setOfflineModeEnabled: (enabled: boolean) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export function OfflineProvider({ children, eventId }: { children: ReactNode; eventId?: string }) {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress>({ total: 0, completed: 0, failed: 0, progress: 0 });
  const [storageInfo, setStorageInfo] = useState<OfflineContextType['storageInfo']>(null);
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[OfflineContext] Online');
      setIsOnline(true);
    };

    const handleOffline = () => {
      console.log('[OfflineContext] Offline');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Monitor sync status
  useEffect(() => {
    const checkSyncStatus = () => {
      setIsSyncing(isSyncInProgress());
    };

    const interval = setInterval(checkSyncStatus, 500);

    return () => clearInterval(interval);
  }, []);

  // Update storage info
  useEffect(() => {
    const updateStorageInfo = async () => {
      const info = await getOfflineStorageInfo();
      setStorageInfo(info);
    };

    updateStorageInfo();
    const interval = setInterval(updateStorageInfo, 2000);

    return () => clearInterval(interval);
  }, []);

  // Setup auto-sync when back online
  useEffect(() => {
    if (eventId && isOnline) {
      setupAutoSync(eventId);
    }
  }, [eventId, isOnline]);

  const value: OfflineContextType = {
    isOnline,
    isSyncing,
    syncProgress,
    pendingVideos: storageInfo?.pendingVideos ?? 0,
    storageInfo,
    offlineModeEnabled,
    setOfflineModeEnabled,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

/**
 * Hook to use offline context
 */
export function useOfflineContext(): OfflineContextType {
  const context = useContext(OfflineContext);

  if (context === undefined) {
    throw new Error('useOfflineContext must be used within OfflineProvider');
  }

  return context;
}

/**
 * Hook for offline mode utilities
 */
export function useOfflineMode() {
  const { isOnline, isSyncing, syncProgress, pendingVideos, offlineModeEnabled } = useOfflineContext();

  return {
    isOffline: !isOnline,
    isOnline,
    canRecord: true, // Always possible
    canUpload: isOnline, // Only when online
    isSyncing,
    syncProgress,
    pendingVideos,
    offlineModeEnabled,
    showOfflineIndicator: !isOnline,
  };
}

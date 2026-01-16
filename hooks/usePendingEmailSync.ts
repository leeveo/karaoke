/**
 * Hook pour synchroniser les emails en attente quand l'app monte
 * ou quand on revient online
 */

import { useEffect, useRef } from 'react';
import { syncPendingEmails } from '@/lib/offline/pendingEmailSync';

export function usePendingEmailSync() {
  const syncInProgressRef = useRef(false);

  useEffect(() => {
    // Vérifier au montage si on a des emails en attente et si on est online
    const checkAndSync = async () => {
      if (!navigator.onLine) {
        console.log('[usePendingEmailSync] Offline, skipping initial sync');
        return;
      }

      if (syncInProgressRef.current) {
        console.log('[usePendingEmailSync] Sync already in progress, skipping');
        return;
      }

      syncInProgressRef.current = true;
      try {
        const result = await syncPendingEmails();
        console.log('[usePendingEmailSync] Initial sync result:', result);
      } catch (error) {
        console.error('[usePendingEmailSync] Error during initial sync:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    checkAndSync();

    // Écouter l'événement "online" pour synchroniser quand on revient online
    const handleOnline = async () => {
      console.log('[usePendingEmailSync] Online detected, starting sync...');
      
      if (syncInProgressRef.current) {
        console.log('[usePendingEmailSync] Sync already in progress, waiting...');
        return;
      }

      syncInProgressRef.current = true;
      try {
        const result = await syncPendingEmails();
        console.log('[usePendingEmailSync] Sync result:', result);
      } catch (error) {
        console.error('[usePendingEmailSync] Error during sync:', error);
      } finally {
        syncInProgressRef.current = false;
      }
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, []);
}

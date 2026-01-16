'use client';

import { usePendingEmailSync } from '@/hooks/usePendingEmailSync';

/**
 * Composant wrapper client pour gérer la synchronisation des emails offline
 * Ce composant utilise le hook usePendingEmailSync pour synchroniser automatiquement
 */
export function OfflineEmailSyncProvider({ children }: { children: React.ReactNode }) {
  usePendingEmailSync();

  return <>{children}</>;
}

'use client';

import React from 'react';
import { useOfflineMode } from '@/contexts/OfflineContext';

export function OfflineIndicator() {
  const { isOffline, isSyncing, syncProgress } = useOfflineMode();

  if (!isOffline && !isSyncing) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 max-w-sm">
      {isOffline && !isSyncing && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 animate-pulse"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-sm">🔴 Mode Hors Ligne</p>
            <p className="text-xs opacity-90">Les vidéos seront synchronisées</p>
          </div>
        </div>
      )}

      {isSyncing && (
        <div className="bg-blue-500 text-white px-4 py-3 rounded-lg shadow-lg">
          <p className="font-semibold text-sm mb-2">🔄 Synchronisation en cours...</p>

          {/* Progress bar */}
          <div className="w-full bg-blue-400 rounded-full h-2 overflow-hidden">
            <div
              className="bg-white h-full transition-all duration-300"
              style={{ width: `${syncProgress.progress}%` }}
            />
          </div>

          <p className="text-xs mt-2 opacity-90">
            {syncProgress.completed}/{syncProgress.total} vidéos •{' '}
            {syncProgress.failed > 0 && `${syncProgress.failed} échouées`}
          </p>
        </div>
      )}
    </div>
  );
}

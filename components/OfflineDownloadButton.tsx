'use client';

import React, { useState } from 'react';
import { useDownloadEventOffline } from '@/hooks/useOfflineMode';
import { Event } from '@/types/event';

interface OfflineDownloadButtonProps {
  event: Event;
  className?: string;
}

export function OfflineDownloadButton({ event, className = '' }: OfflineDownloadButtonProps) {
  const { downloadEventOffline } = useDownloadEventOffline();
  const [isDownloading, setIsDownloading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleDownload = async () => {
    try {
      setIsDownloading(true);
      setMessage(null);
      
      console.log(`[OfflineDownload] Starting download for event: ${event.id}`);
      
      const success = await downloadEventOffline(event.id);
      
      if (success) {
        setMessage({ 
          type: 'success', 
          text: `✅ ${event.name} téléchargé pour utilisation hors ligne!` 
        });
        console.log(`[OfflineDownload] Successfully downloaded event: ${event.id}`);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Erreur lors du téléchargement. Vérifiez votre connexion.' 
        });
        console.error(`[OfflineDownload] Failed to download event: ${event.id}`);
      }
    } catch (error) {
      console.error('[OfflineDownload] Error:', error);
      setMessage({ 
        type: 'error', 
        text: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}` 
      });
    } finally {
      setIsDownloading(false);
      // Clear message after 5 seconds
      if (message?.type === 'success') {
        setTimeout(() => setMessage(null), 5000);
      }
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <button
        onClick={handleDownload}
        disabled={isDownloading}
        className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
          isDownloading
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
            : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
        }`}
      >
        {isDownloading ? (
          <>
            <span className="animate-spin">⏳</span>
            Téléchargement...
          </>
        ) : (
          <>
            <span>⬇️</span>
            Télécharger pour hors ligne
          </>
        )}
      </button>
      
      {message && (
        <div className={`p-3 rounded-lg text-sm font-medium ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
}

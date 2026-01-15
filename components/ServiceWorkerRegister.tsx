'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    // Register service worker for offline support
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/offline-worker.js')
        .then((registration) => {
          console.log('[SW] ServiceWorker enregistré avec succès:', registration);
        })
        .catch((error) => {
          console.error('[SW] Erreur lors de l\'enregistrement du ServiceWorker:', error);
        });
    }
  }, []);

  return null; // Ce composant n'affiche rien
}

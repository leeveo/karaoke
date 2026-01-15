'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Unregister existing ServiceWorkers first to avoid conflicts
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (let registration of registrations) {
          registration.unregister();
          console.log('[SW] Unregistered existing ServiceWorker');
        }
      });

      // Only register if NOT online
      if (!navigator.onLine) {
        navigator.serviceWorker
          .register('/offline-worker.js')
          .then((registration) => {
            console.log('[SW] ServiceWorker enregistré avec succès:', registration);
          })
          .catch((error) => {
            console.error('[SW] Erreur lors de l\'enregistrement du ServiceWorker:', error);
          });
      } else {
        console.log('[SW] Online mode - ServiceWorker not registered');
      }
    }
  }, []);

  return null; // Ce composant n'affiche rien
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClearCachePage() {
  const [cleared, setCleared] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Auto-clear au chargement de la page
    handleClearCache();
  }, []);

  const handleClearCache = async () => {
    // Vider tout le sessionStorage
    sessionStorage.clear();
    
    // Vider les entrées localStorage liées aux couleurs d'événements
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('event-') && key.includes('-colors')) {
        localStorage.removeItem(key);
      }
    });
    
    // Désinscrire tous les service workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // Vider le cache du navigateur
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    }
    
    setCleared(true);
    
    // Rediriger vers la page d'accueil après 2 secondes
    setTimeout(() => {
      router.push('/');
    }, 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)'
      }}
    >
      <div className="text-center p-8 rounded-xl max-w-md"
        style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <h1 className="text-3xl font-bold text-white mb-4">
          🎨 Vidage du cache des couleurs
        </h1>
        
        {!cleared ? (
          <div>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Nettoyage en cours...</p>
          </div>
        ) : (
          <div>
            <div className="text-green-400 text-5xl mb-4">✅</div>
            <p className="text-white mb-2">Cache vidé avec succès !</p>
            <p className="text-gray-300 text-sm">Redirection vers l&apos;accueil...</p>
          </div>
        )}
        
        <button
          onClick={handleClearCache}
          className="mt-6 px-6 py-3 rounded-lg font-bold text-white"
          style={{
            background: 'linear-gradient(135deg, #8b7355, #c9a875)',
            transition: 'transform 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          Vider à nouveau
        </button>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { createEvent } from '@/lib/supabase/events';
import { EventInput } from '@/types/event';
import { ensureDevelopmentUser, getCurrentUser } from '@/lib/supabase/auth';

export default function CreateEventPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<{email?: string; id?: string}>({});

  // Vérifier l'authentification
  useEffect(() => {
    async function checkAuth() {
      try {
        // Pour le développement, passer l'email et le mot de passe souhaités
        const devUser = await ensureDevelopmentUser('marcmenu707@gmail.com', 'ViE51800!');
        if (devUser) {
          setUser(devUser);
          console.log('Utilisateur de développement prêt:', devUser.email);
        } else {
          // En production, vérifier simplement l'utilisateur actuel
          const currentUser = await getCurrentUser();
          setUser(currentUser);
          
          if (!currentUser) {
            setError('Vous devez être connecté pour créer un événement.');
          }
        }
      } catch (err) {
        console.error('Erreur lors de la vérification de l\'authentification:', err);
        setError('Erreur d\'authentification');
      } finally {
        setIsReady(true);
      }
    }
    
    checkAuth();
  }, []);

  // Replace 'any' with a more specific type (EventInput)
  const handleSubmit = async (eventData: EventInput) => {
    try {
      setIsSubmitting(true);
      await createEvent(eventData); // Don't save the unused eventId
      router.push('/admin/events');
    } catch (error) {
      console.error("Error creating event:", error);
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return (
      <div className="p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6" onClick={() => sessionStorage.removeItem('recent-preview-click')}>
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Créer un Nouvel Événement</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {user && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Connecté en tant que: {user.email || user.id}
              </p>
            </div>
          </div>
        </div>
      )}
      
      <EventForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </div>
  );
}

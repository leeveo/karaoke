'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { createEvent } from '@/lib/supabase/events';
import { EventInput } from '@/types/event';
import { ensureDevelopmentUser, getCurrentUser } from '@/lib/supabase/auth';

export default function CreateEventPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Créer un Nouvel Événement</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Remove the isSubmitting prop that's causing the type error */}
      <EventForm onSubmit={handleSubmit} />
    </div>
  );
}

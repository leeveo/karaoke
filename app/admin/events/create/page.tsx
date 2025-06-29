'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { createEvent } from '@/lib/supabase/events';
import { EventInput } from '@/types/event';

function getUserIdFromCookie(): string | null {
  if (typeof document === 'undefined') return null;
  try {
    const cookies = document.cookie.split(';').map(c => c.trim());
    // Log cookies pour debug
    console.log('[CreateEventPage] Cookies:', cookies);
    const tokenCookie =
      cookies.find(c => c.startsWith('shared_auth_token=')) ||
      cookies.find(c => c.startsWith('admin_session='));
    console.log('[CreateEventPage] Token cookie:', tokenCookie);
    if (tokenCookie) {
      const token = tokenCookie.split('=')[1];
      console.log('[CreateEventPage] Encoded token:', token);
      const decodedToken = decodeURIComponent(token);
      console.log('[CreateEventPage] Decoded token:', decodedToken);
      const userData = JSON.parse(atob(decodedToken));
      console.log('[CreateEventPage] userData:', userData);
      if (userData.userId) {
        return userData.userId;
      }
    }
  } catch (err) {
    console.error('[CreateEventPage] Error decoding userId from cookie:', err);
  }
  return null;
}

export default function CreateEventPage() {
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();

  // Récupérer l'id utilisateur connecté
  useEffect(() => {
    const id = getUserIdFromCookie();
    if (!id) {
      setError('Vous devez être connecté pour créer un événement.');
    }
    setUserId(id);
    setIsReady(true);
  }, []);

  const handleSubmit = async (eventData: EventInput) => {
    // Ajoute ce log pour vérifier la présence du userId
    console.log('[CreateEventPage] userId utilisé pour création:', userId);
    if (!userId) {
      setError('Impossible de créer l\'événement : utilisateur non authentifié.');
      return;
    }
    try {
      // Ajoute le user_id à l'event
      const eventWithUser = { ...eventData, user_id: userId };
      console.log('[CreateEventPage] Event envoyé à createEvent:', eventWithUser);
      await createEvent(eventWithUser);
      router.push('/admin/events');
    } catch (error) {
      console.error("Error creating event:", error);
      setError("Création impossible: " + (error as Error).message);
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
      
      <EventForm onSubmit={handleSubmit} />
    </div>
  );
}

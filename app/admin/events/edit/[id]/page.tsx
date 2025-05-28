'use client';

import React, { useState, useEffect } from 'react';
// Remove unused import
import { useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { fetchEventById, updateEvent } from '@/lib/supabase/events';
import { Event, EventInput } from '@/types/event';

export default function EditEventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  // Use setLoading in useEffect to fix the unused variable warning
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadEvent() {
      try {
        const eventData = await fetchEventById(params.id);
        setEvent(eventData);
      } catch (error) {
        console.error("Error loading event:", error);
      } finally {
        setLoading(false); // Now using setLoading
      }
    }
    
    loadEvent();
  }, [params.id]);

  // Transformer les données de l'événement pour le formulaire
  const getFormData = (): EventInput | undefined => {
    if (!event) return undefined;
    
    // S'assurer que toutes les propriétés requises sont présentes
    return {
      name: event.name,
      date: event.date,
      customization: {
        primary_color: event.customization?.primary_color || '#0334b9',
        secondary_color: event.customization?.secondary_color || '#2fb9db',
        background_image: event.customization?.background_image || '',
        logo: event.customization?.logo || '',
      }
    };
  };

  // Remplacer any par le type approprié
  const handleSubmit = async (eventData: EventInput) => {
    try {
      await updateEvent(params.id, eventData);
      router.push('/admin/events');
    } catch (error) {
      console.error("Failed to update event:", error);
    }
  };

  // Fix unescaped apostrophe
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Modifier l&apos;Événement</h1>
      
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
      
      {isSuccess && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">Un événement a été mis à jour avec succès. Redirection...</p>
            </div>
          </div>
        </div>
      )}
      
      {event && (
        <EventForm 
          onSubmit={handleSubmit} 
          initialData={getFormData()} 
        />
      )}
      {loading && <p className="mt-2 text-gray-600">Chargement de l&apos;événement...</p>}
    </div>
  );
}
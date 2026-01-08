'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { fetchEventById, updateEvent } from '@/lib/supabase/events';
import { Event, EventInput } from '@/types/event';

export default function EditEventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    async function loadEvent() {
      try {
        const eventData = await fetchEventById(id);
        setEvent(eventData);
      } catch (error) {
        console.error('Failed to load event:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadEvent();
  }, [id]);

  const handleSubmit = async (eventData: EventInput) => {
    try {
      console.log("EditEventPage: Submitting data:", JSON.stringify(eventData, null, 2));
      const success = await updateEvent(id, eventData);
      if (success) {
        alert('Événement modifié avec succès');
        router.push('/admin/events');
      } else {
        alert('Erreur lors de la modification de l\'événement');
      }
    } catch (error) {
      console.error('Failed to update event:', error);
      alert('Erreur lors de la modification de l\'événement: ' + (error as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="spinner"></div>
        <p className="mt-2 text-gray-600">Chargement de l&apos;événement...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500">Événement non trouvé</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Modifier l&apos;Événement</h1>
      <EventForm 
        onSubmit={handleSubmit} 
        initialData={{
          name: event.name,
          date: event.date,
          customization: event.customization || {
            primary_color: event.customization?.primary_color || '#8b5cf6',
            secondary_color: event.customization?.secondary_color || '#ec4899',
            background_image: event.customization?.background_image || null,
            logo: event.customization?.logo || null
          }
        }} 
      />
    </div>
  );
}
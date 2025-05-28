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
      await updateEvent(id, eventData);
      router.push('/admin/events');
    } catch (error) {
      console.error('Failed to update event:', error);
    }
  };

  // Convert Event to EventInput for the form
  const prepareFormData = (event: Event): EventInput => {
    return {
      name: event.name,
      date: event.date,
      // Remove location as it's not in the EventInput type
      is_active: event.is_active,
      // Ensure customization is not null
      customization: event.customization || {
        primary_color: '#0334b9',
        secondary_color: '#2fb9db',
        background_image: '',
        logo: ''
      }
    };
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
      <EventForm onSubmit={handleSubmit} initialData={prepareFormData(event)} />
    </div>
  );
}

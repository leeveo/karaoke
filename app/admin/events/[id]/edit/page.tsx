'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { fetchEventById, updateEvent } from '@/lib/supabase/events';
import { Event, EventInput } from '@/types/event';

// Fixed props definition to work correctly with Next.js App Router client components
type EditEventPageProps = {
  params: { id: string }
  searchParams?: Record<string, string | string[] | undefined>
}

export default function EditEventPage({ params }: EditEventPageProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = params;

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
      <EventForm onSubmit={handleSubmit} initialData={event} />
    </div>
  );
}

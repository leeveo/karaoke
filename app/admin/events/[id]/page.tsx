'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation'; // Remove unused router import
import Link from 'next/link';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';

export default function EventDetailsPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
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

  // Helper function to get the background image URL
  const getBackgroundImageUrl = (filename: string | undefined) => {
    if (!filename) return undefined;
    
    const { data } = supabase.storage
      .from('karaokestorage')
      .getPublicUrl(`backgrounds/${filename}`);
    
    return data?.publicUrl;
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
        <Link href="/admin/events" className="mt-4 inline-block text-blue-500 hover:underline">
          Retour à la liste des événements
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Détails de l&apos;événement</h1>
        <div className="flex space-x-3">
          <Link 
            href="/admin/events" 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
          >
            Retour
          </Link>
          <Link 
            href={`/admin/events/${id}/edit`} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Modifier
          </Link>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Event header with background */}
        <div 
          className="h-40 bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center relative"
          style={event.customization?.background_image ? {
            backgroundImage: `url(${getBackgroundImageUrl(event.customization.background_image)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          {event.customization?.background_image && (
            <div className="absolute inset-0 bg-black bg-opacity-50"></div>
          )}
          <h2 className="text-3xl font-bold text-white relative z-10">{event.name}</h2>
        </div>

        {/* Event details */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Informations</h3>
              <p><span className="font-medium">Date:</span> {new Date(event.date).toLocaleDateString()}</p>
              <p><span className="font-medium">Lieu:</span> {event.location || 'Non spécifié'}</p>
              <p><span className="font-medium">Statut:</span> {event.is_active ? 'Actif' : 'Inactif'}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Personnalisation</h3>
              {event.customization ? (
                <>
                  <div className="flex items-center mb-2">
                    <span className="font-medium mr-2">Couleur primaire:</span>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: event.customization.primary_color }}></div>
                    <span className="ml-2">{event.customization.primary_color}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-2">Couleur secondaire:</span>
                    <div className="w-6 h-6 rounded-full" style={{ backgroundColor: event.customization.secondary_color }}></div>
                    <span className="ml-2">{event.customization.secondary_color}</span>
                  </div>
                </>
              ) : (
                <p>Aucune personnalisation définie</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Event QR code and sharing information */}
      <div className="mt-6 bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-700 border-b pb-2">Partage</h3>
        <div className="flex flex-col md:flex-row items-center justify-between">
          <div>
            <p className="mb-2">URL de l&apos;événement:</p>
            <div className="bg-gray-100 p-3 rounded text-sm font-mono break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/event/${event.id}` : `/event/${event.id}`}
            </div>
          </div>

          <div className="mt-4 md:mt-0">
            <Link 
              href={`/event/${event.id}`} 
              target="_blank"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M6.672 1.911a1 1 0 10-1.932.518l.259.966a1 1 0 001.932-.518l-.26-.966zM2.429 4.74a1 1 0 10-.517 1.932l.966.259a1 1 0 00.517-1.932l-.966-.26zm8.814-.569a1 1 0 00-1.415-1.414l-.707.707a1 1 0 101.415 1.415l.707-.708zm-7.071 7.072l.707-.707A1 1 0 003.465 9.12l-.708.707a1 1 0 001.415 1.415zm3.2-5.171a1 1 0 00-1.3 1.3l4 10a1 1 0 001.823.075l1.38-2.759 3.018 3.02a1 1 0 001.414-1.415l-3.019-3.02 2.76-1.379a1 1 0 00-.076-1.822l-10-4z" clipRule="evenodd" />
              </svg>
              Voir l&apos;événement
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

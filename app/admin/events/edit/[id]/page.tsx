'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import { fetchEventById, updateEvent } from '@/lib/supabase/events';
import { EventInput, Event } from '@/types/event';
import { supabase } from '@/lib/supabase/client';

export default function EditEventPage() {
  const router = useRouter();
  const { id } = useParams();
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Charger les données de l'événement
  useEffect(() => {
    async function loadEvent() {
      try {
        if (typeof id !== 'string') {
          setError('ID d\'événement invalide');
          setIsReady(true);
          return;
        }
        
        const eventData = await fetchEventById(id);
        console.log("Événement chargé:", eventData);
        
        // Vérifier explicitement que les données de personnalisation sont chargées
        if (!eventData.customization) {
          console.error("Données de personnalisation manquantes");
          setError("Impossible de charger les données de personnalisation");
          setIsReady(true);
          return;
        }
        
        // Ajouter les URLs des images pour la prévisualisation
        if (eventData.customization.background_image) {
          const bgUrlResult = supabase.storage
            .from('karaokestorage')
            .getPublicUrl(`backgrounds/${eventData.customization.background_image}`);
          
          if (bgUrlResult.data?.publicUrl) {
            eventData.customization.backgroundImageUrl = bgUrlResult.data.publicUrl;
          }
        }
        
        // Ajouter l'URL du logo pour la prévisualisation
        if (eventData.customization.logo) {
          const logoUrlResult = supabase.storage
            .from('karaokestorage')
            .getPublicUrl(`logos/${eventData.customization.logo}`);
          
          if (logoUrlResult.data?.publicUrl) {
            eventData.customization.logoUrl = logoUrlResult.data.publicUrl;
            console.log("URL du logo générée:", eventData.customization.logoUrl);
          }
        }
        
        setEvent(eventData);
      } catch (err) {
        console.error('Erreur lors du chargement de l\'événement:', err);
        setError(`Erreur lors du chargement de l'événement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
      } finally {
        setIsReady(true);
      }
    }
    
    loadEvent();
  }, [id]);

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

  const handleSubmit = async (eventData: EventInput) => {
    try {
      setError(null);
      setIsSaving(true);
      
      // Vérification des données requises
      if (!eventData.name || !eventData.date) {
        setError('Le nom et la date sont requis.');
        setIsSaving(false);
        return;
      }
      
      console.log("Données du formulaire à mettre à jour:", JSON.stringify(eventData, null, 2));
      
      // Vérifier que toutes les données de personnalisation sont présentes
      const eventDataToSend = {
        ...eventData,
        customization: {
          primary_color: eventData.customization.primary_color,
          secondary_color: eventData.customization.secondary_color,
          background_image: eventData.customization.background_image || null,
          logo: eventData.customization.logo || null
        }
      };
      
      const success = await updateEvent(id as string, eventDataToSend);
      
      if (!success) {
        setError("Impossible de mettre à jour l'événement.");
        setIsSaving(false);
        return;
      }
      
      setIsSuccess(true);
      setTimeout(() => router.push('/admin/events'), 1500);
    } catch (error: any) {
      console.error('Failed to update event:', error);
      setError(error instanceof Error 
        ? `Erreur: ${error.message}` 
        : "Une erreur inconnue s'est produite lors de la mise à jour de l'événement."
      );
      setIsSaving(false);
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
      <h1 className="text-2xl font-semibold text-gray-800 mb-6">Modifier l'Événement</h1>
      
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
              <p className="text-sm text-green-700">L'événement a été mis à jour avec succès. Redirection...</p>
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
    </div>
  );
}
'use client';

import React, { useEffect, useState } from 'react';
import { fetchEventById } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import Link from 'next/link';
import Image from 'next/image'; // Add this import for Next.js Image component
import { FiArrowLeft, FiEdit, FiExternalLink } from 'react-icons/fi';

export default function ViewEventPage({ params }: { params: { id: string } }) {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        const eventData = await fetchEventById(params.id);
        setEvent(eventData);
      } catch (error) { // Change variable name from 'err' to 'error' to use it
        console.error("Error loading event:", error);
        setError('Cet événement n&apos;existe pas ou n&apos;est plus disponible.');
      } finally {
        setLoading(false);
      }
    }
    
    loadEvent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
          <p className="ml-3">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-500 p-4 rounded-lg">
          <h2 className="text-lg font-medium mb-2">Erreur</h2>
          <p>{error || 'Cet événement n&apos;est pas disponible.'}</p>
          <div className="mt-4">
            <Link href="/admin/events" className="text-blue-500 hover:underline flex items-center">
              <FiArrowLeft className="mr-1" /> Retour à la liste des événements
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/admin/events" className="mr-4 text-gray-600 hover:text-gray-900">
            <FiArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-semibold text-gray-800">Aperçu </h1>
        </div>
        <div className="flex space-x-3">
          <Link 
            href={`/admin/events/${params.id}/edit`} 
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiEdit className="mr-2" /> Modifier
          </Link>
          <Link 
            href={`/event/${params.id}`} 
            target="_blank"
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <FiExternalLink className="mr-2" /> Voir en public
          </Link>
        </div>
      </div>

      {/* Détails de l'événement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">Informations générales</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Nom de l&apos;événement</h3>
                <p className="text-lg">{event.name}</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Description</h3>
                <p className="text-base">{event.description || 'Aucune description disponible'}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Date et heure</h3>
                  <p className="text-base">
                    {new Date(event.date).toLocaleDateString('fr-FR', { 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Lieu</h3>
                  <p className="text-base">{event.location || 'Non spécifié'}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Statut</h3>
                <div className="mt-1">
                  <span className={`px-3 py-1 text-sm rounded-full ${event.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {event.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">URL publique</h3>
                <div className="mt-1 flex items-center">
                  <input 
                    type="text" 
                    value={`${window.location.origin}/event/${event.id}`}
                    readOnly
                    className="flex-1 p-2 border rounded-md text-sm bg-gray-50"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/event/${event.id}`);
                      alert('URL copiée dans le presse-papier');
                    }}
                    className="ml-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
                  >
                    Copier
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">Personnalisation</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Couleur primaire</h3>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-8 h-8 rounded-md mr-2" 
                    style={{ backgroundColor: event.customization?.primary_color || '#FF5733' }}
                  ></div>
                  <span>{event.customization?.primary_color || '#FF5733'}</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Couleur secondaire</h3>
                <div className="flex items-center mt-1">
                  <div 
                    className="w-8 h-8 rounded-md mr-2" 
                    style={{ backgroundColor: event.customization?.secondary_color || '#3498DB' }}
                  ></div>
                  <span>{event.customization?.secondary_color || '#3498DB'}</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-500">Image d&apos;arrière-plan</h3>
                {event.customization?.background_image ? (
                  <div className="mt-2">
                    <div className="relative w-full h-40 rounded-md overflow-hidden">
                      {/* Replace img with Next.js Image component */}
                      <Image 
                        src={event.customization.background_image} 
                        alt="Background" 
                        fill
                        className="object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-sm italic text-gray-500 mt-1">Image par défaut utilisée</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">Métadonnées</h2>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Créé le</span>
                <span className="font-mono text-xs">{new Date(event.created_at).toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ID</span>
                <span className="font-mono text-xs">{event.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fix unescaped apostrophes */}
      <p className="text-sm text-gray-500 mb-4">
        L&apos;interface de l&apos;événement tel que les participants la verront
      </p>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">Aperçu</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Nom de l&apos;événement</h3>
            <p className="text-lg">{event.name}</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Description</h3>
            <p className="text-base">{event.description || 'Aucune description disponible'}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Date et heure</h3>
              <p className="text-base">
                {new Date(event.date).toLocaleDateString('fr-FR', { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Lieu</h3>
              <p className="text-base">{event.location || 'Non spécifié'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">Statut</h3>
            <div className="mt-1">
              <span className={`px-3 py-1 text-sm rounded-full ${event.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {event.is_active ? 'Actif' : 'Inactif'}
              </span>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-500">URL publique</h3>
            <div className="mt-1 flex items-center">
              <input 
                type="text" 
                value={`${window.location.origin}/event/${event.id}`}
                readOnly
                className="flex-1 p-2 border rounded-md text-sm bg-gray-50"
              />
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/event/${event.id}`);
                  alert('URL copiée dans le presse-papier');
                }}
                className="ml-2 px-3 py-2 bg-gray-200 rounded-md hover:bg-gray-300 text-sm"
              >
                Copier
              </button>
            </div>
          </div>
        </div>
        
        <p className="text-sm text-gray-500">
          Cliquez sur le bouton ci-dessus pour ouvrir l&apos;événement dans un nouvel onglet
        </p>
      </div>
    </div>
  );
}

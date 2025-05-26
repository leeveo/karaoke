'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiPlus, FiEdit2, FiTrash2, FiEye, FiExternalLink, FiSearch, FiFilter, FiCalendar, FiCopy, FiX, FiVideo } from 'react-icons/fi';
import { IoQrCode } from 'react-icons/io5';
import { fetchEvents, deleteEvent } from '@/lib/supabase/events';
import { Event } from '@/types/event';
import QRCodeDisplay from '@/components/QRCodeDisplay';

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [selectedQR, setSelectedQR] = useState<{id: string, url: string} | null>(null);

  useEffect(() => {
    async function loadEvents() {
      try {
        const eventData = await fetchEvents();
        setEvents(eventData);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    }
    
    loadEvents();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cet événement?')) {
      try {
        await deleteEvent(id);
        setEvents(events.filter(event => event.id !== id));
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    }
  };

  // Fonction pour copier l'URL dans le presse-papiers
  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('URL copiée dans le presse-papiers !');
  };

  // Fonction pour générer l'URL de l'événement
  const getEventUrl = (eventId: string) => {
    // Utiliser l'URL complète en production
    const baseUrl = window.location.origin;
    return `${baseUrl}/event/${eventId}`;
  };

  // Filtrage et recherche
  const filteredEvents = events.filter(event => {
    // Filtre par terme de recherche
    const matchesSearch = searchTerm === '' || 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (event.location && event.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Filtre par statut actif
    const matchesFilter = filterActive === null || event.is_active === filterActive;
    
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">Gestion des Événements</h1>
        <Link href="/admin/events/create" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center shadow-sm">
          <FiPlus className="mr-2" /> Nouvel Événement
        </Link>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FiSearch className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Rechercher un événement..."
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <FiFilter className="h-4 w-4" />
              <span>Statut:</span>
            </div>
            <select
              value={filterActive === null ? 'all' : filterActive ? 'active' : 'inactive'}
              onChange={(e) => {
                if (e.target.value === 'all') setFilterActive(null);
                else setFilterActive(e.target.value === 'active');
              }}
              className="block w-full py-2 px-3 border border-gray-200 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="all">Tous</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 w-full"></div>
            {[...Array(3)].map((_, index) => (
              <div key={index} className="h-24 bg-gray-100 w-full border-t border-gray-200"></div>
            ))}
          </div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <FiCalendar className="h-full w-full" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun événement trouvé</h3>
          <p className="mt-1 text-sm text-gray-500">
            Commencez par créer un nouvel événement.
          </p>
          <div className="mt-6">
            <Link href="/admin/events/create" className="text-sm font-medium text-blue-600 hover:text-blue-500">
              Créer un événement <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lieu
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Accès
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{event.name}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {event.description?.substring(0, 50)}{event.description && event.description.length > 50 ? '...' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(event.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {event.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {event.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-3">
                        <Link href={`/event/${event.id}`} className="text-blue-600 hover:text-blue-900" title="Aperçu">
                          <FiEye className="h-5 w-5" />
                        </Link>
                        
                        <Link href={`/admin/events/${event.id}/edit`} className="text-green-600 hover:text-green-900" title="Modifier">
                          <FiEdit2 className="h-5 w-5" />
                        </Link>
                        {/* Nouveau bouton pour accéder aux vidéos de l'événement */}
                        <Link href={`/admin/events/${event.id}/videos`} className="text-purple-600 hover:text-purple-900" title="Vidéos">
                          <FiVideo className="h-5 w-5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(event.id)} 
                          className="text-red-600 hover:text-red-900"
                          title="Supprimer"
                        >
                          <FiTrash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                    {/* Nouvelle colonne pour l'accès */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="flex-1 text-xs text-gray-500 truncate max-w-[160px]">
                          {getEventUrl(event.id)}
                        </div>
                        <button 
                          onClick={() => copyToClipboard(getEventUrl(event.id))} 
                          className="text-gray-500 hover:text-gray-700"
                          title="Copier l'URL"
                        >
                          <FiCopy className="h-5 w-5" />
                        </button>
                        <button 
                          onClick={() => setSelectedQR({id: event.id, url: getEventUrl(event.id)})} 
                          className="text-purple-600 hover:text-purple-800"
                          title="Afficher le QR code"
                        >
                          <IoQrCode className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal pour afficher le QR code */}
      {selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">QR Code pour l'événement</h3>
              <button 
                onClick={() => setSelectedQR(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col items-center">
              <QRCodeDisplay url={selectedQR.url} size={200} />
              <p className="mt-4 text-sm text-gray-500 text-center break-all">{selectedQR.url}</p>
              <button
                onClick={() => copyToClipboard(selectedQR.url)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              >
                <FiCopy className="mr-2" /> Copier l'URL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

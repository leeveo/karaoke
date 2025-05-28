'use client';

import React, { useState, useEffect } from 'react';
import { 
  FiMusic, 
  FiFolder,
  FiRefreshCw,
  FiSearch, // Add missing icon import
  FiEye    // Add missing icon import
} from 'react-icons/fi';
import { getS3Categories, getS3SongsByCategory, S3Item } from '@/lib/aws/s3Admin';

export default function SongsPage() {
  const [categories, setCategories] = useState<S3Item[]>([]);
  const [songs, setSongs] = useState<S3Item[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Charger les catégories au chargement de la page
  useEffect(() => {
    async function loadCategories() {
      try {
        setLoading(true);
        const categoriesList = await getS3Categories();
        setCategories(categoriesList);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setLoading(false);
      }
    }
    
    loadCategories();
  }, []);

  // Charger les chansons quand une catégorie est sélectionnée
  useEffect(() => {
    async function loadSongs() {
      if (!selectedCategory) {
        setSongs([]);
        return;
      }
      
      try {
        setLoading(true);
        const songsList = await getS3SongsByCategory(selectedCategory);
        setSongs(songsList);
        setLoading(false);
      } catch (error) {
        console.error(`Failed to load songs for category ${selectedCategory}:`, error);
        setLoading(false);
      }
    }
    
    loadSongs();
  }, [selectedCategory]);

  // Filtrer les chansons par terme de recherche
  const filteredSongs = songs.filter(song => 
    song.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fonction pour extraire le titre et l'artiste du nom de fichier
  const parseSongName = (fileName: string): { title: string; artist: string } => {
    // Supprimer l'extension
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    
    // Diviser par tirets
    const parts = nameWithoutExt.split('-');
    
    if (parts.length >= 2) {
      // Première partie = titre, deuxième partie = artiste
      const title = parts[0].trim();
      // Pour l'artiste, prendre juste la deuxième partie (avant un éventuel underscore)
      const artist = parts[1].split('_')[0].trim();
      
      // Capitaliser la première lettre
      return {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        artist: artist.charAt(0).toUpperCase() + artist.slice(1)
      };
    }
    
    // Fallback si le format n'est pas celui attendu
    return {
      title: nameWithoutExt,
      artist: 'Artiste inconnu'
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-semibold text-gray-800">Gestion des Chansons</h1>
        
        <div className="flex space-x-2">
          <button 
            onClick={() => {
              setSelectedCategory(null);
              setSearchTerm('');
            }}
            className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-md flex items-center"
          >
            <FiRefreshCw className="mr-2" /> Rafraîchir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Panneau de gauche: Liste des catégories */}
        <div className="col-span-1 bg-white p-4 rounded-lg shadow-sm">
          <h2 className="font-semibold mb-4 text-gray-700 flex items-center">
            <FiFolder className="mr-2" /> Catégories
          </h2>
          
          {loading && !selectedCategory ? (
            <div className="animate-pulse">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="h-10 bg-gray-200 rounded mb-2"></div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {categories.map((category) => (
                <li key={category.key}>
                  <button
                    onClick={() => setSelectedCategory(category.name)}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center ${
                      selectedCategory === category.name
                        ? 'bg-blue-100 text-blue-700'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <FiFolder className={`mr-2 ${
                      selectedCategory === category.name ? 'text-blue-500' : 'text-gray-500'
                    }`} />
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Panneau de droite: Contenu de la catégorie sélectionnée */}
        <div className="col-span-1 md:col-span-3">
          {selectedCategory ? (
            <div className="space-y-4">
              {/* Titre de la catégorie et recherche */}
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0 md:space-x-4">
                  <h2 className="font-semibold text-gray-800 flex items-center">
                    <FiMusic className="mr-2" /> Chansons: {selectedCategory}
                  </h2>
                  
                  <div className="flex-1 relative ml-auto">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FiSearch className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="Rechercher une chanson..."
                    />
                  </div>
                </div>
              </div>

              {/* Liste des chansons */}
              {loading ? (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="animate-pulse">
                    <div className="h-16 bg-gray-200 w-full"></div>
                    {[...Array(3)].map((_, index) => (
                      <div key={index} className="h-24 bg-gray-100 w-full border-t border-gray-200"></div>
                    ))}
                  </div>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                  <div className="mx-auto h-12 w-12 text-gray-400">
                    <FiMusic className="h-full w-full" />
                  </div>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune chanson trouvée</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Cette catégorie ne contient pas de chansons ou aucun résultat ne correspond à votre recherche.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Titre / Artiste
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Dernière modification
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSongs.map((song) => {
                          const { title, artist } = parseSongName(song.name);
                          
                          return (
                            <tr key={song.key} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-start flex-col">
                                  <div className="text-sm font-medium text-gray-900">{title}</div>
                                  <div className="text-sm text-gray-500">Interprète: {artist}</div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {song.lastModified?.toLocaleDateString()} {song.lastModified?.toLocaleTimeString()}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <div className="flex space-x-3">
                                  <a 
                                    href={`/karaoke/${encodeURIComponent(song.key)}`}
                                    target="_blank"
                                    rel="noopener noreferrer" 
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Aperçu"
                                  >
                                    <FiEye className="mr-1" />
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <FiFolder className="h-full w-full" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Sélectionnez une catégorie</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choisissez une catégorie dans le panneau de gauche pour voir les chansons.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

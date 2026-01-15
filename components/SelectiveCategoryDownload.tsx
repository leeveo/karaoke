'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CategoryInfo {
  name: string;
  selected: boolean;
  estimatedSize: number; // in MB
  songCount: number;
}

interface SelectiveCategoryDownloadProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedCategories: string[]) => void;
  isLoading?: boolean;
}

export default function SelectiveCategoryDownload({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: SelectiveCategoryDownloadProps) {
  const [categories, setCategories] = useState<Record<string, CategoryInfo>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && Object.keys(categories).length === 0) {
      fetchCategoriesInfo();
    }
  }, [isOpen]);

  const fetchCategoriesInfo = async () => {
    try {
      setLoading(true);
      // Récupérer les catégories
      const categoriesResponse = await fetch('/api/songs?action=categories');
      if (!categoriesResponse.ok) throw new Error('Failed to fetch categories');
      
      const categoriesList = await categoriesResponse.json();
      
      // Pour chaque catégorie, récupérer le nombre de chansons
      const categoriesData: Record<string, CategoryInfo> = {};
      
      for (const category of categoriesList) {
        try {
          const songsResponse = await fetch(`/api/songs?action=songs&category=${category}`);
          if (songsResponse.ok) {
            const songs = await songsResponse.json();
            // Estimation: ~3.5 MB par chanson en moyenne
            const estimatedSize = (songs.length * 3.5).toFixed(2);
            
            categoriesData[category] = {
              name: category.charAt(0).toUpperCase() + category.slice(1),
              selected: true, // Sélectionné par défaut
              estimatedSize: parseFloat(estimatedSize),
              songCount: songs.length
            };
          }
        } catch (err) {
          console.warn(`Failed to fetch info for category ${category}:`, err);
        }
      }
      
      setCategories(categoriesData);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryKey: string) => {
    setCategories(prev => ({
      ...prev,
      [categoryKey]: {
        ...prev[categoryKey],
        selected: !prev[categoryKey].selected
      }
    }));
  };

  const toggleAll = () => {
    const allSelected = Object.values(categories).every(c => c.selected);
    setCategories(prev => {
      const newCategories: Record<string, CategoryInfo> = {};
      for (const [key, cat] of Object.entries(prev)) {
        newCategories[key] = { ...cat, selected: !allSelected };
      }
      return newCategories;
    });
  };

  const selectedCategories = Object.entries(categories)
    .filter(([, cat]) => cat.selected)
    .map(([key]) => key);

  const totalSize = Object.values(categories)
    .filter(cat => cat.selected)
    .reduce((sum, cat) => sum + cat.estimatedSize, 0)
    .toFixed(2);

  const totalSongs = Object.values(categories)
    .filter(cat => cat.selected)
    .reduce((sum, cat) => sum + cat.songCount, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white shrink-0">
              <h2 className="text-2xl font-bold">Sélectionner les catégories</h2>
              <p className="text-blue-100 mt-2">Téléchargez uniquement les catégories que vous souhaitez</p>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
                  </div>
                  <span className="ml-3 text-gray-600">Chargement des catégories...</span>
                </div>
              ) : Object.keys(categories).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Aucune catégorie trouvée
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All */}
                  <div className="bg-gray-50 p-4 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-400 transition-colors mb-6"
                    onClick={toggleAll}>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Object.values(categories).every(c => c.selected)}
                        onChange={() => {}}
                        className="w-5 h-5 cursor-pointer"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">Tout sélectionner</p>
                        <p className="text-sm text-gray-500">
                          {Object.keys(categories).length} catégories
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Categories Grid - 2 columns */}
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(categories).map(([key, cat]) => (
                      <div
                        key={key}
                        className="border-2 border-gray-200 p-4 rounded-lg cursor-pointer hover:border-blue-400 transition-colors hover:bg-blue-50"
                        onClick={() => toggleCategory(key)}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={cat.selected}
                            onChange={() => {}}
                            className="w-5 h-5 mt-1 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 break-words">{cat.name}</h3>
                            <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                              <span className="font-medium bg-blue-100 text-blue-700 px-2 py-1 rounded whitespace-nowrap">
                                {cat.songCount} chanson{cat.songCount > 1 ? 's' : ''}
                              </span>
                              <span className="font-medium">
                                {cat.estimatedSize} MB
                              </span>
                            </div>
                            <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all"
                                style={{ width: `${Math.min((cat.estimatedSize / 100) * 100, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Summary - Fixed */}
            <div className="border-t border-gray-200 bg-gray-50 p-6 shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600">Catégories sélectionnées: <strong>{selectedCategories.length}</strong></p>
                  <p className="text-sm text-gray-600 mt-1">Chansons à télécharger: <strong>{totalSongs}</strong></p>
                  <p className="text-lg font-bold text-blue-600 mt-2">
                    Taille estimée: {totalSize} MB
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    onConfirm(selectedCategories);
                  }}
                  disabled={selectedCategories.length === 0 || isLoading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Téléchargement...
                    </>
                  ) : (
                    <>
                      📥 Télécharger ({selectedCategories.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

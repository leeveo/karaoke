'use client';

import React, { useState, useEffect } from 'react';
import { StylePackDefinition } from '@/config/style-packs';

interface StylePackPreviewModalProps {
  pack: StylePackDefinition;
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CATEGORIES = ['all', 'pop', 'rock', 'rap', 'français', 'anglais', 'latino', 'jazz', 'reggae'];
const SAMPLE_SONGS_LIMIT = 24; // Nombre max de chansons à afficher

export default function StylePackPreviewModal({ pack, isOpen, onClose }: StylePackPreviewModalProps) {
  const [categoryImages, setCategoryImages] = useState<{ slug: string; url: string }[]>([]);
  const [songImages, setSongImages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'songs'>('categories');

  useEffect(() => {
    if (!isOpen) return;

    // Charger les images de catégories disponibles depuis l'API
    loadCategoryImages();

    // Charger les images de chansons disponibles
    loadSongImages();
  }, [isOpen, pack]);

  const loadCategoryImages = async () => {
    try {
      // Essayer de charger les vraies images depuis le dossier
      const response = await fetch(`/api/style-packs/${pack.id}/categories`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.categories && data.categories.length > 0) {
          setCategoryImages(data.categories);
          return;
        }
      }

      // Fallback: utiliser les backgrounds CSS définis dans le pack
      const catUrls = SAMPLE_CATEGORIES.map(slug => ({
        slug,
        url: pack.categoryBackground(slug),
      }));
      setCategoryImages(catUrls);
    } catch (error) {
      console.error('Error loading category images:', error);
      // Fallback: utiliser les backgrounds CSS
      const catUrls = SAMPLE_CATEGORIES.map(slug => ({
        slug,
        url: pack.categoryBackground(slug),
      }));
      setCategoryImages(catUrls);
    }
  };

  const loadSongImages = async () => {
    try {
      // Utiliser l'API pour lister les images disponibles
      const response = await fetch(`/api/style-packs/${pack.id}/songs`);
      
      if (!response.ok) {
        console.warn('Cannot list song images from API');
        // Fallback: utiliser l'image de preview
        if (pack.previewSongImage) {
          setSongImages([pack.previewSongImage]);
        }
        return;
      }

      const data = await response.json();
      
      if (data.success && data.images && data.images.length > 0) {
        // Limiter le nombre d'images affichées pour des raisons de performance
        const limitedImages = data.images.slice(0, SAMPLE_SONGS_LIMIT);
        setSongImages(limitedImages);
      } else {
        // Fallback
        if (pack.previewSongImage) {
          setSongImages([pack.previewSongImage]);
        }
      }
    } catch (error) {
      console.error('Error loading song images:', error);
      // Fallback
      if (pack.previewSongImage) {
        setSongImages([pack.previewSongImage]);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{pack.name}</h2>
              <p className="text-sm text-gray-600 mt-1">{pack.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'categories'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Catégories
            </button>
            <button
              onClick={() => setActiveTab('songs')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === 'songs'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Chansons
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'categories' ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Voici les visuels des cartes de catégories pour ce pack :
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoryImages.map(({ slug, url }) => {
                  const isGradient = url.startsWith('linear-gradient');
                  const isImage = url.startsWith('/') || url.startsWith('url(');
                  
                  return (
                    <div key={slug} className="group relative">
                      <div 
                        className="aspect-video rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 group-hover:border-blue-400 transition-all"
                      >
                        {isGradient && (
                          <div 
                            className="w-full h-full" 
                            style={{ background: url }}
                          />
                        )}
                        {isImage && !isGradient && (
                          <img
                            src={url.startsWith('url(') ? url.replace(/^url\(['"]?|['"]?\)$/g, '') : url}
                            alt={slug}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // En cas d'erreur, afficher le gradient de fallback
                              const parent = (e.target as HTMLElement).parentElement;
                              if (parent) {
                                parent.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.65) 100%)';
                                (e.target as HTMLElement).style.display = 'none';
                              }
                            }}
                          />
                        )}
                      </div>
                      <p className="mt-2 text-center text-sm font-medium text-gray-700 capitalize">
                        {slug === 'all' ? 'Toutes' : slug}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Exemples de vignettes de chansons pour ce pack :
              </p>
              {songImages.length > 0 ? (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {songImages.map((imgUrl, index) => (
                    <div key={index} className="group relative">
                      <div className="aspect-square rounded-xl overflow-hidden shadow-lg border-2 border-gray-200 group-hover:border-blue-400 group-hover:shadow-xl transition-all">
                        <img 
                          src={imgUrl} 
                          alt={`Chanson ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder-song.png';
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p>Aucune image de chanson disponible pour ce pack</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import EventForm from '@/components/forms/EventForm';
import DownloadProgressModal from '@/components/DownloadProgressModal';
import SelectiveCategoryDownload from '@/components/SelectiveCategoryDownload';
import { fetchEventById, updateEvent } from '@/lib/supabase/events';
import { Event, EventInput } from '@/types/event';
import { DEFAULT_STYLE_PACK_ID } from '@/lib/stylePacks';

export default function EditEventPage() {
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totalSongs, setTotalSongs] = useState(0);
  const [downloadedSongs, setDownloadedSongs] = useState(0);
  const [totalImages, setTotalImages] = useState(0);
  const [downloadedImages, setDownloadedImages] = useState(0);
  const [downloadedSize, setDownloadedSize] = useState(0);
  const [showCategorySelector, setShowCategorySelector] = useState(false);
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

  const handleCategorySelection = async (selectedCategories: string[]) => {
    setShowCategorySelector(false);
    await handleDownloadOffline(selectedCategories);
  };

  const handleDownloadOffline = async (categoriesToDownload?: string[]) => {
    if (!event) return;
    
    try {
      setIsDownloading(true);
      setDownloadMessage(null);
      setDownloadedSongs(0);
      setDownloadedImages(0);
      setDownloadedSize(0);
      
      console.log(`[Admin] Starting offline download for event: ${event.id}`);
      
      // Fetch all songs for the event using the correct API
      // First get all categories
      const categoriesResponse = await fetch(`/api/songs?action=categories`);
      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch categories');
      }
      const allCategories = await categoriesResponse.json();
      
      // Utiliser les catégories sélectionnées ou toutes les catégories
      const categoriesToFetch = categoriesToDownload && categoriesToDownload.length > 0 
        ? categoriesToDownload 
        : allCategories;
      
      console.log(`[Admin] Found ${allCategories.length} categories, downloading: ${categoriesToFetch.length}`);
      
      // Fetch all songs from selected categories
      const allSongs = [];
      for (const category of categoriesToFetch) {
        try {
          const songsResponse = await fetch(`/api/songs?action=songs&category=${category}`);
          if (!songsResponse.ok) continue;
          const songs = await songsResponse.json();
          allSongs.push(...songs);
          console.log(`[Admin] Category ${category}: ${songs.length} songs`);
        } catch (err) {
          console.warn(`Failed to fetch songs for category ${category}:`, err);
        }
      }
      
      console.log(`[Admin] Total songs to download: ${allSongs.length}`);
      setTotalSongs(allSongs.length);
      setTotalImages(allSongs.length); // Estimation: une image par chanson
      
      // Store in IndexedDB
      const { initDB, storeOfflineEvent, storeOfflineSong } = await import('@/lib/offline/db');
      await initDB();
      
      // Store event with logos
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const eventToStore: any = {
        id: event.id,
        name: event.name,
        description: event.description || '',
        customization: {
          ...event.customization,
          primary_color: event.customization?.primary_color || '',
          secondary_color: event.customization?.secondary_color || '',
        },
      };
      
      // Download event logo
      if (event.customization?.logo) {
        try {
          const logoResponse = await fetch(event.customization.logo);
          if (logoResponse.ok) {
            const logoBlob = await logoResponse.blob();
            eventToStore.customization.logoBlob = logoBlob;
            setDownloadedSize(prev => prev + logoBlob.size);
            console.log(`[Admin] Logo downloaded: ${(logoBlob.size / 1024).toFixed(2)} KB`);
          }
        } catch (err) {
          console.warn(`[Admin] Failed to download logo:`, err);
        }
      }
      
      // Download event background image
      if (event.customization?.background_image) {
        try {
          const bgResponse = await fetch(event.customization.background_image);
          if (bgResponse.ok) {
            const bgBlob = await bgResponse.blob();
            eventToStore.customization.backgroundImageBlob = bgBlob;
            setDownloadedSize(prev => prev + bgBlob.size);
            console.log(`[Admin] Background image downloaded: ${(bgBlob.size / 1024 / 1024).toFixed(2)} MB`);
          }
        } catch (err) {
          console.warn(`[Admin] Failed to download background image:`, err);
        }
      }
      
      await storeOfflineEvent(eventToStore);
      console.log(`[Admin] Event stored in IndexedDB`);
      
      // Store all songs with images
      let successCount = 0;
      let imagesDownloaded = 0;
      let totalSizeDownloaded = 0;
      
      for (const song of allSongs) {
        try {
          // Get signed URL for the song
          const urlResponse = await fetch(`/api/songs?action=url&key=${encodeURIComponent(song.key)}`);
          if (!urlResponse.ok) {
            console.warn(`Failed to get URL for song ${song.key}`);
            continue;
          }
          const urlData = await urlResponse.json();
          const songUrl = urlData.url;
          
          // Fetch song blob
          const songResponse = await fetch(songUrl);
          if (!songResponse.ok) {
            console.warn(`Failed to fetch song blob: ${song.title}`);
            continue;
          }
          const blob = await songResponse.blob();
          totalSizeDownloaded += blob.size;
          setDownloadedSize(prev => prev + blob.size);
          
          // Download song image if available
          let imageBlob: Blob | undefined;
          if (song.imageUrl) {
            try {
              // Use API proxy to avoid CORS issues
              const proxyUrl = `/api/download-image?url=${encodeURIComponent(song.imageUrl)}`;
              const imgResponse = await fetch(proxyUrl);
              if (imgResponse.ok) {
                imageBlob = await imgResponse.blob();
                totalSizeDownloaded += imageBlob.size;
                setDownloadedSize(prev => prev + imageBlob.size);
                imagesDownloaded++;
                setDownloadedImages(imagesDownloaded);
                console.log(`[Admin] Song image downloaded: ${song.title}`);
              }
            } catch (err) {
              console.warn(`[Admin] Failed to download image for ${song.title}:`, err);
            }
          }
          
          await storeOfflineSong({
            id: `${event.id}-${song.key}`,
            title: song.title || 'Unknown',
            artist: song.artist || 'Unknown',
            categoryId: song.categoryId || 'all',
            blob,
            size: blob.size,
            key: song.key,
            imageBlob,
            imageUrl: song.imageUrl,
          });
          
          successCount++;
          setDownloadedSongs(successCount);
          console.log(`[Admin] Song stored: ${song.title} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`);
        } catch (err) {
          console.warn(`[Admin] Failed to download song ${song.key}:`, err);
        }
      }
      
      const totalSizeMB = (totalSizeDownloaded / 1024 / 1024).toFixed(2);
      setDownloadMessage({
        type: 'success',
        text: `✅ ${event.name} téléchargé pour utilisation hors ligne! (${successCount}/${allSongs.length} chansons + ${imagesDownloaded} images - ${totalSizeMB}MB)`,
      });
      
      console.log(`[Admin] Successfully downloaded event: ${event.id}`);
      
    } catch (error) {
      console.error('[Admin] Error downloading offline:', error);
      setDownloadMessage({
        type: 'error',
        text: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
      });
    } finally {
      setIsDownloading(false);
      if (downloadMessage?.type === 'success') {
        setTimeout(() => setDownloadMessage(null), 5000);
      }
    }
  };

  // Convert Event to EventInput for the form - fix type issues
  const prepareFormData = (event: Event): EventInput => {
    return {
      name: event.name,
      date: event.date,
      // Remove properties not in EventInput type
      customization: {
        primary_color: event.customization?.primary_color || '#0334b9',
        secondary_color: event.customization?.secondary_color || '#2fb9db',
        background_image: event.customization?.background_image || '',
        logo: event.customization?.logo || '',
        style_pack: event.customization?.style_pack || DEFAULT_STYLE_PACK_ID,
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">Modifier l&apos;Événement</h1>
        {event && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowCategorySelector(true)}
              disabled={isDownloading}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                isDownloading
                  ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50'
                  : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
              }`}
            >
              {isDownloading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Téléchargement...
                </>
              ) : (
                <>
                  <span>⬇️</span>
                  Télécharger pour hors ligne
                </>
              )}
            </button>
            
            {downloadMessage && (
              <div className={`p-3 rounded-lg text-sm font-medium ${
                downloadMessage.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {downloadMessage.text}
              </div>
            )}
          </div>
        )}
      </div>
      <EventForm onSubmit={handleSubmit} initialData={prepareFormData(event!)} />
      
      {/* Category Selector Modal */}
      <SelectiveCategoryDownload
        isOpen={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        onConfirm={handleCategorySelection}
        isLoading={isDownloading}
      />
      
      {/* Download Progress Modal */}
      <DownloadProgressModal
        isVisible={isDownloading}
        totalSongs={totalSongs}
        downloadedSongs={downloadedSongs}
        totalImages={totalImages}
        downloadedImages={downloadedImages}
        totalSize={0}
        downloadedSize={downloadedSize}
      />
    </div>
  );
}

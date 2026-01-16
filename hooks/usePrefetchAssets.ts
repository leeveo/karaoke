'use client';

import { useEffect } from 'react';
import { CacheManager } from '../lib/cache-manager';

/**
 * Hook to automatically prefetch images and videos when they're needed
 * Improves performance on next load for same resources
 */
export function usePrefetchAssets(imageUrls: string[] = [], videoUrls: string[] = []) {
  useEffect(() => {
    // Defer prefetch to avoid blocking initial load
    const timer = setTimeout(() => {
      if (imageUrls.length > 0) {
        CacheManager.prefetchImages(imageUrls).catch(console.error);
      }
      if (videoUrls.length > 0) {
        CacheManager.prefetchVideos(videoUrls).catch(console.error);
      }
    }, 2000); // Wait 2 seconds after initial render

    return () => clearTimeout(timer);
  }, [imageUrls, videoUrls]);
}

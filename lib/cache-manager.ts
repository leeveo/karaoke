/**
 * Cache Manager - Client-side cache control for images and videos
 * Coordinates with Service Worker to manage storage efficiently
 */

export interface CacheStats {
  imagesCached: number;
  videosCached: number;
  totalSize: number; // in bytes
  lastUpdated: string;
}

export class CacheManager {
  private static readonly IMAGES_CACHE = 'karaoke-images-v1';
  private static readonly VIDEOS_CACHE = 'karaoke-videos-v1';
  private static readonly CACHE_STATS_KEY = 'cache-stats';

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<CacheStats> {
    const stats: CacheStats = {
      imagesCached: 0,
      videosCached: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString(),
    };

    try {
      // Check images cache
      const imagesCache = await caches.open(this.IMAGES_CACHE);
      const imageKeys = await imagesCache.keys();
      stats.imagesCached = imageKeys.length;

      // Check videos cache
      const videosCache = await caches.open(this.VIDEOS_CACHE);
      const videoKeys = await videosCache.keys();
      stats.videosCached = videoKeys.length;

      // Estimate size (rough calculation)
      for (const key of [...imageKeys, ...videoKeys]) {
        const response = await imagesCache.match(key.url) || 
                        await videosCache.match(key.url);
        if (response) {
          const blob = await response.blob();
          stats.totalSize += blob.size;
        }
      }

      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return stats;
    }
  }

  /**
   * Prefetch images for a category
   * @param imageUrls - Array of image URLs to cache
   */
  static async prefetchImages(imageUrls: string[]): Promise<void> {
    if (!('caches' in window)) {
      console.warn('Cache API not available');
      return;
    }

    try {
      const cache = await caches.open(this.IMAGES_CACHE);
      
      for (const url of imageUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log('[CacheManager] Prefetched image:', url);
          }
        } catch (error) {
          console.warn(`Failed to prefetch image ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error prefetching images:', error);
    }
  }

  /**
   * Prefetch videos for offline access
   * @param videoUrls - Array of video URLs to cache
   */
  static async prefetchVideos(videoUrls: string[]): Promise<void> {
    if (!('caches' in window)) {
      console.warn('Cache API not available');
      return;
    }

    try {
      const cache = await caches.open(this.VIDEOS_CACHE);
      
      for (const url of videoUrls) {
        try {
          const response = await fetch(url, { 
            // Use range requests to handle large files better
            headers: { 'Accept-Ranges': 'bytes' }
          });
          if (response.ok) {
            await cache.put(url, response.clone());
            console.log('[CacheManager] Prefetched video:', url);
          }
        } catch (error) {
          console.warn(`Failed to prefetch video ${url}:`, error);
        }
      }
    } catch (error) {
      console.error('Error prefetching videos:', error);
    }
  }

  /**
   * Clear all cached images
   */
  static async clearImageCache(): Promise<void> {
    try {
      await caches.delete(this.IMAGES_CACHE);
      console.log('[CacheManager] Image cache cleared');
    } catch (error) {
      console.error('Error clearing image cache:', error);
    }
  }

  /**
   * Clear all cached videos
   */
  static async clearVideoCache(): Promise<void> {
    try {
      await caches.delete(this.VIDEOS_CACHE);
      console.log('[CacheManager] Video cache cleared');
    } catch (error) {
      console.error('Error clearing video cache:', error);
    }
  }

  /**
   * Clear all caches
   */
  static async clearAllCaches(): Promise<void> {
    try {
      await caches.delete(this.IMAGES_CACHE);
      await caches.delete(this.VIDEOS_CACHE);
      console.log('[CacheManager] All caches cleared');
    } catch (error) {
      console.error('Error clearing caches:', error);
    }
  }

  /**
   * Message Service Worker to clear a specific cache
   */
  static async messageServiceWorker(type: string, data: any = {}): Promise<any> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        navigator.serviceWorker.controller.postMessage(
          { type, ...data },
          [channel.port2]
        );
      });
    }
  }

  /**
   * Format bytes to human-readable format
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if a URL is cached
   */
  static async isCached(url: string): Promise<boolean> {
    try {
      const imagesCache = await caches.open(this.IMAGES_CACHE);
      let response = await imagesCache.match(url);
      if (response) return true;

      const videosCache = await caches.open(this.VIDEOS_CACHE);
      response = await videosCache.match(url);
      return !!response;
    } catch (error) {
      return false;
    }
  }
}

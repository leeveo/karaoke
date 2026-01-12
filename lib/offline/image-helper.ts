/**
 * Helper functions for managing offline images in IndexedDB
 */

import { getOfflineEvent, getOfflineSong } from './db';

/**
 * Get blob URL for event logo offline
 */
export async function getOfflineEventLogoUrl(eventId: string): Promise<string | undefined> {
  try {
    const event = await getOfflineEvent(eventId);
    if (event?.customization?.logoBlob) {
      return URL.createObjectURL(event.customization.logoBlob);
    }
    // Fallback to original URL if blob not available
    return event?.customization?.logo;
  } catch (err) {
    console.warn('[Offline Image] Error getting event logo:', err);
    return undefined;
  }
}

/**
 * Get blob URL for event background image offline
 */
export async function getOfflineEventBackgroundUrl(eventId: string): Promise<string | undefined> {
  try {
    const event = await getOfflineEvent(eventId);
    if (event?.customization?.backgroundImageBlob) {
      return URL.createObjectURL(event.customization.backgroundImageBlob);
    }
    // Fallback to original URL if blob not available
    return event?.customization?.background_image;
  } catch (err) {
    console.warn('[Offline Image] Error getting background image:', err);
    return undefined;
  }
}

/**
 * Get blob URL for song cover image offline
 */
export async function getOfflineSongImageUrl(songId: string): Promise<string | undefined> {
  try {
    const song = await getOfflineSong(songId);
    if (song?.imageBlob) {
      return URL.createObjectURL(song.imageBlob);
    }
    // Fallback to original URL if blob not available
    return song?.imageUrl;
  } catch (err) {
    console.warn('[Offline Image] Error getting song image:', err);
    return undefined;
  }
}

/**
 * Cleanup blob URLs to prevent memory leaks
 */
export function releaseOfflineBlobUrl(url: string): void {
  if (url?.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

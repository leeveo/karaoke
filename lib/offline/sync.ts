import { uploadToS3 } from '@/lib/aws';
import {
  getPendingVideos,
  updateVideoStatus,
  updateSyncStatus,
  getAllRecordedVideos,
} from './db';

/**
 * Sync Manager for Offline Mode
 * Handles uploading pending videos to S3 when reconnected
 */

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  progress: number;
}

let syncInProgress = false;
let syncProgress: SyncProgress = { total: 0, completed: 0, failed: 0, progress: 0 };

/**
 * Start sync process
 */
export async function startSync(eventId: string, onProgress?: (progress: SyncProgress) => void): Promise<{
  success: boolean;
  message: string;
  syncProgress: SyncProgress;
}> {
  // Prevent multiple sync attempts
  if (syncInProgress) {
    return {
      success: false,
      message: 'Sync already in progress',
      syncProgress,
    };
  }

  // Check if online
  if (!navigator.onLine) {
    return {
      success: false,
      message: 'No internet connection',
      syncProgress,
    };
  }

  syncInProgress = true;

  try {
    // Update status to syncing
    await updateSyncStatus(eventId, 'syncing');

    // Get all pending videos
    const pendingVideos = await getPendingVideos();

    if (pendingVideos.length === 0) {
      await updateSyncStatus(eventId, 'idle');
      return {
        success: true,
        message: 'No pending videos to sync',
        syncProgress: { total: 0, completed: 0, failed: 0, progress: 100 },
      };
    }

    syncProgress = {
      total: pendingVideos.length,
      completed: 0,
      failed: 0,
      progress: 0,
    };

    // Upload each video
    for (const video of pendingVideos) {
      try {
        console.log(`Uploading video: ${video.userEmail}-${video.timestamp}`);

        // Update status to uploading
        await updateVideoStatus(video.id, 'uploading');

        // Create S3 key based on email
        const s3Key = `karaoke-videos/${encodeURIComponent(video.userEmail)}-${video.timestamp}.webm`;

        // Upload to S3 with user email for tagging
        const s3Url = await uploadToS3(video.videoBlob, s3Key, video.userEmail);

        if (s3Url) {
          // Success - update status and S3 URL
          await updateVideoStatus(video.id, 'synced', s3Url);
          syncProgress.completed++;

          console.log(`✅ Video uploaded: ${s3Key}`);
        } else {
          // Upload returned null
          await updateVideoStatus(video.id, 'failed', undefined, 'Upload returned null');
          syncProgress.failed++;

          console.error(`❌ Upload failed for: ${s3Key}`);
        }
      } catch (error) {
        // Error during upload
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        await updateVideoStatus(video.id, 'failed', undefined, errorMsg);
        syncProgress.failed++;

        console.error(`❌ Error uploading video:`, error);
      }

      // Update progress
      syncProgress.progress = Math.round(
        ((syncProgress.completed + syncProgress.failed) / syncProgress.total) * 100
      );

      if (onProgress) {
        onProgress(syncProgress);
      }
    }

    // Update final sync status
    await updateSyncStatus(eventId, 'idle');

    syncInProgress = false;

    return {
      success: syncProgress.failed === 0,
      message:
        syncProgress.failed === 0
          ? `✅ All ${syncProgress.completed} videos synced successfully`
          : `⚠️ ${syncProgress.completed} videos synced, ${syncProgress.failed} failed`,
      syncProgress,
    };
  } catch (error) {
    console.error('Fatal sync error:', error);

    await updateSyncStatus(eventId, 'error');
    syncInProgress = false;

    return {
      success: false,
      message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      syncProgress,
    };
  }
}

/**
 * Get current sync progress
 */
export function getSyncProgress(): SyncProgress {
  return syncProgress;
}

/**
 * Check if sync is in progress
 */
export function isSyncInProgress(): boolean {
  return syncInProgress;
}

/**
 * Setup auto-sync when connection is restored
 */
export function setupAutoSync(eventId: string): void {
  window.addEventListener('online', async () => {
    console.log('[AutoSync] Connection restored, starting sync...');

    await startSync(eventId, (progress) => {
      console.log(`[AutoSync] Progress: ${progress.completed}/${progress.total}`);
    });
  });
}

/**
 * Retry failed videos
 */
export async function retryFailedVideos(eventId: string, onProgress?: (progress: SyncProgress) => void): Promise<{
  success: boolean;
  message: string;
  syncProgress: SyncProgress;
}> {
  // Treat failed videos as pending temporarily
  const allVideos = await getAllRecordedVideos();
  const failedVideos = allVideos.filter((v) => v.status === 'failed');

  if (failedVideos.length === 0) {
    return {
      success: true,
      message: 'No failed videos to retry',
      syncProgress: { total: 0, completed: 0, failed: 0, progress: 100 },
    };
  }

  // Retry by re-syncing
  for (const video of failedVideos) {
    await updateVideoStatus(video.id, 'pending');
  }

  return startSync(eventId, onProgress);
}

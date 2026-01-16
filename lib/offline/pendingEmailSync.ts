/**
 * Synchronise les emails en attente (sauvegardés offline)
 * Quand l'utilisateur revient online:
 * 1. Upload la vidéo blob à S3
 * 2. Renomme la vidéo avec l'email
 * 3. Envoie l'email avec l'URL S3
 */

import { pendingEmailStore } from './pendingEmailStore';
import { uploadToS3 } from '@/lib/aws';

interface SyncResult {
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

export async function syncPendingEmails(): Promise<SyncResult> {
  console.log('[PendingEmailSync] Starting sync of pending emails...');

  const result: SyncResult = {
    success: 0,
    failed: 0,
    errors: []
  };

  try {
    const pendingEmails = await pendingEmailStore.getPendingEmails();
    console.log(`[PendingEmailSync] Found ${pendingEmails.length} pending emails to sync`);

    if (pendingEmails.length === 0) {
      console.log('[PendingEmailSync] No pending emails to sync');
      return result;
    }

    // Traiter chaque email en attente
    for (const pendingEmail of pendingEmails) {
      try {
        console.log(`[PendingEmailSync] Processing email for ${pendingEmail.email}`);

        // Step 1: Upload la vidéo blob à S3
        console.log(`[PendingEmailSync] Uploading video blob to S3...`);
        const s3Url = await uploadToS3(
          pendingEmail.videoBlob,
          pendingEmail.eventId,
          `${pendingEmail.sessionId}-${Date.now()}.webm`
        );

        if (!s3Url) {
          throw new Error('Failed to get S3 URL after upload');
        }
        console.log(`[PendingEmailSync] Video uploaded to S3: ${s3Url}`);

        // Step 2: Renommer la vidéo avec l'email (optionnel pour sync)
        // Le système de stats va utiliser directement l'URL S3
        console.log(`[PendingEmailSync] Attempting to rename video with email...`);
        try {
          const oldKey = extractS3Key(s3Url);
          if (oldKey) {
            const renameResponse = await fetch('/api/rename-video', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                oldKey,
                userEmail: pendingEmail.email,
                eventId: pendingEmail.eventId,
              }),
            });

            if (renameResponse.ok) {
              const renameData = await renameResponse.json();
              console.log(`[PendingEmailSync] Video renamed successfully`);
              // Utiliser l'URL renommée
              const renamedUrl = renameData.newS3Url;
              await sendEmailWithUrl(pendingEmail, renamedUrl);
            } else {
              // Continuer avec l'URL originale si le renommage échoue
              console.warn('[PendingEmailSync] Rename failed, using original URL');
              await sendEmailWithUrl(pendingEmail, s3Url);
            }
          } else {
            // Pas de clé S3 extraite, utiliser l'URL originale
            await sendEmailWithUrl(pendingEmail, s3Url);
          }
        } catch (renameError) {
          console.warn('[PendingEmailSync] Rename error, using original URL:', renameError);
          await sendEmailWithUrl(pendingEmail, s3Url);
        }

        // Step 3: Supprimer de IndexedDB une fois traité avec succès
        await pendingEmailStore.removePendingEmail(pendingEmail.id);
        console.log(`[PendingEmailSync] Email for ${pendingEmail.email} processed successfully`);
        result.success++;
      } catch (error) {
        console.error(`[PendingEmailSync] Error processing email ${pendingEmail.id}:`, error);
        result.failed++;
        result.errors.push({
          id: pendingEmail.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Incrémenter le nombre de tentatives
        const updatedEmail = {
          ...pendingEmail,
          retries: (pendingEmail.retries || 0) + 1
        };

        // Supprimer après 5 tentatives
        if (updatedEmail.retries > 5) {
          console.warn(`[PendingEmailSync] Max retries reached for ${pendingEmail.id}, removing...`);
          await pendingEmailStore.removePendingEmail(pendingEmail.id);
        } else {
          // Sauvegarder avec le nombre de tentatives augmenté
          await pendingEmailStore.updatePendingEmail(updatedEmail);
        }
      }
    }
  } catch (error) {
    console.error('[PendingEmailSync] Fatal error during sync:', error);
  }

  console.log(
    `[PendingEmailSync] Sync complete - Success: ${result.success}, Failed: ${result.failed}`
  );
  return result;
}

interface PendingEmailForSync {
  id: string;
  videoBlob: Blob;
  email: string;
  name: string;
  subject: string;
  message: string;
  sessionId: string;
  eventId: string;
  createdAt: number;
  retries?: number;
}

/**
 * Envoyer l'email via l'API avec l'URL S3
 * Même format que le workflow normal online
 */
async function sendEmailWithUrl(
  pendingEmail: PendingEmailForSync,
  videoUrl: string
): Promise<void> {
  console.log(`[PendingEmailSync] Sending email to ${pendingEmail.email} with URL ${videoUrl}`);

  const response = await fetch('/api/send-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: pendingEmail.name,
      email: pendingEmail.email,
      subject: pendingEmail.subject,
      message: pendingEmail.message,
      videoUrl: videoUrl, // URL S3, pas blob URL
      sessionId: pendingEmail.sessionId,
      eventId: pendingEmail.eventId
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || `API error: ${response.status}`
    );
  }

  const result = await response.json();
  console.log(`[PendingEmailSync] Email sent successfully:`, result);
}

/**
 * Extraire la clé S3 depuis l'URL
 * Pattern: https://bucket.s3.region.amazonaws.com/karaoke-videos/event_id/sessionId-timestamp.webm
 */
function extractS3Key(url: string): string | null {
  const match = url.match(/s3\.[\w-]+\.amazonaws\.com\/(.+?)(?:\?|$)/);
  if (!match) return null;
  return match[1].split('?')[0];
}

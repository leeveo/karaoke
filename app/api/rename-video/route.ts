import { NextResponse } from 'next/server';
import { S3Client, CopyObjectCommand, PutObjectTaggingCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
  region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-1',
  credentials: {
    accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { oldKey, userEmail, eventId } = body;

    console.log('=== RENAME-VIDEO API CALLED ===');
    console.log('Body received:', { oldKey, userEmail, eventId });

    if (!oldKey || !userEmail) {
      console.log('Missing required fields: oldKey or userEmail');
      return NextResponse.json(
        { error: 'oldKey and userEmail are required' },
        { status: 400 }
      );
    }

    const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'waibooth-videos';
    
    // Create new filename with email
    // Extract the song title from the old key (everything after the last "/" until ".webm")
    // oldKey format: karaoke-videos/event_[eventId]/[song-title]-[timestamp].webm
    const lastSlashIndex = oldKey.lastIndexOf('/');
    const filenameWithExtension = oldKey.substring(lastSlashIndex + 1);
    // Remove the timestamp at the end (e.g., "-1768041148279.webm") to get the song title
    let songTitlePart = filenameWithExtension.replace(/-\d+\.webm$/, '');
    
    // Decode the song title - may need to decode twice due to multiple encoding levels
    // from the original file upload/renaming process
    try {
      // First decode
      songTitlePart = decodeURIComponent(songTitlePart);
      // Second decode if still encoded (check for % signs)
      if (songTitlePart.includes('%')) {
        try {
          const doubleDecode = decodeURIComponent(songTitlePart);
          songTitlePart = doubleDecode;
        } catch {
          // If second decode fails, keep first decode result
          console.warn('Second decode failed, using first decode result');
        }
      }
      // Extract only the last segment (filename) if it contains path separators
      // e.g., "karaokesaas/anglais/song.mp4" → "song.mp4"
      if (songTitlePart.includes('/')) {
        songTitlePart = songTitlePart.substring(songTitlePart.lastIndexOf('/') + 1);
      }
    } catch {
      console.warn('Could not decode song title, using as-is:', songTitlePart);
    }
    
    // Use the email directly without encoding (@ is allowed in S3 filenames)
    const timestamp = Date.now();
    // Format: karaoke-videos/event_[eventId]/[song-title]_[email]-[timestamp].webm
    const newKey = eventId 
      ? `karaoke-videos/event_${eventId}/${songTitlePart}_${userEmail}-${timestamp}.webm`
      : `karaoke-videos/${songTitlePart}_${userEmail}-${timestamp}.webm`;

    console.log('Renaming video:');
    console.log('  Old key:', oldKey);
    console.log('  Song title part:', songTitlePart);
    console.log('  New key:', newKey);
    console.log('  User email:', userEmail);
    console.log('  Event ID:', eventId || 'not provided');
    console.log('  Bucket:', bucketName);

    // Step 1: Copy object to new location
    try {
      console.log('Step 1: Starting copy operation...');
      const copyCommand = new CopyObjectCommand({
        Bucket: bucketName,
        CopySource: `${bucketName}/${oldKey}`,
        Key: newKey,
      });
      
      await s3Client.send(copyCommand);
      console.log('✓ Video copied successfully to new location');
    } catch (copyError) {
      console.error('✗ Error copying video:', copyError);
      throw new Error('Failed to copy video to new location');
    }

    // Step 2: Add tags to the new object
    try {
      console.log('Step 2: Starting tagging operation...');
      const taggingCommand = new PutObjectTaggingCommand({
        Bucket: bucketName,
        Key: newKey,
        Tagging: {
          TagSet: [
            {
              Key: 'user_email',
              Value: userEmail,
            },
            ...(eventId ? [{
              Key: 'event_id',
              Value: eventId,
            }] : []),
            {
              Key: 'renamed_at',
              Value: new Date().toISOString(),
            },
          ],
        },
      });
      
      await s3Client.send(taggingCommand);
      console.log('✓ Tags added successfully to new object');
    } catch (tagError) {
      console.error('✗ Error adding tags:', tagError);
      // Don't throw - tags are secondary to the rename
    }

    // NOTE: We intentionally DO NOT delete the old object
    // because other users might want to access it via QR code scanning
    // Both files coexist:
    // - Original: karaoke-videos/sessionId-timestamp.webm (for QR scanners)
    // - Copy: karaoke-videos/email-timestamp.webm (for email recovery)
    console.log('Step 3: Original file kept intact for QR code access');

    // Step 4: Generate a signed URL for the new object (valid for 7 days)
    try {
      console.log('Step 4: Generating signed URL for new object...');
      const getObjectCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: newKey,
      });
      
      const newS3Url = await getSignedUrl(s3Client, getObjectCommand, { expiresIn: 604800 }); // 7 days
      console.log('✓ Signed URL generated successfully');

      console.log('✓ Rename completed successfully');
      console.log('  New S3 URL:', newS3Url);
      console.log('=== END RENAME-VIDEO ===');

      return NextResponse.json({
        success: true,
        oldKey,
        newKey,
        newS3Url,
        message: 'Video copied successfully for email recovery. Original file kept intact for QR access.',
      });
    } catch (urlError) {
      console.error('✗ Error generating signed URL:', urlError);
      throw new Error('Failed to generate signed URL');
    }
  } catch (error) {
    console.error('✗ Error in rename-video route:', error);
    console.log('=== END RENAME-VIDEO (ERROR) ===');
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to rename video',
      },
      { status: 500 }
    );
  }
}

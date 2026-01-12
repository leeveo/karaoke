import AWS from 'aws-sdk';

// Config AWS S3 depuis ton .env.local
AWS.config.update({
  accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
  region: process.env.NEXT_PUBLIC_AWS_REGION,
});

const s3 = new AWS.S3({
  // Add specific CORS configuration to S3 client
  customUserAgent: 'KaraokeApp/1.0',
  signatureVersion: 'v4'
});
const bucketName = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;

if (!bucketName) {
  console.error('La variable d\'environnement NEXT_PUBLIC_AWS_S3_BUCKET est manquante.');
}

/**
 * Upload un fichier sur AWS S3 avec ACL public-read
 * @param file - Le blob à uploader
 * @param filename - Le chemin du fichier (key S3)
 * @param userEmail - Email optionnel à taguer sur l'objet S3
 */
export async function uploadToS3(file: Blob, filename: string, userEmail?: string): Promise<string | null> {
  try {
    if (!bucketName) {
      console.error('Bucket name is missing - cannot upload');
      return null;
    }
    
    try {
      const buffer = await file.arrayBuffer();
      
      // Direct S3 upload with explicit public-read ACL
      return new Promise((resolve) => {
        s3.upload({
          Bucket: bucketName,
          Key: filename,
          Body: Buffer.from(buffer),
          ContentType: 'video/webm',
          ACL: 'public-read', // Critical: Ensure the object is publicly accessible
        }, (err, data) => {
          if (err) {
            console.error('S3 Upload Error:', err);
            resolve(null);
          } else {
            console.log('Upload successful:', data.Location);
            
            // Add tags to the object if userEmail is provided
            if (userEmail) {
              try {
                s3.putObjectTagging({
                  Bucket: bucketName,
                  Key: filename,
                  Tagging: {
                    TagSet: [
                      {
                        Key: 'user_email',
                        Value: userEmail
                      }
                    ]
                  }
                }, (tagErr) => {
                  if (tagErr) {
                    console.warn('Warning: Could not add tags to S3 object:', tagErr);
                    // Don't fail the upload if tagging fails
                  } else {
                    console.log('Tags added to S3 object successfully');
                  }
                });
              } catch (tagError) {
                console.warn('Warning: Error adding tags to S3 object:', tagError);
                // Don't fail the upload if tagging fails
              }
            }
            
            // After upload, generate a presigned URL with a long expiration time
            try {
              const signedUrl = s3.getSignedUrl('getObject', {
                Bucket: bucketName,
                Key: filename,
                Expires: 604800 // 7 days in seconds
              });
              
              // Store both URLs
              sessionStorage.setItem('video-s3-url-direct', data.Location);
              sessionStorage.setItem('video-s3-url-signed', signedUrl);
              
              // Return the signed URL for immediate use
              resolve(signedUrl);
            } catch (signErr) {
              console.error('Error generating signed URL:', signErr);
              // Fall back to direct URL if signing fails
              resolve(data.Location);
            }
          }
        });
      });
    } catch (uploadError) {
      console.error('Error during upload process:', uploadError);
      return null;
    }
  } catch (error) {
    console.error('Error preparing upload:', error);
    return null;
  }
}

// Add a function to get a signed URL for an existing object with longer expiration
export async function getSignedUrl(key: string): Promise<string | null> {
  if (!bucketName) return null;
  
  try {
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: 604800, // URL valid for 7 days (in seconds)
    };
    
    const url = s3.getSignedUrl('getObject', params);
    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }
}
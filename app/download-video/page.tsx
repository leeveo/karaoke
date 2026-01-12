'use client';

import { useState } from 'react';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Link from 'next/link';

interface VideoItem {
  key: string;
  fileName: string;
  size: number;
  date: Date;
  signedUrl: string;
}

export default function DownloadVideoPage() {
  const [email, setEmail] = useState('');
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setVideos([]);
    setSearched(true);

    try {
      const s3Client = new S3Client({
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'eu-west-3',
        credentials: {
          accessKeyId: process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY || '',
        },
      });

      // List objects matching pattern: karaoke-videos/[email]*
      const encodedEmail = encodeURIComponent(email);
      const command = new ListObjectsV2Command({
        Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage',
        Prefix: `karaoke-videos/${encodedEmail}-`,
      });

      const response = await s3Client.send(command);

      if (!response.Contents || response.Contents.length === 0) {
        setError(`Aucune vidéo trouvée pour l'email: ${email}`);
        setLoading(false);
        return;
      }

      // Generate signed URLs for each video
      const videoList: VideoItem[] = [];

      for (const obj of response.Contents) {
        try {
          const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: process.env.NEXT_PUBLIC_AWS_S3_BUCKET || 'leeveostockage',
              Key: obj.Key!,
            }),
            { expiresIn: 604800 } // 7 days
          );

          videoList.push({
            key: obj.Key!,
            fileName: obj.Key!.split('/').pop() || 'video',
            size: obj.Size || 0,
            date: obj.LastModified || new Date(),
            signedUrl,
          });
        } catch (err) {
          console.error(`Failed to generate signed URL for ${obj.Key}:`, err);
        }
      }

      // Sort by date descending
      videoList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setVideos(videoList);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(`Erreur: ${errorMsg}`);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-black p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="py-12 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            📥 Récupérer ma Vidéo Karaoke
          </h1>
          <p className="text-gray-300 text-lg">
            Entrez votre adresse email pour télécharger vos enregistrements
          </p>

          <Link href="/">
            <button className="mt-4 px-6 py-2 text-purple-400 hover:text-purple-300 transition">
              ← Retour à l&apos;accueil
            </button>
          </Link>
        </div>

        {/* Search Form */}
        <div className="mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 border border-white/20">
            <form onSubmit={handleSearch} className="flex flex-col gap-4">
              <div>
                <label className="block text-white font-semibold mb-3">
                  Votre adresse email:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/20 text-white placeholder-gray-400 border border-white/30 focus:border-purple-500 focus:outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!email || loading}
                    className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                  >
                    {loading ? (
                      <>
                        <span className="inline-block animate-spin mr-2">⌛</span>
                        Recherche...
                      </>
                    ) : (
                      '🔍 Rechercher'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 bg-red-500/20 border border-red-500 text-red-200 p-4 rounded-lg">
            <p className="font-semibold">❌ {error}</p>
          </div>
        )}

        {/* Results */}
        {searched && videos.length === 0 && !error && !loading && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-12 border border-white/20 text-center">
            <p className="text-gray-300 text-lg">
              Aucune vidéo trouvée pour cet email. Vérifiez que vos vidéos ont été synchronisées.
            </p>
          </div>
        )}

        {videos.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-white mb-4">
              {videos.length} vidéo{videos.length > 1 ? 's' : ''} trouvée{videos.length > 1 ? 's' : ''}:
            </h2>

            <div className="space-y-3">
              {videos.map((video, idx) => (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-md rounded-lg p-5 border border-white/20 hover:border-purple-500 transition flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="text-white font-semibold text-lg">
                      📹 {video.fileName}
                    </p>
                    <div className="text-gray-300 text-sm mt-1 flex gap-4">
                      <span>
                        📅{' '}
                        {new Date(video.date).toLocaleDateString('fr-FR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span>💾 {formatFileSize(video.size)}</span>
                    </div>
                  </div>

                  <a
                    href={video.signedUrl}
                    download={video.fileName}
                    className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-lg transition-all"
                  >
                    ⬇️ Télécharger
                  </a>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-200">
              <p className="text-sm">
                ℹ️ Les lien de téléchargement sont valides pendant 7 jours. Les vidéos sont stockées de manière sécurisée sur notre serveur.
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="mt-12 bg-white/5 rounded-lg p-8 border border-white/10">
          <h3 className="text-white font-bold text-lg mb-4">❓ Comment ça marche?</h3>
          <ol className="text-gray-300 space-y-3">
            <li>
              <strong>1. Enregistrement:</strong> Lors de l&apos;événement (même hors ligne), vos
              vidéos sont enregistrées localement.
            </li>
            <li>
              <strong>2. Renseignez votre email:</strong> Lors de l&apos;examen de votre vidéo,
              entrez votre adresse email.
            </li>
            <li>
              <strong>3. Synchronisation:</strong> Dès que l&apos;appareil se reconnecte à
              Internet, les vidéos sont automatiquement téléchargées sur nos serveurs.
            </li>
            <li>
              <strong>4. Récupération:</strong> Utilisez cette page pour télécharger vos

              vidéos avec votre email.
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}

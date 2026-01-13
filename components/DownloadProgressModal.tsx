'use client';

import { useState, useEffect } from 'react';

interface DownloadProgressProps {
  isVisible: boolean;
  totalSongs: number;
  downloadedSongs: number;
  totalImages: number;
  downloadedImages: number;
  totalSize: number;
  downloadedSize: number;
}

export default function DownloadProgressModal({
  isVisible,
  totalSongs,
  downloadedSongs,
  totalImages,
  downloadedImages,
  totalSize,
  downloadedSize
}: DownloadProgressProps) {
  const [displaySize, setDisplaySize] = useState('0');
  const [displayTotalSize, setDisplayTotalSize] = useState('0');

  useEffect(() => {
    setDisplaySize((downloadedSize / 1024 / 1024).toFixed(2));
    setDisplayTotalSize((totalSize / 1024 / 1024).toFixed(2));
  }, [downloadedSize, totalSize]);

  const totalItems = totalSongs + totalImages;
  const downloadedItems = downloadedSongs + downloadedImages;
  const progressPercent = totalItems > 0 ? (downloadedItems / totalItems) * 100 : 0;

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-all duration-300">
      <style>{`
        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .modal-container {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
      
      <div className="modal-container relative max-w-md w-full mx-4">
        {/* Main container - clean and professional */}
        <div className="relative bg-white rounded-2xl shadow-2xl p-8">
          {/* Header with gradient accent line */}
          <div className="pb-6 border-b-2 border-gradient-to-r mb-6">
            <div style={{
              borderBottom: '2px solid',
              borderImage: 'linear-gradient(90deg, #3b82f6, #a855f7, #ec4899) 1',
              paddingBottom: '0'
            }}></div>
            <h2 className="text-3xl font-bold text-gray-800 mt-2 flex items-center gap-3">
              <span className="text-4xl">⬇️</span>
              Téléchargement
            </h2>
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-md">
            <div className="flex items-start gap-3">
              <span className="text-2xl flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-amber-900">Important:</p>
                <p className="text-sm text-amber-800 mt-1">
                  Ne pas quitter ou rafraîchir la page pendant le téléchargement. Veuillez rester sur cette page.
                </p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar Container */}
          <div className="mb-8">
            <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-300 rounded-full shadow-lg"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            
            {/* Progress percentage */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Progression générale</p>
              <p className="text-3xl font-bold text-transparent bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text">
                {progressPercent.toFixed(0)}%
              </p>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* Songs Card */}
            <div className="rounded-xl bg-blue-50 border-2 border-blue-200 p-4 hover:border-blue-300 transition-colors duration-200">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">♪</span>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Titres</p>
                <p className="text-2xl font-bold text-blue-600">
                  {downloadedSongs}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  de {totalSongs}
                </p>
              </div>
            </div>

            {/* Images Card */}
            <div className="rounded-xl bg-purple-50 border-2 border-purple-200 p-4 hover:border-purple-300 transition-colors duration-200">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🖼</span>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Images</p>
                <p className="text-2xl font-bold text-purple-600">
                  {downloadedImages}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  de {totalImages}
                </p>
              </div>
            </div>

            {/* Size Card */}
            <div className="rounded-xl bg-pink-50 border-2 border-pink-200 p-4 hover:border-pink-300 transition-colors duration-200">
              <div className="space-y-2">
                <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">💾</span>
                </div>
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">Taille</p>
                <p className="text-2xl font-bold text-pink-600">
                  {displaySize}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  / {displayTotalSize} MB
                </p>
              </div>
            </div>
          </div>

          {/* Bottom info bar - clean design */}
          <div className="rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 p-5 text-center mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Total des fichiers</p>
            <p className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text">
              {downloadedItems.toLocaleString()} / {totalItems.toLocaleString()}
            </p>
          </div>

          {/* Loading Animation */}
          <div className="flex justify-center items-center gap-2">
            <div className="flex gap-2">
              <div 
                className="w-3 h-3 bg-blue-500 rounded-full" 
                style={{ animation: 'bounce 1.4s infinite', animationDelay: '0s' }}
              ></div>
              <div 
                className="w-3 h-3 bg-purple-500 rounded-full" 
                style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.2s' }}
              ></div>
              <div 
                className="w-3 h-3 bg-pink-500 rounded-full" 
                style={{ animation: 'bounce 1.4s infinite', animationDelay: '0.4s' }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

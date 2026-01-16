'use client';

import { useState } from 'react';
import { useCacheStats } from '../hooks/useCacheStats';
import { CacheManager } from '../lib/cache-manager';

export function CacheManager_Component() {
  const { stats, loading, refreshStats, clearCache } = useCacheStats();
  const [clearing, setClearing] = useState(false);

  const handleClear = async (type: 'images' | 'videos' | 'all') => {
    setClearing(true);
    await clearCache(type);
    setClearing(false);
  };

  if (!stats || loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="animate-pulse">Loading cache info...</div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">📦 Cache Manager</h3>
        <button
          onClick={refreshStats}
          className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
        >
          🔄 Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        {/* Images Cache */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold">Images</div>
          <div className="text-lg font-bold text-blue-600">{stats.imagesCached}</div>
          <div className="text-xs text-gray-500">files cached</div>
        </div>

        {/* Videos Cache */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold">Videos</div>
          <div className="text-lg font-bold text-purple-600">{stats.videosCached}</div>
          <div className="text-xs text-gray-500">files cached</div>
        </div>

        {/* Total Size */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold">Size</div>
          <div className="text-lg font-bold text-green-600">
            {CacheManager.formatBytes(stats.totalSize)}
          </div>
          <div className="text-xs text-gray-500">total</div>
        </div>

        {/* Updated Time */}
        <div className="bg-white p-3 rounded border border-gray-200">
          <div className="text-xs text-gray-600 font-semibold">Updated</div>
          <div className="text-xs font-mono text-gray-700">
            {new Date(stats.lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Clear Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => handleClear('images')}
          disabled={clearing || stats.imagesCached === 0}
          className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? '⏳' : '🗑️'} Clear Images ({stats.imagesCached})
        </button>

        <button
          onClick={() => handleClear('videos')}
          disabled={clearing || stats.videosCached === 0}
          className="px-4 py-2 text-sm bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? '⏳' : '🗑️'} Clear Videos ({stats.videosCached})
        </button>

        <button
          onClick={() => handleClear('all')}
          disabled={clearing || (stats.imagesCached === 0 && stats.videosCached === 0)}
          className="px-4 py-2 text-sm bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {clearing ? '⏳' : '🗑️'} Clear All
        </button>
      </div>

      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
        💡 <strong>Tip:</strong> Images cache automatically after first load and persist for 7 days.
        Videos persist for 30 days.
      </div>
    </div>
  );
}

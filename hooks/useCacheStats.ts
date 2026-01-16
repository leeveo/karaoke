'use client';

import { useEffect, useState } from 'react';
import { CacheManager, CacheStats } from '../lib/cache-manager';

export function useCacheStats() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    setLoading(true);
    try {
      const newStats = await CacheManager.getCacheStats();
      setStats(newStats);
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (type: 'images' | 'videos' | 'all') => {
    try {
      switch (type) {
        case 'images':
          await CacheManager.clearImageCache();
          break;
        case 'videos':
          await CacheManager.clearVideoCache();
          break;
        case 'all':
          await CacheManager.clearAllCaches();
          break;
      }
      await refreshStats();
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  };

  useEffect(() => {
    refreshStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(refreshStats, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    stats,
    loading,
    refreshStats,
    clearCache,
  };
}

'use client';

import { Suspense } from 'react';
import AnalyticsContent from './AnalyticsContent';

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      
      <Suspense fallback={<div>Loading analytics data...</div>}>
        <AnalyticsContent />
      </Suspense>
    </div>
  );
}

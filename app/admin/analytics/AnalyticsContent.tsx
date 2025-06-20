'use client';

export default function AnalyticsContent() {
  // Remove useSearchParams() if not needed, or use it properly here
  
  return (
    <div>
      {/* Analytics content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
          {/* Chart or statistics content */}
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Popular Songs</h2>
          {/* Popular songs list */}
        </div>
      </div>
    </div>
  );
}

'use client';

export default function AnalyticsContent() {
  return (
    <div>
      {/* Analytics content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Usage Statistics</h2>
          {/* Chart or statistics content */}
          <p>Usage statistics will appear here</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Popular Songs</h2>
          {/* Popular songs list */}
          <p>List of popular songs will appear here</p>
        </div>
      </div>
    </div>
  );
}

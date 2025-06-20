'use client';

import { useSearchParams } from 'next/navigation';

export default function DashboardContent() {
  const _searchParams = useSearchParams(); // Prefix with underscore to indicate intentionally unused
  
  // Your dashboard content
  return (
    <div>
      {/* Dashboard cards and widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard content */}
      </div>
    </div>
  );
}

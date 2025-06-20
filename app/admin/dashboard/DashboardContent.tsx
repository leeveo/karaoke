'use client';

import { useSearchParams } from 'next/navigation';

export default function DashboardContent() {
  const searchParams = useSearchParams();
  
  // Use searchParams here and render your dashboard content
  
  return (
    <div>
      {/* Your dashboard content that needs searchParams */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Dashboard cards and widgets */}
      </div>
    </div>
  );
}

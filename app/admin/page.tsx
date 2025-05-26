'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminIndexPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard immediately when this page loads
    router.replace('/admin/dashboard');
  }, [router]);

  // Return a minimal loading state that will only show briefly during the redirect
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600"></div>
      <span className="ml-3 text-gray-600">Redirection vers le tableau de bord...</span>
    </div>
  );
}

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { useQRCode } from 'next-qrcode';
import { LoaderProvider } from '@/components/PageTransitionLoader';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { /* Canvas: QRCanvas */ } = useQRCode();

  // Rediriger /admin vers /admin/dashboard
  useEffect(() => {
    if (pathname === '/admin') {
      router.replace('/admin/dashboard');
    }
  }, [pathname, router]);

  useEffect(() => {
    async function checkAuth() {
      // Remove unused variable
      await getCurrentUser();
      
      // Simply set loading to false regardless of auth status
      setIsLoading(false);
    }
    
    checkAuth();
  }, [router]);

  if (isLoading) {
    return (
      <div className="p-6 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Déterminer quel onglet est actuellement actif
  const getActiveTab = () => {
    if (pathname?.includes('/dashboard')) return 'dashboard';
    if (pathname?.includes('/events')) return 'events';
    if (pathname?.includes('/songs')) return 'songs';

    if (pathname?.includes('/analytics')) return 'analytics';
    if (pathname?.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  // Encapsuler l'ensemble du contenu dans le LoaderProvider pour activer les transitions de page
  return (
    <LoaderProvider>
      <div className="flex h-screen bg-gray-100">
        {/* Sidebar - responsive */}
        <AdminSidebar 
          activeTab={activeTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Backdrop overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-10 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <AdminHeader 
            onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          />
          
          <main className="p-6">
            {children}
          </main>
        </div>
      </div>
    </LoaderProvider>
  );
}

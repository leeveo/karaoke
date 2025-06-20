'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { /* Canvas: QRCanvas */ } = useQRCode();

  // Rediriger /admin vers /admin/dashboard
  useEffect(() => {
    if (pathname === '/admin') {
      router.replace('/admin/dashboard');
    }
  }, [pathname, router]);

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
            <Suspense fallback={<div className="flex items-center justify-center w-full h-full">
              <div className="text-lg">Loading...</div>
            </div>}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </LoaderProvider>
  );
}

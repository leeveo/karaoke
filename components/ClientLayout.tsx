'use client';

import { LoaderProvider } from '@/components/PageTransitionLoader';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <LoaderProvider>
      <div 
        className="bg-cover bg-center bg-fixed min-h-screen"
        style={{ 
          background: "linear-gradient(135deg, #080424 0%, #160e40 100%)"
        }}
      >
        {children}
      </div>
    </LoaderProvider>
  );
}

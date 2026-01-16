import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import { OfflineEmailSyncProvider } from '@/components/OfflineEmailSyncProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Karaoke App',
  description: 'Application de karaoké en ligne',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
        <ServiceWorkerRegister />
        <OfflineEmailSyncProvider>
          {children}
        </OfflineEmailSyncProvider>
      </body>
    </html>
  );
}
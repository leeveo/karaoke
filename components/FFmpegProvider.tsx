'use client';

import { FFmpegProvider } from '@/components/FFmpegProvider';
import { useParams, useRouter } from 'next/navigation';

export default function KaraokePage() {
  const { songId } = useParams();
  const router = useRouter();

  return (
    <FFmpegProvider>
      {/* Ton composant vidéo + boutons d'enregistrement */}
    </FFmpegProvider>
  );
}

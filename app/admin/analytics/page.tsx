'use client';

import { Suspense } from 'react';
import { SearchParamsProvider, useSearchParams } from '@/components/utils/SearchParamsProvider';

// Créez un composant interne qui utilise useSearchParams
function AnalyticsContent() {
  const searchParams = useSearchParams();
  // Utilisez searchParams comme avant
  
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>
      {/* Votre contenu d'analyse ici, utilisant les searchParams si nécessaire */}
    </div>
  );
}

// Composant principal de la page
export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div>Chargement des données d'analyse...</div>}>
      <SearchParamsProvider>
        <AnalyticsContent />
      </SearchParamsProvider>
    </Suspense>
  );
}

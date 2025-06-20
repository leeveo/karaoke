'use client';

import { Suspense } from 'react';
import CreateEventContent from './CreateEventContent';

export default function CreateEventPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Créer un Nouvel Événement</h1>
      
      <Suspense fallback={<div>Chargement du formulaire d'événement...</div>}>
        <CreateEventContent />
      </Suspense>
    </div>
  );
}

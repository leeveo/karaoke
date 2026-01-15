// Server Component pour pré-générer les pages category statiquement
// Permet à Next.js de pré-rendre toutes les pages category en avance
// afin que la navigation offline fonctionne sans besoin du serveur

// ✨ CETTE FONCTION EST CRITIQUE: Pré-rendre les pages pour chaque catégorie
// Elle s'exécute au BUILD TIME (lors de npm run build)
// Pas de 'use client' - ceci est un Server Component
export async function generateStaticParams() {
  const categories = ['rock', 'pop', 'rap', 'français', 'anglais', 'hip-hop', 'all'];
  
  // Pré-générer les pages pour chaque catégorie
  // Cela crée statiquement:
  // - /event/[id]/category/rock
  // - /event/[id]/category/pop
  // - /event/[id]/category/rap
  // - etc.
  return categories.map((category) => ({
    category: category,
    // Note: L'ID de l'événement provient du segment parent [id]
    // Next.js va combiné ces parametres avec celui du parent
  }));
}

// Importer le Client Component
import EventCategoryPageClient from './CategoryPageClient';

// Le Server Component parent simplement rend le Client Component
// Ceci permet à Next.js d'utiliser generateStaticParams AVANT le 'use client'
export default function EventCategoryPage({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}) {
  return <EventCategoryPageClient params={params} />;
}

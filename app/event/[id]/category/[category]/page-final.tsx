// Server Component pour pré-générer les pages category statiquement
// Permet à Next.js de pré-rendre toutes les pages category en avance
// afin que la navigation offline fonctionne sans besoin du serveur

export async function generateStaticParams() {
  const categories = ['rock', 'pop', 'rap', 'français', 'anglais', 'hip-hop', 'all'];
  return categories.map((category) => ({ category }));
}

import EventCategoryPageClient from './CategoryPageClient';

export default function EventCategoryPage({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}) {
  return <EventCategoryPageClient params={params} />;
}

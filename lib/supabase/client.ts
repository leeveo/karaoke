import { createClient } from '@supabase/supabase-js';

// Vérifier que les variables d'environnement sont définies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Les variables d\'environnement SUPABASE ne sont pas définies');
}

// Créer un client Supabase singleton
export const supabase = createClient(supabaseUrl, supabaseKey);

// Récupérer l'utilisateur actuel ou créer un utilisateur anonyme
export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  
  // Si l'utilisateur est connecté, renvoyer son ID
  if (data?.session?.user) {
    return data.session.user;
  }
  
  // Sinon, utiliser un ID par défaut pour les tests (à remplacer par un système d'auth)
  return { id: 'anonymous-user-id' };
}

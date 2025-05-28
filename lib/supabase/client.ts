import { createClient } from '@supabase/supabase-js';

// Add default values and error handling for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if required environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  // Only log in development to avoid build errors
  if (process.env.NODE_ENV === 'development') {
    console.error('Les variables d\'environnement SUPABASE ne sont pas définies');
  }
}

// Create Supabase client (will work with empty strings but won't function properly)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

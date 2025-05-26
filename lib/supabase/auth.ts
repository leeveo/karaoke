import { supabase } from './client';

// Fonction pour connecter un utilisateur
export async function signIn(email: string, password: string) {
  try {
    console.log('Tentative de connexion pour:', email);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Erreur de connexion:', error);
      return { user: null, error: error.message };
    }
    
    console.log('Connexion réussie:', data.user);
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('Erreur lors de la connexion:', error);
    return { user: null, error: error.message };
  }
}

// Fonction pour déconnecter un utilisateur
export async function signOut() {
  return await supabase.auth.signOut();
}

// Fonction pour récupérer l'utilisateur actuel
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user || null;
}

// Au lieu d'essayer de créer un utilisateur automatiquement,
// utilisez cette fonction pour créer un nouvel utilisateur via l'interface admin
export async function signUp(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) {
      return { user: null, error: error.message };
    }
    
    return { user: data.user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
}

// Pour le développement seulement - utiliser un ID utilisateur par défaut
// sans essayer de créer un utilisateur de test
export async function getDevUserId() {
  // Vérifier d'abord si un utilisateur est déjà connecté
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.user) {
    return session.user.id;
  }
  
  // ID utilisateur anonyme pour le développement
  return 'dev-user-id';
}

// Pour le développement uniquement: 
// Permet de créer un utilisateur de test si aucun n'existe
export async function ensureDevelopmentUser(email = 'test@example.com', password = 'password123') {
  try {
    // Vérifier si on est déjà connecté
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      console.log('Déjà connecté avec l\'utilisateur:', session.user.email);
      return session.user;
    }
    
    console.log('Tentative de connexion avec un utilisateur de test...');
    
    // Essayer de se connecter avec l'utilisateur fourni
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      // L'utilisateur n'existe pas, essayons de le créer
      console.log('Échec de connexion, tentative de création d\'un utilisateur de test...');
      const { data: signupData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (signupError) {
        console.error('Impossible de créer un utilisateur de test:', signupError);
        return null;
      }
      
      return signupData.user;
    }
    
    return data.user;
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    return null;
  }
}

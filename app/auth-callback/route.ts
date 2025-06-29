import { NextRequest, NextResponse } from 'next/server';
import { setSharedAuthCookie } from '@/lib/sharedAuth';

export async function GET(req: NextRequest) {
  try {
    // Récupérer le token et l'URL de retour des paramètres
    const token = req.nextUrl.searchParams.get('token');
    const returnUrl = req.nextUrl.searchParams.get('returnUrl');
    
    console.log('Callback d\'authentification reçu:', {
      hasToken: !!token,
      returnUrl: returnUrl || '/'
    });
    
    if (!token) {
      console.error('Aucun token reçu dans le callback');
      return NextResponse.redirect(new URL('/', req.url));
    }
    
    // Créer la réponse avec redirection
    const response = NextResponse.redirect(
      new URL(returnUrl || '/admin', req.url)
    );
    
    // Définir le cookie d'authentification
    setSharedAuthCookie(response, token);
    
    return response;
  } catch (error) {
    console.error('Erreur dans le callback d\'auth:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}

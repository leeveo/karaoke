import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Auth check: token in URL, admin_session/shared_auth_token cookie, has_auth_in_ls, or bypass param
function isAuthenticated(req: NextRequest): boolean {
  // 1. Token in URL
  if (req.nextUrl.searchParams.get('token')) {
    console.log('Token in URL - access granted');
    return true;
  }
  // 2. shared_auth_token cookie
  if (req.cookies.has('shared_auth_token')) {
    console.log('shared_auth_token cookie found - access granted');
    return true;
  }
  // 3. admin_session cookie (from main app)
  if (req.cookies.has('admin_session')) {
    console.log('admin_session cookie found - access granted');
    return true;
  }
  // 4. has_auth_in_ls flag
  if (req.cookies.has('has_auth_in_ls')) {
    console.log('has_auth_in_ls cookie found - access granted');
    return true;
  }
  // 5. bypass param for dev/test
  if (req.nextUrl.searchParams.get('bypass') === 'true') {
    console.log('Bypass param - access granted');
    return true;
  }
  console.log('No authentication found');
  return false;
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hostname = req.nextUrl.hostname;
  const res = NextResponse.next();

  // Redirection racine UNIQUEMENT sur photobooth.waibooth.app
  if (
    (path === '/' || path === '') &&
    (hostname === 'photobooth.waibooth.app' || hostname.startsWith('localhost'))
  ) {
    const adminUrl = new URL('/photobooth-ia/admin', req.url);
    return NextResponse.redirect(adminUrl, 308);
  }

  // CORS headers
  res.headers.set('Access-Control-Allow-Origin', '*');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Exclusions
  const isAdminRoute = path.startsWith('/photobooth-ia/admin');
  const isExcluded =
    path === '/photobooth-ia/admin/login' ||
    path === '/photobooth-ia/admin/logout' ||
    path === '/photobooth-ia/admin/register' ||
    path === '/photobooth-ia/admin/oauth-callback' ||
    path === '/photobooth-ia/admin/dashboard';

  // Si route admin et pas exclue
  if (isAdminRoute && !isExcluded) {
    const customAuthCookie = req.cookies.get('admin_session')?.value;

    if (!customAuthCookie) {
      return NextResponse.redirect(new URL('/photobooth-ia/admin/login', req.url));
    }

    // Toujours poser le cookie partagé si admin_session existe
    try {
      const decoded = Buffer.from(customAuthCookie, 'base64').toString();
      const adminSession = JSON.parse(decoded);
      const userId = adminSession.userId;

      if (userId) {
        // Générer le token partagé ici (copie locale de la fonction)
        const payload = {
          userId,
          timestamp: Date.now(),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
        };
        const newSharedToken = Buffer.from(JSON.stringify(payload)).toString('base64');
        // Détection de l'environnement pour le cookie domain
        const cookieOptions: any = {
          path: '/',
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        };
        if (hostname.endsWith('.waibooth.app')) {
          cookieOptions.domain = '.waibooth.app';
        }
        res.cookies.set('shared_auth_token', newSharedToken, cookieOptions);
        console.log('Cookie shared_auth_token posé', cookieOptions);
      }
    } catch (error) {
      console.error('Erreur lors de la création du token partagé:', error);
    }
  }

  // Pose le cookie sur toutes les requêtes pour debug (à retirer en prod)
  if (req.cookies.get('admin_session')?.value) {
    try {
      const decoded = Buffer.from(req.cookies.get('admin_session')!.value, 'base64').toString();
      const adminSession = JSON.parse(decoded);
      const userId = adminSession.userId;
      if (userId) {
        const payload = {
          userId,
          timestamp: Date.now(),
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7
        };
        const newSharedToken = Buffer.from(JSON.stringify(payload)).toString('base64');
        const cookieOptions: any = {
          path: '/',
          secure: true,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        };
        if (hostname.endsWith('.waibooth.app')) {
          cookieOptions.domain = '.waibooth.app';
        }
        res.cookies.set('shared_auth_token', newSharedToken, cookieOptions);
        console.log('Cookie shared_auth_token posé partout (debug)', cookieOptions);
      }
    } catch (e) {
      console.error('Erreur debug pose cookie:', e);
    }
  }

  // Protect /admin routes (pour mosaic)
  if (path === '/admin' || path.startsWith('/admin/')) {
    if (!isAuthenticated(req)) {
      console.log('Not authenticated, redirecting to login');
      const loginBaseUrl =
        process.env.NEXT_PUBLIC_AUTH_LOGIN_URL ||
        'https://photobooth.waibooth.app/photobooth-ia/admin/login';
      const currentUrl = req.nextUrl.toString();
      const callbackUrl = new URL('/auth-callback', req.nextUrl.origin);
      const loginUrl = new URL(loginBaseUrl);
      loginUrl.searchParams.set('returnUrl', currentUrl);
      loginUrl.searchParams.set('callbackUrl', callbackUrl.toString());
      loginUrl.searchParams.set('shared', 'true');
      return NextResponse.redirect(loginUrl);
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/',  // Root path
    '/api/:path*',
    '/photobooth-ia/admin/:path*',
  ],
};

import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SHARED_AUTH_SECRET = process.env.SHARED_AUTH_SECRET || '';
const COOKIE_NAME = 'shared_auth_token';

interface UserPayload {
  userId: string;
  email?: string;
  timestamp?: number;
  exp?: number;
}

// Verify a shared token
export async function verifySharedToken(token: string): Promise<UserPayload | null> {
  try {
    if (!SHARED_AUTH_SECRET) {
      console.error('SHARED_AUTH_SECRET environment variable is not set');
      return null;
    }

    // Log token format for debugging (partial, for security)
    console.log('Token format check:', {
      length: token.length,
      start: token.substring(0, 10),
      containsDots: token.includes('.'),
      parts: token.split('.').length
    });

    // Check if this is a non-JWT token (without dots)
    if (!token.includes('.')) {
      try {
        // Try to decode as base64 directly
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        console.log('Attempting to decode as base64 string');
        
        try {
          const parsedUser = JSON.parse(decoded);
          console.log('Successfully parsed decoded token as JSON');
          
          // Check if it has expected fields
          if (parsedUser.userId) {
            console.log('Valid user found in token:', {
              userId: parsedUser.userId,
              hasEmail: !!parsedUser.email
            });
            return parsedUser as UserPayload;
          }
          console.log('Decoded token missing required fields');
        } catch (jsonError) {
          // Fix the TypeScript error by using a type guard
          console.error('Failed to parse decoded token as JSON:', jsonError instanceof Error ? jsonError.message : 'Unknown error');
        }
      } catch (decodeError) {
        // Fix the TypeScript error by using a type guard
        console.error('Failed to decode token as base64:', decodeError instanceof Error ? decodeError.message : 'Unknown error');
      }
    }

    // Standard JWT verification as fallback
    const secret = new TextEncoder().encode(SHARED_AUTH_SECRET);
    
    try {
      const { payload } = await jwtVerify(token, secret);
      return payload as unknown as UserPayload;
    } catch (jwtError) {
      // Fix TypeScript error by using a type guard
      console.error('JWT verification failed:', jwtError instanceof Error ? jwtError.message : 'Unknown error');
      return null;
    }
  } catch (error) {
    console.error('Error verifying shared token:', error);
    return null;
  }
}

// Get the current user from the shared token cookie
export async function getCurrentUser(req: NextRequest): Promise<UserPayload | null> {
  try {
    // Check for token in URL parameters first (highest priority)
    const tokenParam = req.nextUrl.searchParams.get('token');
    if (tokenParam) {
      console.log('Found token in URL params, verifying...');
      return await verifySharedToken(tokenParam);
    }
    
    // Handle both Promise and non-Promise cookies (Vercel vs local)
    const cookies = req.cookies instanceof Promise ? await req.cookies : req.cookies;
    
    // Try all possible cookie names
    let token = cookies.get?.('shared_auth_token_secure')?.value;
    
    // If not found, try the regular cookie
    if (!token) {
      token = cookies.get?.('shared_auth_token')?.value;
    }
    
    // Try JS-set cookie
    if (!token) {
      token = cookies.get?.('shared_auth_token_js')?.value;
    }
    
    if (!token) {
      console.log('No auth token found in cookies');
      return null;
    }
    
    console.log('Found auth token in cookies, verifying...');
    return await verifySharedToken(token);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Set the shared auth cookie on a response
export function setSharedAuthCookie(response: NextResponse, token: string): NextResponse {
  console.log('Setting shared auth cookie, token length:', token.length);
  
  // Accept both JWT and Base64 token formats
  // For Base64 tokens, make sure we verify basic structure
  if (!token.includes('.') || token.split('.').length !== 3) {
    try {
      // For non-JWT tokens, verify it can be decoded as base64
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      
      // Check if it's valid JSON with userId
      const parsed = JSON.parse(decoded);
      if (!parsed.userId) {
        console.error('Invalid token content (missing userId), not setting cookie');
        return response;
      }
      
      // Token seems valid, set cookie
      console.log('Setting cookie with valid base64 token');
    } catch (e) {
      console.error('Invalid token format, not setting cookie:', e);
      return response;
    }
  }
  
  // Set the cookie with a long expiration time
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  });
  
  return response;
}

// Clear the auth cookie (for logout)
export function clearSharedAuthCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });
  
  return response;
}

// Ajoute cette fonction utilitaire pour générer un token partagé (base64)
export async function generateSharedToken(userId: string): Promise<string | null> {
  try {
    const payload = {
      userId,
      timestamp: Date.now(),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 // 7 jours
    };
    const token = Buffer.from(JSON.stringify(payload)).toString('base64');
    return token;
  } catch (error) {
    console.error('Erreur génération token partagé:', error);
    return null;
  }
}

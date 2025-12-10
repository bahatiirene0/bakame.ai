/**
 * Supabase Auth Proxy (Next.js 16)
 *
 * CRITICAL: This proxy is required for Supabase SSR auth to work!
 * It refreshes expired auth tokens and syncs cookies between server and client.
 * Based on official Supabase Next.js 16 documentation.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export default async function proxy(request: NextRequest) {
  // Create a response that we'll modify
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // First set cookies on the request (for downstream server components)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Then create a new response with cookies set
          supabaseResponse = NextResponse.next({
            request,
          });
          // Set cookies on the response (for the browser)
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: DO NOT use getSession() here as it's not reliable
  // Use getUser() to validate the auth token with Supabase server
  // This also refreshes the session if needed, updating cookies automatically
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Log for debugging (can be removed in production)
  if (request.nextUrl.pathname === '/') {
    console.log('[PROXY] User:', user?.email || 'guest');
  }

  // CRITICAL: Return the supabaseResponse with updated cookies
  // If you don't return this response, the browser and server will go out of sync
  return supabaseResponse;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

/**
 * Auth Callback Route
 *
 * Handles OAuth, magic link, and email verification redirects from Supabase
 * Based on official Supabase SSR documentation
 */

import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const origin = requestUrl.origin;

  // Handle OAuth errors
  if (error) {
    console.error('Auth callback error:', error, error_description);
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error_description || error)}`, origin)
    );
  }

  // Create response that we'll modify with cookies
  let response = NextResponse.redirect(new URL('/', origin));

  // Create Supabase client that writes cookies to the response
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll();
          console.log('[AUTH CALLBACK] getAll cookies:', cookies.map(c => c.name));
          return cookies;
        },
        setAll(cookiesToSet) {
          console.log('[AUTH CALLBACK] setAll called with', cookiesToSet.length, 'cookies:');
          cookiesToSet.forEach(({ name, value, options }) => {
            console.log('[AUTH CALLBACK] Setting cookie:', name, 'options:', JSON.stringify(options));
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Handle email verification and password recovery (token_hash flow)
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'signup' | 'recovery' | 'invite' | 'email',
    });

    if (verifyError) {
      console.error('Verification error:', verifyError);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(verifyError.message)}`, origin)
      );
    }

    // For password recovery, redirect to reset password page
    if (type === 'recovery') {
      response = NextResponse.redirect(new URL('/auth/reset-password', origin));
      return response;
    }

    // Email verified successfully
    response = NextResponse.redirect(new URL('/?verified=true', origin));
    return response;
  }

  // Handle OAuth callback (code exchange flow - PKCE)
  if (code) {
    console.log('[AUTH CALLBACK] Exchanging code for session...');
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('[AUTH CALLBACK] Code exchange FAILED:', exchangeError.message);
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(exchangeError.message)}`, origin)
      );
    }

    console.log('[AUTH CALLBACK] Code exchange SUCCESS, user:', data?.user?.email);
    console.log('[AUTH CALLBACK] Session exists:', !!data?.session);

    // Explicitly set session to ensure cookies are written
    if (data?.session) {
      console.log('[AUTH CALLBACK] Explicitly setting session to trigger setAll...');
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }
  }

  // Return response with cookies
  const responseCookies = response.cookies.getAll();
  console.log('[AUTH CALLBACK] Final response cookies:', responseCookies.map(c => c.name));
  console.log('[AUTH CALLBACK] Redirecting to home page with', responseCookies.length, 'cookies...');
  return response;
}

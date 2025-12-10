/**
 * AuthProvider Component
 *
 * Initializes Supabase auth and syncs user state with chat store
 * Accepts initial user from server to avoid hydration mismatch
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useChatStore } from '@/store/chatStore';
import type { User } from '@supabase/supabase-js';

interface AuthProviderProps {
  children: React.ReactNode;
  initialUser?: User | null;
}

export default function AuthProvider({ children, initialUser }: AuthProviderProps) {
  const { initialize, isInitialized, user, setInitialUser } = useAuthStore();
  const { setCurrentUser, loadFromStorage } = useChatStore();
  const previousUserId = useRef<string | null>(null);
  const hasInitializedChat = useRef(false);

  // Set initial user from server immediately (before useEffect)
  // This ensures the first render has the correct user
  useEffect(() => {
    if (initialUser && !isInitialized) {
      console.log('[AUTH PROVIDER] Setting initial user from server:', initialUser.email);
      setInitialUser(initialUser);
    }
  }, []); // Only run once on mount

  // Initialize auth on mount (sets up listeners)
  useEffect(() => {
    console.log('[AUTH PROVIDER] Mount effect, isInitialized:', isInitialized);
    if (!isInitialized) {
      console.log('[AUTH PROVIDER] Calling initialize()...');
      initialize();
    }
  }, [initialize, isInitialized]);

  // Sync auth user with chat store - using callback to avoid stale closures
  const syncUserState = useCallback(() => {
    if (!isInitialized) {
      return;
    }

    const currentUserId = user?.id || null;

    // Only update if user ID actually changed
    if (currentUserId !== previousUserId.current) {
      console.log('[AUTH PROVIDER] User changed:', previousUserId.current?.slice(0, 8), '->', currentUserId?.slice(0, 8));
      previousUserId.current = currentUserId;

      if (user) {
        // User logged in - sync to chatStore (this will load their sessions)
        setCurrentUser(user);
        hasInitializedChat.current = true;
      } else if (hasInitializedChat.current) {
        // User logged out - only clear if we had initialized before
        console.log('[AUTH PROVIDER] User logged out, clearing chat store');
        setCurrentUser(null);
        loadFromStorage();
      }
    }
  }, [user, isInitialized, setCurrentUser, loadFromStorage]);

  useEffect(() => {
    syncUserState();
  }, [syncUserState]);

  return <>{children}</>;
}

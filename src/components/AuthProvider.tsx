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
    console.log('[AUTH PROVIDER] syncUserState called, isInitialized:', isInitialized, 'user:', user?.email || 'none');

    if (!isInitialized) {
      console.log('[AUTH PROVIDER] Not initialized yet, skipping sync');
      return;
    }

    const currentUserId = user?.id || null;

    // Only update if user ID actually changed
    if (currentUserId !== previousUserId.current) {
      console.log('[AUTH PROVIDER] User changed from', previousUserId.current, 'to', currentUserId);
      previousUserId.current = currentUserId;

      if (user) {
        console.log('[AUTH PROVIDER] Setting current user in chat store:', user.email);
        // User logged in - sync to chatStore (this will load their sessions)
        setCurrentUser(user);
        hasInitializedChat.current = true;
      } else {
        console.log('[AUTH PROVIDER] Clearing user, loading from storage');
        // No user - clear and load guest sessions
        setCurrentUser(null);
        // Only load from storage if we had a user before (sign out scenario)
        // or if this is the first initialization
        if (hasInitializedChat.current || !previousUserId.current) {
          loadFromStorage();
        }
      }
    } else {
      console.log('[AUTH PROVIDER] User ID unchanged, no sync needed');
    }
  }, [user, isInitialized, setCurrentUser, loadFromStorage]);

  useEffect(() => {
    syncUserState();
  }, [syncUserState]);

  return <>{children}</>;
}

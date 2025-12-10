/**
 * Zustand store for managing theme (dark/light mode)
 * Persists theme preference to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ThemeState } from '@/types';

// Safe localStorage check for private browsing mode
const canUseLocalStorage = (): boolean => {
  try {
    const testKey = '__bakame_storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      // Default to dark mode for that "Grok" aesthetic
      theme: 'dark',

      // Toggle between light and dark
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // Set specific theme
      setTheme: (theme: Theme) => set({ theme }),
    }),
    {
      name: 'bakame-theme', // localStorage key
      // Custom storage with error handling for private browsing mode
      storage: {
        getItem: (name) => {
          if (!canUseLocalStorage()) return null;
          try {
            const value = localStorage.getItem(name);
            return value ? JSON.parse(value) : null;
          } catch {
            return null;
          }
        },
        setItem: (name, value) => {
          if (!canUseLocalStorage()) return;
          try {
            localStorage.setItem(name, JSON.stringify(value));
          } catch {
            // Silently fail in private browsing or when quota exceeded
          }
        },
        removeItem: (name) => {
          if (!canUseLocalStorage()) return;
          try {
            localStorage.removeItem(name);
          } catch {
            // Silently fail
          }
        },
      },
    }
  )
);

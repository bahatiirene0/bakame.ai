/**
 * Zustand store for managing theme (dark/light mode)
 * Persists theme preference to localStorage
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Theme, ThemeState } from '@/types';

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
    }
  )
);

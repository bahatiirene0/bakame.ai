/**
 * ThemeProvider Component
 * Wraps the app and applies theme class to document
 * Handles hydration mismatch by waiting for client mount
 */

'use client'
/* eslint-disable */;

import { useEffect, useState, useLayoutEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Use useLayoutEffect on client, useEffect on server
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme } = useThemeStore();
  const [mounted, setMounted] = useState(false);

  // Mark as mounted after hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply theme class to document immediately when theme changes
  useIsomorphicLayoutEffect(() => {
    const root = document.documentElement;

    // Remove both classes first
    root.classList.remove('light', 'dark');

    // Add the current theme class
    root.classList.add(theme);

    // Also update the color-scheme for native elements
    root.style.colorScheme = theme;
  }, [theme]);

  // Prevent hydration mismatch - show children but with correct theme applied
  if (!mounted) {
    return (
      <div className="min-h-screen">
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

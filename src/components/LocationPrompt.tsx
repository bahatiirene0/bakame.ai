/**
 * Location Permission Prompt
 *
 * A subtle banner that prompts users to share their location
 * for better directions. Appears when user might benefit from
 * location services but hasn't granted permission yet.
 */

'use client'
/* eslint-disable */;

import { useState, useEffect } from 'react';
import { useLocationStore } from '@/store/locationStore';

export default function LocationPrompt() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const {
    permissionStatus,
    isLoading,
    requestLocation,
  } = useLocationStore();

  // Check if we should show the prompt (only if permission not yet asked)
  useEffect(() => {
    // Don't show if already granted, denied, or dismissed
    if (permissionStatus !== 'prompt' || isDismissed) {
      setIsVisible(false);
      return;
    }

    // Check localStorage for previous dismissal
    const dismissed = localStorage.getItem('bakame-location-dismissed');
    if (dismissed) {
      setIsDismissed(true);
      setIsVisible(false);
      return;
    }

    // Show prompt after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [permissionStatus, isDismissed]);

  const handleAllow = async () => {
    await requestLocation();
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    // Remember dismissal for this session
    localStorage.setItem('bakame-location-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 animate-slideUp">
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl
        bg-white/95 dark:bg-[#1a1a1a]/95 backdrop-blur-lg
        border border-gray-200/50 dark:border-white/10
        shadow-xl shadow-black/10 dark:shadow-black/30
        max-w-sm">
        {/* Location icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-xl
          bg-gradient-to-br from-blue-500 to-green-500
          flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            Enable location?
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Get directions from your current location
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400
              hover:text-gray-700 dark:hover:text-gray-200
              transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleAllow}
            disabled={isLoading}
            className="px-4 py-1.5 text-xs font-medium text-white
              bg-gradient-to-r from-blue-500 to-green-500
              hover:from-blue-600 hover:to-green-600
              rounded-lg transition-all duration-200
              disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center gap-1">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                ...
              </span>
            ) : (
              'Allow'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to trigger location request programmatically
 * Use this when the user asks for directions
 */
export function useLocationPrompt() {
  const {
    latitude,
    longitude,
    permissionStatus,
    requestLocation,
  } = useLocationStore();

  const hasLocation = latitude !== null && longitude !== null;

  /**
   * Ensure we have location, requesting if needed
   * Returns coords if available, null if denied
   */
  const ensureLocation = async () => {
    if (hasLocation) {
      return { latitude, longitude };
    }

    if (permissionStatus === 'denied') {
      return null;
    }

    return await requestLocation();
  };

  return {
    hasLocation,
    ensureLocation,
    permissionStatus,
  };
}

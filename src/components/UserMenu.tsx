/**
 * UserMenu Component
 *
 * Shows user avatar with dropdown menu for:
 * - Profile info
 * - Sign out option
 * Or login button if not authenticated
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function UserMenu() {
  const router = useRouter();
  const { user, profile, isLoading, isInitialized, signOut } = useAuthStore();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  // Still loading
  if (!isInitialized || isLoading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-white/10 animate-pulse" />
    );
  }

  // Not logged in - show login button
  if (!user) {
    return (
      <button
        onClick={() => router.push('/auth/login')}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl
          bg-gradient-to-r from-green-500 to-blue-500
          text-white text-sm font-medium
          shadow-md shadow-green-500/20
          hover:shadow-lg hover:shadow-green-500/30
          hover:scale-105 active:scale-95
          transition-all duration-200"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
        <span className="hidden sm:inline">Injira</span>
      </button>
    );
  }

  // Logged in - show user menu
  const displayName = profile?.name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="group flex items-center gap-2 p-1 rounded-xl
          hover:bg-gray-100 dark:hover:bg-white/10
          transition-all duration-200"
      >
        {/* Avatar */}
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover
              ring-2 ring-green-500/30 group-hover:ring-green-500/50
              transition-all duration-200"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500
            flex items-center justify-center text-white text-xs font-medium
            ring-2 ring-green-500/30 group-hover:ring-green-500/50
            transition-all duration-200">
            {initials}
          </div>
        )}

        {/* Dropdown arrow */}
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
            showMenu ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-12 w-64
          bg-white dark:bg-[#1a1a1a]
          rounded-2xl shadow-xl shadow-black/10 dark:shadow-black/40
          border border-gray-200/50 dark:border-white/10
          py-2 z-50 animate-fadeIn overflow-hidden">

          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500
                  flex items-center justify-center text-white text-sm font-medium">
                  {initials}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {displayName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            {/* Profile Link */}
            <button
              onClick={() => {
                setShowMenu(false);
                router.push('/profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5
                text-gray-700 dark:text-gray-200 text-sm
                hover:bg-gray-50 dark:hover:bg-white/5
                transition-colors duration-150"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Umwirondoro
            </button>

            {/* Settings Link */}
            <button
              onClick={() => {
                setShowMenu(false);
                router.push('/profile');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5
                text-gray-700 dark:text-gray-200 text-sm
                hover:bg-gray-50 dark:hover:bg-white/5
                transition-colors duration-150"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Igenamiterere
            </button>

            {/* Subscription (Future) */}
            <button
              onClick={() => {
                setShowMenu(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5
                text-gray-700 dark:text-gray-200 text-sm
                hover:bg-gray-50 dark:hover:bg-white/5
                transition-colors duration-150"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              Gahunda (Free)
              <span className="ml-auto text-xs text-green-500 font-medium">Free</span>
            </button>
          </div>

          {/* Sign Out */}
          <div className="border-t border-gray-100 dark:border-white/10 pt-1 mt-1">
            <button
              onClick={async () => {
                setShowMenu(false);
                await signOut();
                // Navigate to home - state is already cleared so UI updates instantly
                router.push('/');
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5
                text-red-600 dark:text-red-400 text-sm
                hover:bg-red-50 dark:hover:bg-red-500/10
                transition-colors duration-150"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sohoka
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

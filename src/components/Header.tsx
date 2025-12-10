/**
 * Header Component - Premium Design
 *
 * Features:
 * - Glassmorphism styling
 * - Gradient hover effects
 * - Smooth micro-interactions
 * - Animated theme toggle
 * - User menu with auth
 */

'use client';

import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore, useTranslation } from '@/store/languageStore';
// NOTE: SpecialistAgentsMenu removed - n8n workflows now handle domain expertise automatically

export default function Header() {
  const router = useRouter();
  const { theme, toggleTheme } = useThemeStore();
  const { sidebarOpen } = useChatStore();
  const { user } = useAuthStore();
  const { language, toggleLanguage } = useLanguageStore();
  const t = useTranslation();

  // For guests: no sidebar, so header spans full width
  // For logged-in users: header adjusts for sidebar
  const headerLeft = user ? (sidebarOpen ? 'left-0 lg:left-64' : 'left-0') : 'left-0';
  const needsPadding = user && !sidebarOpen;

  return (
    <header className={`fixed top-0 right-0 z-30
      backdrop-blur-xl bg-white/80 dark:bg-[#0a0a0a]/80
      border-b border-gray-200/50 dark:border-white/5
      shadow-sm shadow-black/5 dark:shadow-black/20
      transition-all duration-300 ease-out fixed-top-safe ${headerLeft}`}>
      <div className="max-w-3xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
        {/* Left side - Logo (with left padding when sidebar toggle is visible for logged-in users) */}
        <div className={`flex items-center gap-2 transition-all duration-300 ${
          needsPadding ? 'lg:pl-12' : ''
        }`}>
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
                flex items-center justify-center shadow-lg shadow-green-500/20
                group-hover:shadow-green-500/40 group-hover:scale-105
                transition-all duration-300">
                <span className="text-base">🐰</span>
              </div>
              {/* Online indicator - subtle glow instead of pulse */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full
                border-2 border-white dark:border-[#0a0a0a] shadow-sm shadow-green-500/40" />
            </div>
            <div>
              <h1 className="text-base font-semibold bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500
                bg-clip-text text-transparent
                group-hover:from-green-400 group-hover:via-yellow-400 group-hover:to-blue-400
                transition-all duration-300">
                Bakame AI
              </h1>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* For guests: show Sign In and Sign Up buttons */}
          {!user && (
            <>
              {/* Sign In button - outlined */}
              <button
                type="button"
                onClick={() => router.push('/auth/login?mode=signin')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium
                  text-gray-700 dark:text-gray-200
                  border border-gray-300 dark:border-white/20
                  hover:border-green-500 hover:text-green-600 dark:hover:text-green-400
                  hover:-translate-y-0.5 hover:shadow-md
                  active:translate-y-0 active:scale-95
                  transition-all duration-200 cursor-pointer"
              >
                {t.signIn}
              </button>

              {/* Sign Up button - filled */}
              <button
                type="button"
                onClick={() => router.push('/auth/login?mode=signup')}
                className="px-4 py-1.5 rounded-lg text-sm font-medium
                  text-white bg-green-600 hover:bg-green-700
                  hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30
                  active:translate-y-0 active:scale-95
                  transition-all duration-200 cursor-pointer"
              >
                {t.signUp}
              </button>
            </>
          )}

          {/* Language Toggle - for guests */}
          {!user && (
            <button
              onClick={toggleLanguage}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 ml-1 sm:ml-2 rounded-xl text-xs font-medium
                text-gray-500 dark:text-gray-400
                hover:bg-gray-100 dark:hover:bg-white/5
                border border-gray-200 dark:border-white/10
                transition-all duration-200 min-w-[44px] min-h-[44px]"
              title={language === 'rw' ? 'Switch to English' : 'Hindura ube Ikinyarwanda'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              <span className="min-w-[20px] text-center hidden sm:inline">{language === 'rw' ? 'RW' : 'EN'}</span>
            </button>
          )}

          {/* Theme Toggle Button - Premium */}
          <button
            onClick={toggleTheme}
            className="group relative p-3 rounded-xl overflow-hidden
              bg-gray-100/80 dark:bg-white/5
              border border-gray-200/50 dark:border-white/10
              hover:border-yellow-500/30 dark:hover:border-yellow-500/20
              hover:shadow-lg hover:shadow-yellow-500/10
              active:scale-95 transition-all duration-300
              min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {/* Hover gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-orange-500/0 to-yellow-500/0
              group-hover:from-yellow-500/10 group-hover:via-orange-500/5 group-hover:to-yellow-500/10
              transition-all duration-300" />

            {theme === 'dark' ? (
              <svg
                className="relative w-4 h-4 text-yellow-500
                  group-hover:rotate-45 group-hover:scale-110
                  transition-all duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="relative w-4 h-4 text-gray-600 dark:text-gray-400
                  group-hover:-rotate-12 group-hover:scale-110 group-hover:text-blue-500
                  transition-all duration-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          {/* Agent menu removed - Bakame now uses n8n workflows for all capabilities */}
        </div>
      </div>
    </header>
  );
}

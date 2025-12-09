/**
 * Header Component - Premium Design
 *
 * Features:
 * - Glassmorphism styling
 * - Gradient hover effects
 * - Smooth micro-interactions
 * - Animated theme toggle
 */

'use client';

import { useThemeStore } from '@/store/themeStore';
import { useChatStore } from '@/store/chatStore';

export default function Header() {
  const { theme, toggleTheme } = useThemeStore();
  const { sessions, activeSessionId, clearMessages, isStreaming, sidebarOpen } = useChatStore();

  // Get messages from active session (with safe fallback)
  const activeSession = sessions?.find(s => s.id === activeSessionId);
  const messages = activeSession?.messages ?? [];

  return (
    <header className={`fixed top-0 right-0 z-30
      backdrop-blur-xl bg-white/80 dark:bg-[#0a0a0a]/80
      border-b border-gray-200/50 dark:border-white/5
      shadow-sm shadow-black/5 dark:shadow-black/20
      transition-all duration-300 ease-out ${
      sidebarOpen ? 'left-0 lg:left-64' : 'left-0'
    }`}>
      <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left side - Logo (with left padding when sidebar toggle is visible) */}
        <div className={`flex items-center gap-2 transition-all duration-300 ${
          !sidebarOpen ? 'lg:pl-12' : ''
        }`}>
          <div className="flex items-center gap-2.5 group cursor-default">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
                flex items-center justify-center shadow-lg shadow-green-500/20
                group-hover:shadow-green-500/40 group-hover:scale-105
                transition-all duration-300">
                <span className="text-base">🐰</span>
              </div>
              {/* Online indicator with pulse */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full
                border-2 border-white dark:border-[#0a0a0a] animate-pulse shadow-lg shadow-green-500/50" />
            </div>
            <div>
              <h1 className="text-base font-semibold bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500
                bg-clip-text text-transparent
                group-hover:from-green-400 group-hover:via-yellow-400 group-hover:to-blue-400
                transition-all duration-300">
                Bakame
              </h1>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Clear chat button - only show when there are messages */}
          {messages.length > 0 && !isStreaming && (
            <button
              onClick={clearMessages}
              className="group p-2 rounded-xl text-gray-400 dark:text-gray-500
                hover:bg-gradient-to-r hover:from-red-500/10 hover:to-orange-500/10
                hover:text-red-500 dark:hover:text-red-400
                border border-transparent hover:border-red-500/20
                active:scale-95 transition-all duration-200"
              aria-label="Clear chat"
              title="Siba ubutumwa"
            >
              <svg
                className="w-4 h-4 group-hover:rotate-12 transition-transform duration-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}

          {/* Theme Toggle Button - Premium */}
          <button
            onClick={toggleTheme}
            className="group relative p-2 rounded-xl overflow-hidden
              bg-gray-100/80 dark:bg-white/5
              border border-gray-200/50 dark:border-white/10
              hover:border-yellow-500/30 dark:hover:border-yellow-500/20
              hover:shadow-lg hover:shadow-yellow-500/10
              active:scale-95 transition-all duration-300"
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
        </div>
      </div>
    </header>
  );
}

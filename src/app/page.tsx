/**
 * Main Page - Bakame.ai Chat Interface
 * Premium design with glassmorphism and smooth transitions
 */

'use client'
/* eslint-disable */;

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Header, ChatContainer, ChatInput, ThemeProvider, Sidebar, ErrorBoundary } from '@/components';
import VoiceAssistant from '@/components/VoiceAssistant';
import LocationPrompt from '@/components/LocationPrompt';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useLanguageStore } from '@/store/languageStore';

export default function Home() {
  const { loadFromStorage, sidebarOpen, sessions, activeSessionId } = useChatStore();
  const { user, isInitialized, isLoading } = useAuthStore();
  const { language } = useLanguageStore();
  const searchParams = useSearchParams();
  const [showVerifiedToast, setShowVerifiedToast] = useState(false);

  // Debug logging
  console.log('[HOME PAGE] Render - user:', user?.email || 'none', 'isInitialized:', isInitialized, 'isLoading:', isLoading);

  // Load saved sessions on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Check for verification success
  useEffect(() => {
    if (searchParams.get('verified') === 'true') {
      setShowVerifiedToast(true);
      // Remove the query param from URL
      window.history.replaceState({}, '', '/');
      // Auto-hide after 5 seconds
      setTimeout(() => setShowVerifiedToast(false), 5000);
    }
  }, [searchParams]);

  // Sidebar only shows for logged-in users
  const showSidebar = !!user;
  const mainPadding = showSidebar && sidebarOpen ? 'lg:pl-64' : 'lg:pl-0';

  // Check if guest has messages (to determine layout)
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const guestHasMessages = !user && (activeSession?.messages?.length || 0) > 0;

  return (
    <ThemeProvider>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100
        dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">

        {/* Verification Success Toast */}
        {showVerifiedToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
            <div className="flex items-center gap-3 px-6 py-4 rounded-2xl
              bg-green-500 text-white shadow-2xl shadow-green-500/30
              border border-green-400">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold">
                  {language === 'rw' ? 'Email yemejwe!' : 'Email verified!'}
                </p>
                <p className="text-sm text-green-100">
                  {language === 'rw' ? 'Konti yawe iteguye. Injira!' : 'Your account is ready. Sign in!'}
                </p>
              </div>
              <button
                onClick={() => setShowVerifiedToast(false)}
                className="ml-2 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-1">
          {/* Sidebar for chat sessions - only for logged-in users */}
          <Sidebar />

          {/* Main content area */}
          <main className={`flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300 ease-out ${mainPadding}`}>
            {/* Header with logo and theme toggle */}
            <Header />

            {/* Main chat container with error boundary */}
            <ErrorBoundary>
              <ChatContainer />
            </ErrorBoundary>

            {/* Chat input - only show fixed input for logged-in users OR guests who started chatting */}
            {(user || guestHasMessages) && <ChatInput />}
          </main>
        </div>

        {/* Voice Assistant Modal */}
        <VoiceAssistant />

        {/* Location Permission Prompt */}
        <LocationPrompt />

      </div>
    </ThemeProvider>
  );
}

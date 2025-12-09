/**
 * Main Page - Bakame.ai Chat Interface
 * Premium design with glassmorphism and smooth transitions
 */

'use client';

import { useEffect } from 'react';
import { Header, ChatContainer, ChatInput, ThemeProvider, Sidebar } from '@/components';
import { useChatStore } from '@/store/chatStore';

export default function Home() {
  const { loadFromStorage, sidebarOpen } = useChatStore();

  // Load saved sessions on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100
        dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">
        {/* Sidebar for chat sessions */}
        <Sidebar />

        {/* Main content area - shifts when sidebar is open on desktop */}
        <main className={`flex flex-col flex-1 min-w-0 min-h-screen transition-all duration-300 ease-out ${
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'
        }`}>
          {/* Header with logo and theme toggle */}
          <Header />

          {/* Main chat container */}
          <ChatContainer />

          {/* Chat input at bottom */}
          <ChatInput />
        </main>
      </div>
    </ThemeProvider>
  );
}

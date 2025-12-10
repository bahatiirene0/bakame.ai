/**
 * ChatContainer Component - Premium Design
 *
 * Features:
 * - Premium welcome screen with animations
 * - Gradient hover effects on suggestion chips
 * - Smooth scroll behavior
 * - Glassmorphism elements
 * - Guest landing page hero
 */

'use client';

import { useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/languageStore';
import ChatMessage from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

export default function ChatContainer() {
  // Use selective subscriptions - only subscribe to what we need
  const sessions = useChatStore((state) => state.sessions);
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const isLoading = useChatStore((state) => state.isLoading);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const { user } = useAuthStore();
  const t = useTranslation();

  // Memoize the active session's messages to prevent recalculation
  const messages = useMemo(() => {
    const activeSession = sessions.find(s => s.id === activeSessionId);
    return activeSession?.messages || [];
  }, [sessions, activeSessionId]);

  // Check if guest with no messages (show landing page)
  const showGuestLanding = !user && messages.length === 0;

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef(0);
  const userScrolledUpRef = useRef(false);

  // Check if user is near bottom of scroll container
  const isNearBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
  }, []);

  // Track user scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      userScrolledUpRef.current = !isNearBottom();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNearBottom]);

  // Scroll to bottom - only when message count changes or streaming starts
  useEffect(() => {
    const messageCount = messages.length;
    const shouldScroll = messageCount !== lastMessageCountRef.current || isLoading;

    if (shouldScroll && !userScrolledUpRef.current) {
      lastMessageCountRef.current = messageCount;
      messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'instant' : 'smooth' });
    } else if (messageCount !== lastMessageCountRef.current) {
      lastMessageCountRef.current = messageCount;
    }
  }, [messages.length, isLoading, isStreaming]);

  // Scroll during streaming - but only if user hasn't scrolled up
  useEffect(() => {
    if (isStreaming && !userScrolledUpRef.current) {
      const interval = setInterval(() => {
        if (!userScrolledUpRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
        }
      }, 150); // Reduced frequency from 100ms to 150ms
      return () => clearInterval(interval);
    }
  }, [isStreaming]);

  // Reset scroll-up flag when user sends a new message
  useEffect(() => {
    if (isLoading) {
      userScrolledUpRef.current = false;
    }
  }, [isLoading]);

  // ============================================
  // GUEST LANDING PAGE - Clean design with large input
  // ============================================
  if (showGuestLanding) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex flex-col items-center justify-center px-4
          bg-gradient-to-b from-white via-white to-gray-50/50
          dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]/50"
      >
        <div className="w-full max-w-2xl mx-auto text-center animate-fadeIn">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="relative group cursor-default">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
                flex items-center justify-center
                shadow-2xl shadow-green-500/30
                group-hover:shadow-green-500/50 group-hover:scale-105
                animate-float transition-all duration-500">
                <span className="text-4xl">🐰</span>
              </div>
              <div className="absolute inset-0 w-20 h-20 rounded-3xl
                bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
                blur-2xl opacity-40 -z-10 animate-pulse" />
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            {t.welcome}{' '}
            <span className="bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500
              bg-clip-text text-transparent">
              Bakame
            </span>
          </h1>

          <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
            {t.tagline}
          </p>

          {/* Large Input - full width of container */}
          <ChatInput />
        </div>
      </div>
    );
  }

  // ============================================
  // CHAT VIEW - Messages with scroll
  // ============================================
  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 pt-16 pb-32 scroll-smooth
        bg-gradient-to-b from-white via-white to-gray-50/50
        dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]/50"
    >
      <div className="max-w-2xl mx-auto space-y-5 py-4">
        {/* Welcome message when chat is empty (logged-in user) */}
        {messages.length === 0 && user && <WelcomeScreen />}

        {/* Chat messages */}
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {/* Typing indicator - show only when loading but not yet streaming */}
        {isLoading && !isStreaming && <TypingIndicator />}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} className="h-1" />
      </div>
    </div>
  );
}


/**
 * Welcome Screen Component - Premium Design
 * Shown when chat is empty for logged-in users
 */
const WelcomeScreen = memo(function WelcomeScreen() {
  const t = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fadeIn">
      {/* Animated Logo with Rabbit Emoji - Premium */}
      <div className="relative mb-8 group cursor-default">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
          flex items-center justify-center
          shadow-2xl shadow-green-500/30
          group-hover:shadow-green-500/50 group-hover:scale-105
          animate-float transition-all duration-500">
          <span className="text-4xl">🐰</span>
        </div>
        {/* Glow effect - more intense */}
        <div className="absolute inset-0 w-20 h-20 rounded-3xl
          bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
          blur-2xl opacity-40 -z-10 animate-pulse" />
        {/* Second glow layer */}
        <div className="absolute -inset-4 w-28 h-28 rounded-full
          bg-gradient-to-br from-green-500/20 via-transparent to-blue-500/20
          blur-3xl opacity-50 -z-20" />
      </div>

      <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 dark:text-white mb-3">
        {t.welcome}{' '}
        <span className="bg-gradient-to-r from-green-500 via-yellow-500 to-blue-500
          bg-clip-text text-transparent font-bold
          hover:from-green-400 hover:via-yellow-400 hover:to-blue-400
          transition-all duration-300 cursor-default">
          Bakame
        </span>
      </h2>

      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-10 text-sm">
        {t.tagline}
      </p>

      {/* Suggestion chips - grid layout */}
      <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 max-w-lg w-full px-2 sm:px-0">
        {[t.suggestion1, t.suggestion2, t.suggestion3, t.suggestion4, t.suggestion5, t.suggestion6].map((text, index) => (
          <SuggestionChip
            key={index}
            text={text}
            icon={suggestionIcons[index]}
            delay={index * 80}
          />
        ))}
      </div>
    </div>
  );
});

// Suggestion icons - texts come from translations
const suggestionIcons = ['🐰', '💻', '🏥', '💼', '📚', '✨'];

// Suggestion chip component - Premium Design
interface SuggestionChipProps {
  text: string;
  icon: string;
  delay: number;
}

const SuggestionChip = memo(function SuggestionChip({ text, icon, delay }: SuggestionChipProps) {
  const sendMessage = useChatStore((state) => state.sendMessage);
  const isLoading = useChatStore((state) => state.isLoading);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const disabled = isLoading || isStreaming;

  const handleClick = useCallback(() => {
    if (!disabled) {
      sendMessage(text);
    }
  }, [disabled, sendMessage, text]);

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className="group relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl
        bg-white/80 dark:bg-white/5 backdrop-blur-sm
        border border-gray-200/50 dark:border-white/10
        text-gray-600 dark:text-gray-300 text-xs
        hover:border-green-500/40 dark:hover:border-green-500/30
        hover:shadow-lg hover:shadow-green-500/10
        hover:scale-[1.02] active:scale-[0.98]
        transition-all duration-300 animate-fadeIn overflow-hidden
        disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Hover gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/0 to-blue-500/0
        group-hover:from-green-500/10 group-hover:via-green-500/5 group-hover:to-blue-500/10
        transition-all duration-300" />

      <span className="relative text-base group-hover:scale-110 transition-transform duration-200">
        {icon}
      </span>
      <span className="relative group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-200">
        {text}
      </span>
    </button>
  );
});

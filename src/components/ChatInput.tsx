/**
 * ChatInput Component - Premium Design
 *
 * Features:
 * - Glassmorphism input container
 * - Gradient hover effects on buttons
 * - Smooth micro-interactions
 * - Animated send button with glow
 * - Guest mode: Large centered input (not fixed)
 * - Logged-in mode: Fixed bottom input
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { useTranslation } from '@/store/languageStore';

interface ChatInputProps {
  isGuest?: boolean;
}

export default function ChatInput({ isGuest = false }: ChatInputProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, isStreaming, sidebarOpen, cancelRequest, sessions, activeSessionId, clearMessages } = useChatStore();
  const { user } = useAuthStore();
  const t = useTranslation();

  // Check if guest has messages (to switch to fixed mode)
  const activeSession = sessions.find(s => s.id === activeSessionId);
  const hasMessages = (activeSession?.messages?.length || 0) > 0;

  // Guest mode: Show large centered input until they start chatting
  const showGuestMode = !user && !hasMessages;

  // Determine if input should be disabled
  const isDisabled = isLoading || isStreaming;

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [input]);

  // Focus input when not loading
  useEffect(() => {
    if (!isDisabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isDisabled]);

  // Handle form submission
  const handleSubmit = async () => {
    if (!input.trim() || isDisabled) return;

    const message = input.trim();
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(message);
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // ============================================
  // GUEST MODE - Simple centered input with gradient glow
  // ============================================
  if (showGuestMode) {
    return (
      <div className="w-full">
        {/* Outer wrapper for gradient glow effect - thin border */}
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-r from-green-500 via-yellow-500 to-green-500
          shadow-lg shadow-green-500/20">
          {/* Inner input container */}
          <div className="relative flex items-end rounded-2xl bg-white dark:bg-[#0a0a0a]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={t.placeholder}
              disabled={isDisabled}
              rows={2}
              className="flex-1 px-4 py-4 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                resize-none outline-none focus:outline-none focus:ring-0 border-none text-base
                min-h-[60px] max-h-[200px] rounded-2xl"
            />

            {/* Send button */}
            <div className="p-2">
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="p-3 rounded-xl bg-green-600 hover:bg-green-700
                  text-white disabled:opacity-40 disabled:cursor-not-allowed
                  transition-colors duration-200"
                aria-label="Ohereza"
              >
                {isLoading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // FIXED BOTTOM INPUT - For logged-in users or guests with messages
  // ============================================
  return (
    <div className={`fixed bottom-0 right-0 z-30 transition-all duration-300 ease-out ${
      sidebarOpen && user ? 'left-0 lg:left-64' : 'left-0'
    }`}>
      {/* Gradient fade effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 dark:from-[#0a0a0a] dark:via-[#0a0a0a]/95 to-transparent pointer-events-none" />

      <div className="relative pt-4 pb-5 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Clear chat button - above input */}
          {hasMessages && !isStreaming && (
            <div className="flex justify-center mb-3">
              <button
                onClick={clearMessages}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs
                  text-gray-400 dark:text-gray-500
                  hover:text-red-500 dark:hover:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-500/10
                  transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{t.clearChat}</span>
              </button>
            </div>
          )}

          {/* Simple input container - matching guest style */}
          <div
            className={`relative flex items-end rounded-2xl
              bg-gray-100 dark:bg-[#1a1a1a]
              border ${isFocused
                ? 'border-gray-300 dark:border-white/20 shadow-lg shadow-gray-300/30 dark:shadow-black/30'
                : 'border-gray-200 dark:border-white/10 shadow-md shadow-gray-200/50 dark:shadow-black/20'
              }
              transition-all duration-200`}
          >
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                isStreaming
                  ? 'Tegereza...'
                  : t.placeholder
              }
              disabled={isDisabled}
              rows={1}
              className="flex-1 px-4 py-3 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-500 dark:placeholder-gray-400
                resize-none outline-none focus:outline-none focus:ring-0 border-none text-base
                max-h-[160px]"
            />

            {/* Send / Stop Button */}
            <div className="p-2">
              {isStreaming ? (
                <button
                  onClick={cancelRequest}
                  className="p-3 rounded-xl bg-red-600 hover:bg-red-700
                    text-white transition-colors duration-200"
                  aria-label="Stop"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <rect x="5" y="5" width="10" height="10" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="p-3 rounded-xl bg-green-600 hover:bg-green-700
                    text-white disabled:opacity-40 disabled:cursor-not-allowed
                    transition-colors duration-200"
                  aria-label="Ohereza"
                >
                  {isLoading ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

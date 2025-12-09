/**
 * ChatInput Component - Premium Design
 *
 * Features:
 * - Glassmorphism input container
 * - Gradient hover effects on buttons
 * - Smooth micro-interactions
 * - Animated send button with glow
 */

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useChatStore } from '@/store/chatStore';

export default function ChatInput() {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isLoading, isStreaming, sidebarOpen, cancelRequest } = useChatStore();

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

  return (
    <div className={`fixed bottom-0 right-0 z-30 transition-all duration-300 ease-out ${
      sidebarOpen ? 'left-0 lg:left-64' : 'left-0'
    }`}>
      {/* Gradient fade effect - premium */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 dark:from-[#0a0a0a] dark:via-[#0a0a0a]/95 to-transparent pointer-events-none" />

      <div className="relative pt-4 pb-5 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Input container - glassmorphism */}
          <div
            className={`group relative flex items-end rounded-2xl overflow-hidden
              transition-all duration-300 ease-out
              ${isDisabled
                ? 'bg-gray-50/80 dark:bg-white/5'
                : 'bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-xl'
              }
              border ${isFocused
                ? 'border-green-500/50 shadow-xl shadow-green-500/10'
                : 'border-gray-200/50 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20'
              }
              hover:border-green-500/30 dark:hover:border-green-500/20
              hover:shadow-xl hover:shadow-green-500/5`}
          >
            {/* Animated gradient border on focus */}
            {isFocused && (
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-green-500/10 via-blue-500/5 to-green-500/10 pointer-events-none" />
            )}

            {/* Textarea for multi-line input */}
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
                  : 'Andika ubutumwa...'
              }
              disabled={isDisabled}
              rows={1}
              className="relative flex-1 px-4 py-3 bg-transparent text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                resize-none focus:outline-none text-[14px]
                max-h-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Send / Stop Button */}
            <div className="p-2">
              {isStreaming ? (
                // Stop button during streaming - premium
                <button
                  onClick={cancelRequest}
                  className="group/btn p-2.5 rounded-xl
                    bg-gradient-to-r from-red-500 to-orange-500
                    text-white shadow-lg shadow-red-500/30
                    hover:shadow-xl hover:shadow-red-500/40
                    hover:scale-105 active:scale-95
                    transition-all duration-200"
                  aria-label="Stop"
                >
                  <svg
                    className="w-4 h-4 group-hover/btn:scale-110 transition-transform duration-200"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <rect x="5" y="5" width="10" height="10" rx="2" />
                  </svg>
                </button>
              ) : (
                // Send button - premium with glow
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || isLoading}
                  className="group/btn p-2.5 rounded-xl
                    bg-gradient-to-r from-green-500 to-blue-500
                    text-white shadow-lg shadow-green-500/30
                    disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none
                    disabled:from-gray-400 disabled:to-gray-500
                    hover:shadow-xl hover:shadow-green-500/40
                    hover:scale-105 active:scale-95
                    transition-all duration-200"
                  aria-label="Ohereza"
                >
                  {isLoading ? (
                    // Loading spinner
                    <svg
                      className="w-4 h-4 animate-spin"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    // Send arrow icon - with animation
                    <svg
                      className="w-4 h-4 group-hover/btn:translate-y-[-2px] group-hover/btn:scale-110
                        transition-all duration-200"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Helper text - refined */}
          <p className="text-[10px] text-center mt-2 text-gray-400 dark:text-gray-500">
            <span className="hidden sm:inline">
              <kbd className="px-1.5 py-0.5 rounded-md bg-gray-100/80 dark:bg-white/5
                border border-gray-200/50 dark:border-white/10
                text-gray-500 dark:text-gray-400 font-mono text-[9px]">Enter</kbd>
              <span className="mx-1 text-gray-300 dark:text-gray-600">kohereza</span>
              <kbd className="px-1.5 py-0.5 rounded-md bg-gray-100/80 dark:bg-white/5
                border border-gray-200/50 dark:border-white/10
                text-gray-500 dark:text-gray-400 font-mono text-[9px]">Shift+Enter</kbd>
              <span className="ml-1 text-gray-300 dark:text-gray-600">umurongo mushya</span>
            </span>
            <span className="sm:hidden text-gray-400 dark:text-gray-500">Kanda ohereza</span>
          </p>
        </div>
      </div>
    </div>
  );
}

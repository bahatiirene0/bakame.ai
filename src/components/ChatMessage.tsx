/**
 * ChatMessage Component - Premium Design
 *
 * Features:
 * - Premium gradient user bubbles with glow
 * - AI messages with avatar hover effects
 * - Smooth letter-by-letter streaming animation
 * - Glassmorphism effects
 */

'use client';

import { Message } from '@/types';
import MarkdownRenderer from './MarkdownRenderer';
import StreamingText from './StreamingText';

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isStreaming = message.isStreaming;

  if (isUser) {
    // User message - right aligned with premium gradient bubble
    return (
      <div className="flex w-full justify-end animate-fadeIn">
        <div className="group max-w-[85%] md:max-w-[75%] px-4 py-3 rounded-2xl rounded-br-md
          bg-gradient-to-r from-green-600 via-green-500 to-emerald-500
          text-white shadow-lg shadow-green-500/25
          hover:shadow-xl hover:shadow-green-500/30
          transition-all duration-300">
          <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  // AI message - left aligned with premium styling
  return (
    <div className="flex w-full justify-start animate-fadeIn">
      <div className="flex gap-3.5 max-w-full group">
        {/* Avatar with hover effect */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
            flex items-center justify-center
            shadow-lg shadow-green-500/20
            group-hover:shadow-green-500/40 group-hover:scale-105
            transition-all duration-300">
            <span className="text-sm">🐰</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pt-1">
          {message.content ? (
            isStreaming ? (
              // During streaming: smooth letter-by-letter animation
              <StreamingText content={message.content} speed={5} />
            ) : (
              // After streaming: render full markdown
              <MarkdownRenderer content={message.content} />
            )
          ) : (
            // Empty state with cursor
            <div className="streaming-text">
              <span className="streaming-cursor" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

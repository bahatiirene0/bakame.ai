/**
 * TypingIndicator Component - Premium Design
 *
 * Features:
 * - Glassmorphism bubble
 * - Premium gradient dots
 * - Smooth animations
 */

'use client';

interface TypingIndicatorProps {
  variant?: 'thinking' | 'typing';
}

export default function TypingIndicator({
  variant = 'thinking',
}: TypingIndicatorProps) {
  const text = variant === 'thinking' ? 'Bakame aratekereza' : 'Bakame arimo kwandika';

  return (
    <div className="flex justify-start animate-fadeIn">
      {/* Avatar with glow */}
      <div className="flex-shrink-0 mr-3.5">
        <div className="relative">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
            flex items-center justify-center
            shadow-lg shadow-green-500/30 animate-pulse">
            <span className="text-sm">🐰</span>
          </div>
          {/* Glow effect */}
          <div className="absolute inset-0 w-8 h-8 rounded-xl
            bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
            blur-md opacity-40 -z-10" />
        </div>
      </div>

      {/* Indicator bubble - glassmorphism */}
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm
        px-4 py-3 rounded-2xl rounded-bl-md
        border border-gray-200/50 dark:border-white/10
        shadow-lg shadow-black/5 dark:shadow-black/20">
        <div className="flex items-center gap-3">
          {/* Animated text */}
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {text}
          </span>

          {/* Animated dots with gradient */}
          <div className="flex gap-1.5 items-center">
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated dot component - Premium with gradient
 */
function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-blue-500
        shadow-sm shadow-green-500/50 animate-typingDot"
      style={{
        animationDelay: `${delay}ms`,
      }}
    />
  );
}

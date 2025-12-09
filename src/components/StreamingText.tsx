/**
 * StreamingText Component
 *
 * Smooth letter-by-letter animation for streaming text.
 * Takes chunks from API and animates them character by character.
 */

'use client';

import { useEffect, useState, useRef } from 'react';

interface StreamingTextProps {
  content: string;
  speed?: number; // ms per character (lower = faster)
}

export default function StreamingText({ content, speed = 10 }: StreamingTextProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [targetText, setTargetText] = useState('');
  const animationRef = useRef<number | null>(null);
  const lastContentRef = useRef('');

  // When content changes, update target
  useEffect(() => {
    // Only add new content (don't reset)
    if (content.length > lastContentRef.current.length) {
      setTargetText(content);
      lastContentRef.current = content;
    }
  }, [content]);

  // Animate towards target text - FAST
  useEffect(() => {
    if (displayedText.length < targetText.length) {
      animationRef.current = window.setTimeout(() => {
        // Add 5 characters per frame for faster animation
        const charsToAdd = Math.min(5, targetText.length - displayedText.length);
        setDisplayedText(targetText.slice(0, displayedText.length + charsToAdd));
      }, speed);

      return () => {
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [displayedText, targetText, speed]);

  // Catch up immediately if we fall too far behind
  useEffect(() => {
    const behindBy = targetText.length - displayedText.length;
    if (behindBy > 30) {
      // If more than 30 chars behind, catch up faster
      setDisplayedText(targetText.slice(0, displayedText.length + Math.floor(behindBy / 2)));
    }
  }, [targetText, displayedText]);

  return (
    <div className="streaming-text text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words text-[15px]">
      {displayedText}
      <span className="streaming-cursor" />
    </div>
  );
}

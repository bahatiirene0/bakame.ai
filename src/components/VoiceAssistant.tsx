/**
 * Voice Assistant Component - Hume EVI Integration
 *
 * Features:
 * - Full-screen modal with voice visualization
 * - Animated rings responding to audio levels
 * - Real-time transcript display
 * - Seamless Hume EVI integration
 */

'use client'
/* eslint-disable */;

import { useCallback, useEffect, useState, useRef } from 'react';
import { VoiceProvider, useVoice } from '@humeai/voice-react';
import { useVoiceStore } from '@/store/voiceStore';

// Get API credentials from environment
const HUME_API_KEY = process.env.NEXT_PUBLIC_HUME_API_KEY || '';
const HUME_CONFIG_ID = process.env.NEXT_PUBLIC_HUME_CONFIG_ID || '';

/**
 * Main Voice Assistant Modal
 */
export default function VoiceAssistant() {
  const { isVoiceModalOpen, closeVoiceModal } = useVoiceStore();

  if (!isVoiceModalOpen) return null;

  if (!HUME_API_KEY) {
    return (
      <VoiceModal onClose={closeVoiceModal}>
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-red-500 text-center p-6">
            <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-lg font-medium mb-2">Hume API Key Missing</p>
            <p className="text-sm text-gray-400">
              Add NEXT_PUBLIC_HUME_API_KEY to your environment variables
            </p>
          </div>
        </div>
      </VoiceModal>
    );
  }

  return (
    <VoiceProvider
      onMessage={(message) => {
        console.log('EVI message:', message);
      }}
    >
      <VoiceModal onClose={closeVoiceModal}>
        <VoiceInterface />
      </VoiceModal>
    </VoiceProvider>
  );
}

/**
 * Modal wrapper with backdrop and close functionality
 */
function VoiceModal({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-xl"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full h-full max-w-2xl max-h-[90vh] m-4
        bg-gradient-to-b from-[#0a0a0a] to-[#111111]
        rounded-3xl overflow-hidden
        border border-white/10
        shadow-2xl shadow-black/50
        animate-fadeIn">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl
            bg-white/5 hover:bg-white/10
            text-gray-400 hover:text-white
            transition-all duration-200"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {children}
      </div>
    </div>
  );
}

/**
 * Voice Interface - The actual voice interaction UI
 */
function VoiceInterface() {
  const {
    connect,
    disconnect,
    status,
    isMuted,
    isPlaying,
    messages,
    micFft,
    fft,
  } = useVoice();

  const { addVoiceMessage, voiceMessages } = useVoiceStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [lastTranscript, setLastTranscript] = useState<{
    text: string;
    role: 'user' | 'assistant';
  } | null>(null);

  // Track messages and update store
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.type === 'user_message' && lastMessage.message.content) {
        const content = lastMessage.message.content;
        setLastTranscript({ text: content, role: 'user' });
        // Only add if it's a new complete message
        if (content.length > 0) {
          addVoiceMessage('user', content);
        }
      } else if (lastMessage.type === 'assistant_message' && lastMessage.message.content) {
        const content = lastMessage.message.content;
        setLastTranscript({ text: content, role: 'assistant' });
        if (content.length > 0) {
          addVoiceMessage('assistant', content);
        }
      }
    }
  }, [messages, addVoiceMessage]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [voiceMessages]);

  // Handle connect/disconnect
  const handleClick = useCallback(async () => {
    if (status.value === 'connected') {
      disconnect();
    } else if (status.value === 'disconnected') {
      await connect({
        auth: { type: 'apiKey', value: HUME_API_KEY },
        ...(HUME_CONFIG_ID && { configId: HUME_CONFIG_ID }),
      });
    }
  }, [status.value, connect, disconnect]);

  // Calculate audio levels
  const getMicLevel = useCallback(() => {
    if (!micFft || micFft.length === 0) return 0;
    const sum = micFft.reduce((a, b) => a + b, 0);
    return Math.min(sum / micFft.length / 128, 1);
  }, [micFft]);

  const getSpeakerLevel = useCallback(() => {
    if (!fft || fft.length === 0) return 0;
    const sum = fft.reduce((a, b) => a + b, 0);
    return Math.min(sum / fft.length / 128, 1);
  }, [fft]);

  const micLevel = getMicLevel();
  const speakerLevel = getSpeakerLevel();
  const audioLevel = isPlaying ? speakerLevel : micLevel;

  // Scale factors for animated rings
  const outerScale = 1 + audioLevel * 0.5;
  const middleScale = 1 + audioLevel * 0.7;
  const innerScale = 1 + audioLevel * 0.9;

  // Generate audio bar heights
  const getBarHeights = () => {
    const bars = 7;
    const heights: number[] = [];
    for (let i = 0; i < bars; i++) {
      if (status.value !== 'connected') {
        heights.push(4);
      } else if (isPlaying && fft && fft.length > 0) {
        const idx = Math.floor((i / bars) * fft.length);
        heights.push(4 + (fft[idx] / 255) * 28);
      } else if (!isPlaying && micFft && micFft.length > 0) {
        const idx = Math.floor((i / bars) * micFft.length);
        heights.push(4 + (micFft[idx] / 255) * 28);
      } else {
        heights.push(4);
      }
    }
    return heights;
  };

  const barHeights = getBarHeights();

  const getStatusText = () => {
    switch (status.value) {
      case 'connecting':
        return 'Guhuza...';
      case 'connected':
        return isPlaying ? 'Bakame arimo avuga...' : isMuted ? 'Mikoro ifunze' : 'Ndateze amatwi...';
      case 'disconnected':
        return 'Kanda utangire';
      case 'error':
        return 'Habaye ikibazo - Ongera ugerageze';
      default:
        return '';
    }
  };

  // Dynamic colors based on state
  const getGradientColors = () => {
    if (status.value === 'connected') {
      if (isPlaying) {
        // AI speaking - Yellow/Orange (Rwanda colors)
        return {
          outer: 'from-yellow-500/30 to-yellow-500/0',
          middle: 'from-yellow-400/40 to-yellow-400/0',
          inner: 'from-yellow-300/50 to-yellow-300/0',
          core: 'from-yellow-500 via-yellow-400 to-yellow-300',
          glow: 'shadow-yellow-500/40',
        };
      }
      // Listening - Green (Rwanda colors)
      return {
        outer: 'from-green-500/30 to-green-500/0',
        middle: 'from-green-400/40 to-green-400/0',
        inner: 'from-green-300/50 to-green-300/0',
        core: 'from-green-500 via-green-400 to-green-300',
        glow: 'shadow-green-500/40',
      };
    }
    // Disconnected - Blue (Rwanda colors)
    return {
      outer: 'from-blue-500/30 to-blue-500/0',
      middle: 'from-blue-400/40 to-blue-400/0',
      inner: 'from-blue-300/50 to-blue-300/0',
      core: 'from-blue-500 via-blue-400 to-blue-300',
      glow: 'shadow-blue-500/40',
    };
  };

  const colors = getGradientColors();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-center pt-6 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐰</span>
          <span className="text-lg font-semibold text-white">Bakame Voice</span>
        </div>
      </div>

      {/* Voice Visualizer */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="relative flex items-center justify-center w-64 h-64">
          {/* Animated outer rings */}
          <div
            className={`absolute w-56 h-56 rounded-full bg-gradient-radial ${colors.outer}
              transition-transform duration-100 ease-out`}
            style={{ transform: `scale(${outerScale})` }}
          />
          <div
            className={`absolute w-40 h-40 rounded-full bg-gradient-radial ${colors.middle}
              transition-transform duration-100 ease-out`}
            style={{ transform: `scale(${middleScale})` }}
          />
          <div
            className={`absolute w-28 h-28 rounded-full bg-gradient-radial ${colors.inner}
              transition-transform duration-100 ease-out`}
            style={{ transform: `scale(${innerScale})` }}
          />

          {/* Core button */}
          <button
            onClick={handleClick}
            disabled={status.value === 'connecting'}
            className={`relative z-10 w-20 h-20 rounded-full
              bg-gradient-to-br ${colors.core}
              shadow-xl ${colors.glow}
              flex items-center justify-center
              transition-all duration-300 hover:scale-105
              disabled:opacity-50 disabled:cursor-wait
              ${status.value === 'connecting' ? 'animate-pulse' : ''}`}
          >
            {status.value === 'connected' ? (
              // Audio bars when connected
              <div className="flex items-center justify-center gap-[3px] h-8">
                {barHeights.map((height, i) => (
                  <div
                    key={i}
                    className="w-1 bg-white rounded-full transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                ))}
              </div>
            ) : (
              // Microphone icon when disconnected
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
        </div>

        {/* Status text */}
        <p className="mt-6 text-sm text-gray-400 uppercase tracking-wider">
          {getStatusText()}
        </p>

        {/* Instruction text */}
        <p className="mt-2 text-xs text-gray-500 text-center max-w-xs">
          {status.value === 'disconnected'
            ? 'Kanda kugira ngo utangire ikiganiro na Bakame'
            : status.value === 'connected'
            ? 'Vuga neza - Bakame azakumva akakwishura'
            : ''}
        </p>
      </div>

      {/* Transcript area */}
      <div className="h-32 border-t border-white/10 overflow-y-auto">
        <div className="p-4 space-y-2">
          {voiceMessages.slice(-5).map((msg) => (
            <div
              key={msg.id}
              className={`text-sm px-3 py-2 rounded-xl max-w-[90%]
                ${msg.role === 'user'
                  ? 'ml-auto bg-green-500/20 text-green-200 border-l-2 border-green-500'
                  : 'mr-auto bg-white/5 text-gray-300 border-l-2 border-blue-500'
                }`}
            >
              {msg.content}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Current transcript (live) */}
        {lastTranscript && status.value === 'connected' && (
          <div className="px-4 pb-4">
            <div
              className={`text-sm px-3 py-2 rounded-xl
                ${lastTranscript.role === 'user'
                  ? 'bg-green-500/10 text-green-300 border-l-2 border-green-400'
                  : 'bg-yellow-500/10 text-yellow-300 border-l-2 border-yellow-400'
                }`}
            >
              {lastTranscript.text}
              <span className="inline-block w-1.5 h-4 ml-1 bg-current animate-pulse rounded" />
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {status.value === 'error' && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center">
            <p className="text-red-300 text-sm">
              Habaye ikibazo. Reba uruhushya rwakho hanyuma ugerageze.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

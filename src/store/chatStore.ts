/**
 * Zustand Store for Multi-Chat Session Management
 *
 * This store handles:
 * - Multiple chat sessions with localStorage persistence
 * - Session creation, deletion, and renaming
 * - Streaming responses from OpenAI
 * - Active session switching
 *
 * ARCHITECTURE:
 * - Sessions are stored in an array with unique IDs
 * - Active session ID determines which chat is displayed
 * - All message operations work on the active session
 * - Changes are automatically saved to localStorage
 *
 * HOW TO ADD NEW SESSIONS:
 * 1. Call createSession() - creates new session and sets it active
 * 2. New session gets default title "Ikiganiro gishya" (New chat)
 * 3. Title auto-updates based on first user message
 */

import { create } from 'zustand';
import {
  ChatStore,
  ChatSession,
  ChatSessionSerialized,
  Message,
  MessageRole,
  AgentType,
  StreamChunk,
} from '@/types';

// Storage key for localStorage
const STORAGE_KEY = 'bakame-chat-sessions';

// AbortController for request cancellation
let currentAbortController: AbortController | null = null;

// For request cancellation only
// Note: We removed throttling as it was causing streaming to not show

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new empty session
const createNewSession = (title?: string): ChatSession => ({
  id: generateId(),
  title: title || 'Ikiganiro gishya', // "New chat" in Kinyarwanda
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

// Serialize sessions for localStorage
const serializeSessions = (sessions: ChatSession[]): ChatSessionSerialized[] => {
  return sessions.map((session) => ({
    ...session,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
    messages: session.messages.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp.toISOString(),
    })),
  }));
};

// Deserialize sessions from localStorage
const deserializeSessions = (data: ChatSessionSerialized[]): ChatSession[] => {
  return data.map((session) => ({
    ...session,
    createdAt: new Date(session.createdAt),
    updatedAt: new Date(session.updatedAt),
    messages: session.messages.map((msg) => ({
      ...msg,
      timestamp: new Date(msg.timestamp),
    })),
  }));
};

// Auto-generate title from first user message
const generateTitleFromMessage = (content: string): string => {
  // Take first 30 characters, add ellipsis if longer
  const trimmed = content.trim().substring(0, 30);
  return trimmed.length < content.trim().length ? `${trimmed}...` : trimmed;
};

export const useChatStore = create<ChatStore>((set, get) => ({
  // ============================================
  // INITIAL STATE
  // ============================================
  sessions: [],
  activeSessionId: null,
  isLoading: false,
  isStreaming: false,
  streamingMessageId: null,
  error: null,
  currentAgent: 'default',
  sidebarOpen: true,

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new chat session
   * @param title - Optional custom title
   * @returns The new session ID
   */
  createSession: (title?: string): string => {
    const newSession = createNewSession(title);

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: newSession.id,
      error: null,
    }));

    // Save to localStorage
    get().saveToStorage();

    return newSession.id;
  },

  /**
   * Delete a chat session
   * @param sessionId - ID of session to delete
   */
  deleteSession: (sessionId: string) => {
    const { sessions, activeSessionId, createSession } = get();

    // Filter out the deleted session
    const remainingSessions = sessions.filter((s) => s.id !== sessionId);

    // If we deleted the active session, switch to another or create new
    let newActiveId = activeSessionId;
    if (activeSessionId === sessionId) {
      if (remainingSessions.length > 0) {
        newActiveId = remainingSessions[0].id;
      } else {
        // No sessions left, create a new one
        const newSession = createNewSession();
        remainingSessions.push(newSession);
        newActiveId = newSession.id;
      }
    }

    set({
      sessions: remainingSessions,
      activeSessionId: newActiveId,
    });

    get().saveToStorage();
  },

  /**
   * Rename a chat session
   * @param sessionId - ID of session to rename
   * @param newTitle - New title for the session
   */
  renameSession: (sessionId: string, newTitle: string) => {
    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, title: newTitle, updatedAt: new Date() }
          : session
      ),
    }));

    get().saveToStorage();
  },

  /**
   * Set the active chat session
   * @param sessionId - ID of session to activate
   */
  setActiveSession: (sessionId: string) => {
    set({
      activeSessionId: sessionId,
      error: null,
      isStreaming: false,
      streamingMessageId: null,
    });
  },

  // ============================================
  // MESSAGE MANAGEMENT
  // ============================================

  /**
   * Add a message to the active session
   */
  addMessage: (role: MessageRole, content: string, isStreaming = false): string => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return '';

    const messageId = generateId();
    const newMessage: Message = {
      id: messageId,
      role,
      content,
      timestamp: new Date(),
      isStreaming,
    };

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== activeSessionId) return session;

        // Auto-generate title from first user message
        let newTitle = session.title;
        if (
          role === 'user' &&
          session.messages.length === 0 &&
          session.title === 'Ikiganiro gishya'
        ) {
          newTitle = generateTitleFromMessage(content);
        }

        return {
          ...session,
          title: newTitle,
          messages: [...session.messages, newMessage],
          updatedAt: new Date(),
        };
      }),
    }));

    get().saveToStorage();
    return messageId;
  },

  /**
   * Update a message's content
   */
  updateMessage: (id: string, content: string) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== activeSessionId) return session;
        return {
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, content } : msg
          ),
          updatedAt: new Date(),
        };
      }),
    }));
  },

  /**
   * Append content to a streaming message
   */
  appendToMessage: (id: string, chunk: string) => {
    const { activeSessionId, sessions } = get();
    if (!activeSessionId) return;

    // Find the session and message directly
    const session = sessions.find(s => s.id === activeSessionId);
    if (!session) return;

    const message = session.messages.find(m => m.id === id);
    if (!message) return;

    // Direct mutation + trigger re-render
    message.content += chunk;
    set({ sessions: [...sessions] });
  },

  /**
   * Force a re-render (call at end of streaming)
   */
  flushStreamBuffer: (_id: string) => {
    const { sessions } = get();
    set({ sessions: [...sessions] });
  },

  /**
   * Mark a message as finalized (streaming complete)
   */
  finalizeMessage: (id: string) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== activeSessionId) return session;
        return {
          ...session,
          messages: session.messages.map((msg) =>
            msg.id === id ? { ...msg, isStreaming: false } : msg
          ),
          updatedAt: new Date(),
        };
      }),
    }));

    get().saveToStorage();
  },

  /**
   * Clear all messages in the active session
   */
  clearMessages: () => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === activeSessionId
          ? {
              ...session,
              messages: [],
              title: 'Ikiganiro gishya',
              updatedAt: new Date(),
            }
          : session
      ),
    }));

    get().saveToStorage();
  },

  // ============================================
  // STATE SETTERS
  // ============================================

  setLoading: (loading: boolean) => set({ isLoading: loading }),

  setStreaming: (streaming: boolean, messageId: string | null = null) =>
    set({ isStreaming: streaming, streamingMessageId: messageId }),

  setError: (error: string | null) => set({ error }),

  setAgent: (agent: AgentType) => set({ currentAgent: agent }),

  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  // ============================================
  // SEND MESSAGE WITH STREAMING
  // ============================================

  sendMessage: async (content: string) => {
    const {
      activeSessionId,
      sessions,
      addMessage,
      appendToMessage,
      finalizeMessage,
      setLoading,
      setStreaming,
      setError,
      currentAgent,
      createSession,
      isStreaming,
    } = get();

    // Prevent stacking: cancel previous request if still running
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }

    // Don't send if already streaming (additional safeguard)
    if (isStreaming) {
      console.warn('Already streaming, ignoring new request');
      return;
    }

    // Create a session if none exists
    let sessionId = activeSessionId;
    if (!sessionId || sessions.length === 0) {
      sessionId = createSession();
    }

    // Add user message
    addMessage('user', content);
    setLoading(true);
    setError(null);

    // Create placeholder for assistant response
    const assistantMessageId = addMessage('assistant', '', true);
    setStreaming(true, assistantMessageId);

    // Create new AbortController for this request
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    try {
      // Get current session's messages for context (exclude streaming message)
      const currentSession = get().sessions.find((s) => s.id === get().activeSessionId);
      const apiMessages = currentSession?.messages
        .filter((m) => !m.isStreaming && m.id !== assistantMessageId)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) || [];

      // Call streaming API endpoint with abort signal
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          agent: currentAgent,
        }),
        signal,
      });

      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get response');
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      // Process the stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        // Check if aborted
        if (signal.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed: StreamChunk = JSON.parse(data);
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) {
                appendToMessage(assistantMessageId, parsed.content);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      if (!signal.aborted) {
        // Flush any remaining buffered content
        get().flushStreamBuffer(assistantMessageId);
        finalizeMessage(assistantMessageId);
      }
    } catch (error) {
      // Ignore abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);

      const { updateMessage } = get();
      updateMessage(assistantMessageId, `Hari ikibazo cyabaye: ${errorMessage}`);
      finalizeMessage(assistantMessageId);
    } finally {
      currentAbortController = null;
      setLoading(false);
      setStreaming(false, null);
    }
  },

  /**
   * Cancel the current streaming request
   */
  cancelRequest: () => {
    if (currentAbortController) {
      currentAbortController.abort();
      currentAbortController = null;
    }
    set({
      isLoading: false,
      isStreaming: false,
      streamingMessageId: null,
    });
  },

  // ============================================
  // PERSISTENCE (localStorage)
  // ============================================

  /**
   * Load sessions from localStorage
   */
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        const sessions = deserializeSessions(data.sessions || []);

        if (sessions.length > 0) {
          set({
            sessions,
            activeSessionId: data.activeSessionId || sessions[0].id,
          });
        } else {
          // No sessions, create initial one
          const newSession = createNewSession();
          set({
            sessions: [newSession],
            activeSessionId: newSession.id,
          });
        }
      } else {
        // No stored data, create initial session
        const newSession = createNewSession();
        set({
          sessions: [newSession],
          activeSessionId: newSession.id,
        });
      }
    } catch (error) {
      console.error('Failed to load sessions from storage:', error);
      // Create fresh session on error
      const newSession = createNewSession();
      set({
        sessions: [newSession],
        activeSessionId: newSession.id,
      });
    }
  },

  /**
   * Save sessions to localStorage
   */
  saveToStorage: () => {
    if (typeof window === 'undefined') return;

    try {
      const { sessions, activeSessionId } = get();
      const data = {
        sessions: serializeSessions(sessions),
        activeSessionId,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save sessions to storage:', error);
    }
  },
}));

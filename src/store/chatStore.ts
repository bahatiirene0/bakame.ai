/**
 * Zustand Store for Multi-Chat Session Management
 *
 * This store handles:
 * - Multiple chat sessions with Supabase sync (logged-in users)
 * - localStorage fallback for guest users
 * - Session creation, deletion, and renaming
 * - Streaming responses from OpenAI
 * - Active session switching
 *
 * ARCHITECTURE:
 * - Logged in: Sessions sync to Supabase database
 * - Guest: Sessions stored in localStorage (browser cache)
 * - On login: Load user's chat history from database
 * - On logout: Clear memory, keep guest sessions in localStorage
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
import { getSupabaseClient } from '@/lib/supabase';
import type {
  ChatSession as DbChatSession,
  Message as DbMessage
} from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

// Guest users: No persistence, single session only
// Logged-in users: Full persistence with Supabase

// AbortController for request cancellation
let currentAbortController: AbortController | null = null;

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Create a new empty session
const createNewSession = (title?: string, agentId?: string): ChatSession => ({
  id: generateId(),
  title: title || 'Ikiganiro gishya', // "New chat" in Kinyarwanda
  messages: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  agentId: agentId || 'default',
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
  const trimmed = content.trim().substring(0, 30);
  return trimmed.length < content.trim().length ? `${trimmed}...` : trimmed;
};

// Extended ChatStore with user support
interface ExtendedChatStore extends ChatStore {
  currentUser: User | null;
  isDbSyncing: boolean;
  setCurrentUser: (user: User | null) => void;
  loadUserSessions: (userId: string) => Promise<void>;
  syncSessionToDb: (session: ChatSession) => Promise<void>;
  syncMessageToDb: (sessionId: string, message: Message) => Promise<void>;
  deleteSessionFromDb: (sessionId: string) => Promise<void>;
}

export const useChatStore = create<ExtendedChatStore>((set, get) => ({
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
  currentUser: null,
  isDbSyncing: false,

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Set the current user (called by AuthProvider)
   */
  setCurrentUser: (user: User | null) => {
    const previousUser = get().currentUser;
    set({ currentUser: user });

    if (user && !previousUser) {
      // User just logged in - load their sessions from database
      get().loadUserSessions(user.id);
    } else if (!user && previousUser) {
      // User logged out - clear sessions and load guest sessions
      set({ sessions: [], activeSessionId: null });
      get().loadFromStorage();
    }
  },

  /**
   * Load user's chat sessions from Supabase
   */
  loadUserSessions: async (userId: string) => {
    const supabase = getSupabaseClient();
    set({ isDbSyncing: true });

    try {
      // Fetch user's chat sessions
      const { data: rawSessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .eq('is_archived', false)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;

      const dbSessions = rawSessions as DbChatSession[] | null;

      if (!dbSessions || dbSessions.length === 0) {
        // No sessions, create initial one
        const newSession = createNewSession();
        set({
          sessions: [newSession],
          activeSessionId: newSession.id,
          isDbSyncing: false,
        });
        // Save to database
        get().syncSessionToDb(newSession);
        return;
      }

      // Fetch messages for all sessions
      const sessionIds = dbSessions.map(s => s.id);
      const { data: rawMessages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .in('session_id', sessionIds)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      const dbMessages = rawMessages as DbMessage[] | null;

      // Group messages by session
      const messagesBySession: Record<string, Message[]> = {};
      (dbMessages || []).forEach(msg => {
        if (!messagesBySession[msg.session_id]) {
          messagesBySession[msg.session_id] = [];
        }
        messagesBySession[msg.session_id].push({
          id: msg.id,
          role: msg.role as MessageRole,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          isStreaming: false,
        });
      });

      // Convert to ChatSession format
      const sessions: ChatSession[] = dbSessions.map(dbSession => ({
        id: dbSession.id,
        title: dbSession.title,
        messages: messagesBySession[dbSession.id] || [],
        createdAt: new Date(dbSession.created_at),
        updatedAt: new Date(dbSession.updated_at),
        agentId: (dbSession as any).agent_slug || 'default',
      }));

      set({
        sessions,
        activeSessionId: sessions[0]?.id || null,
        isDbSyncing: false,
      });
    } catch (error) {
      console.error('Failed to load user sessions:', error);
      set({ isDbSyncing: false });
      // Fallback to empty state
      const newSession = createNewSession();
      set({
        sessions: [newSession],
        activeSessionId: newSession.id,
      });
    }
  },

  /**
   * Sync a session to Supabase database
   */
  syncSessionToDb: async (session: ChatSession) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const supabase = getSupabaseClient();

    try {
      await supabase
        .from('chat_sessions')
        .upsert({
          id: session.id,
          user_id: currentUser.id,
          title: session.title,
          agent_slug: session.agentId || 'default',
          updated_at: new Date().toISOString(),
        } as never);
    } catch (error) {
      console.error('Failed to sync session to database:', error);
    }
  },

  /**
   * Sync a message to Supabase database
   */
  syncMessageToDb: async (sessionId: string, message: Message) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const supabase = getSupabaseClient();

    try {
      await supabase
        .from('messages')
        .upsert({
          id: message.id,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          created_at: message.timestamp.toISOString(),
        } as never);

      // Update session's updated_at
      await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() } as never)
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to sync message to database:', error);
    }
  },

  /**
   * Delete a session from Supabase database
   */
  deleteSessionFromDb: async (sessionId: string) => {
    const { currentUser } = get();
    if (!currentUser) return;

    const supabase = getSupabaseClient();

    try {
      // Archive instead of delete (soft delete)
      await supabase
        .from('chat_sessions')
        .update({ is_archived: true } as never)
        .eq('id', sessionId);
    } catch (error) {
      console.error('Failed to delete session from database:', error);
    }
  },

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new chat session
   * - Logged-in users: Can create multiple sessions
   * - Guests: Limited to single session (clears existing)
   */
  createSession: (title?: string, agentId?: string): string => {
    const { currentUser, syncSessionToDb, sessions } = get();
    const newSession = createNewSession(title, agentId);

    if (currentUser) {
      // Logged-in users can have multiple sessions
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: newSession.id,
        error: null,
        currentAgent: (agentId || 'default') as AgentType,
      }));
      syncSessionToDb(newSession);
    } else {
      // Guests: Replace with single fresh session (no multiple chats)
      set({
        sessions: [newSession],
        activeSessionId: newSession.id,
        error: null,
        currentAgent: (agentId || 'default') as AgentType,
      });
    }

    return newSession.id;
  },

  /**
   * Delete a chat session
   */
  deleteSession: (sessionId: string) => {
    const { sessions, activeSessionId, currentUser, deleteSessionFromDb } = get();

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
        if (currentUser) {
          get().syncSessionToDb(newSession);
        }
      }
    }

    set({
      sessions: remainingSessions,
      activeSessionId: newActiveId,
    });

    // Delete from appropriate storage
    if (currentUser) {
      deleteSessionFromDb(sessionId);
    } else {
      get().saveToStorage();
    }
  },

  /**
   * Clear all chat sessions
   */
  clearAllSessions: () => {
    const { sessions, currentUser, deleteSessionFromDb } = get();

    // Delete all sessions from database if logged in
    if (currentUser) {
      sessions.forEach(session => {
        deleteSessionFromDb(session.id);
      });
    }

    // Create a fresh empty session
    const newSession = createNewSession();

    set({
      sessions: [newSession],
      activeSessionId: newSession.id,
    });

    // Sync new session to db if logged in, otherwise save to localStorage
    if (currentUser) {
      get().syncSessionToDb(newSession);
    } else {
      get().saveToStorage();
    }
  },

  /**
   * Rename a chat session
   */
  renameSession: (sessionId: string, newTitle: string) => {
    const { currentUser } = get();

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, title: newTitle, updatedAt: new Date() }
          : session
      ),
    }));

    // Save to appropriate storage
    if (currentUser) {
      const session = get().sessions.find(s => s.id === sessionId);
      if (session) get().syncSessionToDb(session);
    } else {
      get().saveToStorage();
    }
  },

  /**
   * Set the active chat session
   */
  setActiveSession: (sessionId: string) => {
    const { sessions } = get();
    const session = sessions.find(s => s.id === sessionId);
    set({
      activeSessionId: sessionId,
      error: null,
      isStreaming: false,
      streamingMessageId: null,
      currentAgent: (session?.agentId || 'default') as AgentType,
    });
  },

  // ============================================
  // MESSAGE MANAGEMENT
  // ============================================

  /**
   * Add a message to the active session
   */
  addMessage: (role: MessageRole, content: string, isStreaming = false): string => {
    const { activeSessionId, currentUser, syncMessageToDb, syncSessionToDb } = get();
    if (!activeSessionId) return '';

    const messageId = generateId();
    const newMessage: Message = {
      id: messageId,
      role,
      content,
      timestamp: new Date(),
      isStreaming,
    };

    // Track if title was updated
    let titleUpdated = false;
    let newTitle = '';

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== activeSessionId) return session;

        // Auto-generate title from first user message
        let sessionTitle = session.title;
        if (
          role === 'user' &&
          session.messages.length === 0 &&
          session.title === 'Ikiganiro gishya'
        ) {
          sessionTitle = generateTitleFromMessage(content);
          titleUpdated = true;
          newTitle = sessionTitle;
        }

        return {
          ...session,
          title: sessionTitle,
          messages: [...session.messages, newMessage],
          updatedAt: new Date(),
        };
      }),
    }));

    // Sync to appropriate storage
    if (currentUser) {
      // Don't sync streaming messages until finalized
      if (!isStreaming) {
        syncMessageToDb(activeSessionId, newMessage);
      }
      // Sync session if title was updated
      if (titleUpdated) {
        const session = get().sessions.find(s => s.id === activeSessionId);
        if (session) syncSessionToDb(session);
      }
    } else {
      get().saveToStorage();
    }

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
    const { activeSessionId, currentUser, syncMessageToDb } = get();
    if (!activeSessionId) return;

    let finalizedMessage: Message | null = null;

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id !== activeSessionId) return session;
        return {
          ...session,
          messages: session.messages.map((msg) => {
            if (msg.id === id) {
              finalizedMessage = { ...msg, isStreaming: false };
              return finalizedMessage;
            }
            return msg;
          }),
          updatedAt: new Date(),
        };
      }),
    }));

    // Now sync to database for logged-in users
    if (currentUser && finalizedMessage) {
      syncMessageToDb(activeSessionId, finalizedMessage);
    } else {
      get().saveToStorage();
    }
  },

  /**
   * Clear all messages in the active session
   */
  clearMessages: () => {
    const { activeSessionId, currentUser, syncSessionToDb } = get();
    if (!activeSessionId) return;

    let clearedSession: ChatSession | null = null;

    set((state) => ({
      sessions: state.sessions.map((session) => {
        if (session.id === activeSessionId) {
          clearedSession = {
            ...session,
            messages: [],
            title: 'Ikiganiro gishya',
            updatedAt: new Date(),
          };
          return clearedSession;
        }
        return session;
      }),
    }));

    if (currentUser && clearedSession) {
      syncSessionToDb(clearedSession);
      // Note: Messages remain in DB but session shows as empty
      // Could add a deleteMessagesForSession if needed
    } else {
      get().saveToStorage();
    }
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

    // Don't send if already streaming
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
      // Get current session's messages for context
      const currentSession = get().sessions.find((s) => s.id === get().activeSessionId);
      const apiMessages = currentSession?.messages
        .filter((m) => !m.isStreaming && m.id !== assistantMessageId)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) || [];

      // Call streaming API endpoint
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
        get().flushStreamBuffer(assistantMessageId);
        finalizeMessage(assistantMessageId);
      }
    } catch (error) {
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
  // GUEST PERSISTENCE (localStorage)
  // ============================================

  /**
   * Initialize guest session (no persistence - fresh start each visit)
   */
  loadFromStorage: () => {
    if (typeof window === 'undefined') return;

    // Don't initialize guest session if user is logged in
    const { currentUser } = get();
    if (currentUser) return;

    // Clean up any old localStorage data from previous versions
    try {
      localStorage.removeItem('bakame-guest-sessions');
      localStorage.removeItem('bakame-sessions');
    } catch {
      // Ignore storage errors
    }

    // Guest users get a single fresh session (no persistence)
    const newSession = createNewSession();
    set({
      sessions: [newSession],
      activeSessionId: newSession.id,
    });
  },

  /**
   * Save sessions - only for logged-in users (guests don't persist)
   */
  saveToStorage: () => {
    // Guests don't persist - do nothing
    // Logged-in users sync to Supabase (handled separately)
  },
}));

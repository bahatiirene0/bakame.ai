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
import { useUserSettingsStore } from '@/store/userSettingsStore';
import type {
  ChatSession as DbChatSession,
  Message as DbMessage
} from '@/lib/supabase/types';
import type { User } from '@supabase/supabase-js';

// Guest users: No persistence, single session only
// Logged-in users: Full persistence with Supabase

// ============================================
// CROSS-TAB SYNCHRONIZATION
// ============================================
// BroadcastChannel for syncing state across browser tabs
// This is wrapped in a safe module that won't break if BroadcastChannel is unavailable

type CrossTabMessage =
  | { type: 'SESSION_CREATED'; session: ChatSession }
  | { type: 'SESSION_DELETED'; sessionId: string }
  | { type: 'SESSION_RENAMED'; sessionId: string; title: string }
  | { type: 'ACTIVE_SESSION_CHANGED'; sessionId: string | null }
  | { type: 'REQUEST_SYNC' };

let crossTabChannel: BroadcastChannel | null = null;
let isProcessingCrossTabMessage = false; // Prevent infinite loops

// Initialize cross-tab channel (safe - won't break if unavailable)
const initCrossTabSync = (onMessage: (msg: CrossTabMessage) => void): void => {
  if (typeof window === 'undefined') return;
  if (typeof BroadcastChannel === 'undefined') {
    console.log('[CROSS-TAB] BroadcastChannel not supported');
    return;
  }

  try {
    // Close existing channel if any
    if (crossTabChannel) {
      crossTabChannel.close();
    }

    crossTabChannel = new BroadcastChannel('bakame-chat-sync');
    crossTabChannel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
      // Prevent processing our own messages or recursive updates
      if (isProcessingCrossTabMessage) return;

      try {
        isProcessingCrossTabMessage = true;
        console.log('[CROSS-TAB] Received:', event.data.type);
        onMessage(event.data);
      } finally {
        isProcessingCrossTabMessage = false;
      }
    };

    console.log('[CROSS-TAB] Channel initialized');
  } catch (error) {
    console.warn('[CROSS-TAB] Failed to initialize:', error);
    crossTabChannel = null;
  }
};

// Broadcast message to other tabs (safe - silent fail)
const broadcastToOtherTabs = (message: CrossTabMessage): void => {
  if (!crossTabChannel || isProcessingCrossTabMessage) return;

  try {
    crossTabChannel.postMessage(message);
    console.log('[CROSS-TAB] Broadcast:', message.type);
  } catch (error) {
    console.warn('[CROSS-TAB] Failed to broadcast:', error);
  }
};

// AbortController for request cancellation
let currentAbortController: AbortController | null = null;

// Helper to safely abort any ongoing stream
const abortCurrentStream = (): boolean => {
  if (currentAbortController) {
    console.log('[CHAT STORE] Aborting current stream');
    currentAbortController.abort();
    currentAbortController = null;
    return true;
  }
  return false;
};

// Helper for retrying database operations with exponential backoff
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // Don't retry on auth errors or client errors (4xx)
      if (lastError.message.includes('JWT') ||
          lastError.message.includes('401') ||
          lastError.message.includes('403') ||
          lastError.message.includes('404')) {
        throw lastError;
      }
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[CHAT STORE] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
};

// Generate UUID v4 (compatible with Supabase)
const generateUUID = (): string => {
  // Use crypto.randomUUID if available (modern browsers/Node 19+)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback to manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Create a new empty session
const createNewSession = (title?: string, agentId?: string): ChatSession => ({
  id: generateUUID(),
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
  isDeleting: string | null; // Track which session is being deleted
  setCurrentUser: (user: User | null) => void;
  loadUserSessions: (userId: string) => Promise<void>;
  syncSessionToDb: (session: ChatSession) => Promise<void>;
  syncMessageToDb: (sessionId: string, message: Message) => Promise<void>;
  deleteSessionFromDb: (sessionId: string) => Promise<void>;
  // UX helpers
  canCreateNewSession: () => boolean;
  getActiveSession: () => ChatSession | null;
  hasEmptySession: () => boolean;
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
  isDeleting: null,

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Set the current user (called by AuthProvider)
   */
  setCurrentUser: (user: User | null) => {
    const state = get();
    const previousUser = state.currentUser;

    // Skip if same user (avoid re-triggering on token refresh)
    if (user?.id === previousUser?.id) {
      return;
    }

    // Skip if already syncing to prevent race conditions
    if (state.isDbSyncing) {
      console.log('[CHAT STORE] Already syncing, skipping setCurrentUser');
      return;
    }

    console.log('[CHAT STORE] setCurrentUser:', previousUser?.id?.slice(0, 8), '->', user?.id?.slice(0, 8));
    set({ currentUser: user });

    if (user && !previousUser) {
      // User just logged in - load their sessions from database
      console.log('[CHAT STORE] User logged in, loading sessions from DB');
      get().loadUserSessions(user.id);
    } else if (!user && previousUser) {
      // User logged out - clear sessions and load guest sessions
      console.log('[CHAT STORE] User logged out, clearing sessions');
      set({ sessions: [], activeSessionId: null });
      get().loadFromStorage();
    }
  },

  /**
   * Load user's chat sessions from Supabase
   */
  loadUserSessions: async (userId: string) => {
    const { isDbSyncing } = get();

    // Prevent duplicate loads
    if (isDbSyncing) {
      console.log('[CHAT STORE] Already syncing, skipping loadUserSessions');
      return;
    }

    // Validate userId
    if (!userId) {
      console.log('[CHAT STORE] No userId provided, skipping loadUserSessions');
      return;
    }

    const supabase = getSupabaseClient();
    set({ isDbSyncing: true });
    console.log('[CHAT STORE] Loading sessions for user:', userId.slice(0, 8));

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
        agentId: dbSession.agent_slug || 'default',
      }));

      console.log('[CHAT STORE] Loaded', sessions.length, 'sessions with',
        sessions.reduce((acc, s) => acc + s.messages.length, 0), 'total messages');

      // Verify user hasn't changed during async load (prevents stale data)
      const currentState = get();
      if (currentState.currentUser?.id !== userId) {
        console.log('[CHAT STORE] User changed during load, discarding results');
        set({ isDbSyncing: false });
        return;
      }

      set({
        sessions,
        activeSessionId: sessions[0]?.id || null,
        isDbSyncing: false,
      });
    } catch (error) {
      console.error('[CHAT STORE] Failed to load user sessions:', error);
      set({ isDbSyncing: false });

      // Only create fallback session if user is still logged in
      const currentState = get();
      if (currentState.currentUser?.id === userId) {
        const newSession = createNewSession();
        set({
          sessions: [newSession],
          activeSessionId: newSession.id,
        });
      }
    }
  },

  /**
   * Sync a session to Supabase database
   */
  syncSessionToDb: async (session: ChatSession) => {
    // Check both stores for user (handle timing issues)
    const { currentUser } = get();
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const user = currentUser || authUser;

    if (!user) {
      console.log('[CHAT STORE] No user, skipping session sync');
      return;
    }

    const supabase = getSupabaseClient();

    try {
      console.log('[CHAT STORE] Syncing session:', session.id.slice(0, 8), session.title);

      // First check if session exists and is not archived
      // This prevents accidentally syncing to archived sessions
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id, is_archived')
        .eq('id', session.id)
        .single();

      if ((existing as { is_archived?: boolean } | null)?.is_archived) {
        console.log('[CHAT STORE] Session is archived, skipping sync:', session.id.slice(0, 8));
        return;
      }

      const { error } = await supabase
        .from('chat_sessions')
        .upsert({
          id: session.id,
          user_id: user.id,
          title: session.title,
          agent_slug: session.agentId || 'default',
          is_archived: false, // Explicitly set for new sessions
          updated_at: new Date().toISOString(),
        } as never);

      if (error) {
        console.error('[CHAT STORE] Session sync error:', error.message, error.details);
      } else {
        console.log('[CHAT STORE] Session synced successfully');
      }
    } catch (error) {
      console.error('[CHAT STORE] Failed to sync session:', error);
    }
  },

  /**
   * Sync a message to Supabase database
   * Falls back to localStorage on auth errors to prevent data loss
   */
  syncMessageToDb: async (sessionId: string, message: Message) => {
    // Check both stores for user (handle timing issues)
    const { currentUser } = get();
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const user = currentUser || authUser;

    if (!user) {
      console.log('[CHAT STORE] No user, falling back to localStorage');
      get().saveToStorage();
      return;
    }

    const supabase = getSupabaseClient();

    try {
      console.log('[CHAT STORE] Syncing message:', message.id.slice(0, 8), message.role);
      const { error: msgError } = await supabase
        .from('messages')
        .upsert({
          id: message.id,
          session_id: sessionId,
          role: message.role,
          content: message.content,
          created_at: message.timestamp.toISOString(),
        } as never);

      if (msgError) {
        console.error('[CHAT STORE] Message sync error:', msgError.message, msgError.details);
        // Check for auth-related errors (session expired, unauthorized)
        if (msgError.message?.includes('JWT') ||
            msgError.message?.includes('auth') ||
            msgError.code === 'PGRST301' ||
            msgError.code === '401') {
          console.log('[CHAT STORE] Auth error during sync, falling back to localStorage');
          get().saveToStorage();
        }
        return;
      }

      // Update session's updated_at
      const { error: sessionError } = await supabase
        .from('chat_sessions')
        .update({ updated_at: new Date().toISOString() } as never)
        .eq('id', sessionId);

      if (sessionError) {
        console.error('[CHAT STORE] Session update error:', sessionError.message);
      } else {
        console.log('[CHAT STORE] Message synced successfully');
      }
    } catch (error) {
      console.error('[CHAT STORE] Failed to sync message:', error);
      // On any error, save to localStorage as fallback
      console.log('[CHAT STORE] Saving to localStorage as fallback');
      get().saveToStorage();
    }
  },

  /**
   * Delete a session from Supabase database (with retry)
   */
  deleteSessionFromDb: async (sessionId: string) => {
    // Check both stores for user (handle timing issues)
    const { currentUser } = get();
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const user = currentUser || authUser;

    if (!user) {
      console.log('[CHAT STORE] No user, skipping deleteSessionFromDb');
      return;
    }

    console.log('[CHAT STORE] Archiving session:', sessionId.slice(0, 8));
    const supabase = getSupabaseClient();

    try {
      // Archive instead of delete (soft delete) - with retry
      await withRetry(async () => {
        const { error, data } = await supabase
          .from('chat_sessions')
          .update({ is_archived: true } as never)
          .eq('id', sessionId)
          .eq('user_id', user.id) // Ensure we only archive user's own sessions
          .select();

        if (error) {
          console.error('[CHAT STORE] Archive error:', error.message);
          throw error;
        }

        console.log('[CHAT STORE] Session archived successfully:', sessionId.slice(0, 8), 'rows affected:', data?.length || 0);
      }, 2, 500); // 2 retries, 500ms base delay
    } catch (error) {
      console.error('[CHAT STORE] Failed to archive session:', error);
    }
  },

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Create a new chat session
   * - Logged-in users: Can create multiple sessions
   * - Guests: Limited to single session (clears existing)
   * - UX: Prevents creating new session if an empty one already exists (switches to it instead)
   */
  createSession: (title?: string, agentId?: string): string => {
    const { currentUser, syncSessionToDb, sessions, activeSessionId } = get();

    // Check both chatStore.currentUser AND authStore.user to handle timing issues
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const isLoggedIn = !!(currentUser || authUser);

    // If authStore has user but chatStore doesn't, sync it now
    if (!currentUser && authUser) {
      console.log('[CHAT STORE] createSession: syncing user from authStore');
      set({ currentUser: authUser });
    }

    // UX IMPROVEMENT: Check if there's already an empty session we can use
    // (unless an agentId is specified, which means user wants a specific agent session)
    if (!agentId) {
      const emptySession = sessions.find(s =>
        s.messages.length === 0 &&
        s.title === 'Ikiganiro gishya'
      );

      if (emptySession) {
        console.log('[CHAT STORE] Found existing empty session, switching to it:', emptySession.id.slice(0, 8));
        // Just switch to the existing empty session
        set({
          activeSessionId: emptySession.id,
          error: null,
          currentAgent: (emptySession.agentId || 'default') as AgentType,
        });
        return emptySession.id;
      }
    }

    // Check if current active session is empty (no messages) - reuse it with new agent
    const currentSession = sessions.find(s => s.id === activeSessionId);
    if (currentSession && currentSession.messages.length === 0 && agentId) {
      console.log('[CHAT STORE] Reusing current empty session with new agent:', agentId);
      // Update the existing session's agent instead of creating new
      const updatedTitle = title || currentSession.title;
      set((state) => ({
        sessions: state.sessions.map(s =>
          s.id === activeSessionId
            ? { ...s, agentId, title: updatedTitle, updatedAt: new Date() }
            : s
        ),
        currentAgent: agentId as AgentType,
        error: null,
      }));
      // Sync the update
      if (isLoggedIn) {
        const updated = get().sessions.find(s => s.id === activeSessionId);
        if (updated) syncSessionToDb(updated);
      }
      return activeSessionId!;
    }

    // Create new session
    const newSession = createNewSession(title, agentId);

    console.log('[CHAT STORE] createSession called, currentUser:', currentUser?.id?.slice(0, 8) || 'null',
      'authUser:', authUser?.id?.slice(0, 8) || 'null', 'isLoggedIn:', isLoggedIn, 'agentId:', agentId);

    if (isLoggedIn) {
      // Logged-in users can have multiple sessions
      console.log('[CHAT STORE] Creating new session for logged-in user, adding to existing sessions');
      set((state) => {
        console.log('[CHAT STORE] Existing sessions count:', state.sessions.length);
        return {
          sessions: [newSession, ...state.sessions],
          activeSessionId: newSession.id,
          error: null,
          currentAgent: (agentId || 'default') as AgentType,
        };
      });
      syncSessionToDb(newSession);
      // Broadcast to other tabs
      broadcastToOtherTabs({ type: 'SESSION_CREATED', session: newSession });
    } else {
      // Guests: Replace with single fresh session (no multiple chats)
      console.log('[CHAT STORE] Creating session for guest user (replacing all)');
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
   * - UX: Shows loading state during deletion
   * - UX: Smoothly transitions to next session
   * - UX: Always ensures at least one session exists
   */
  deleteSession: async (sessionId: string) => {
    const { sessions, activeSessionId, currentUser, deleteSessionFromDb, isDeleting, isStreaming, streamingMessageId } = get();

    // Prevent deletion while already deleting another session
    if (isDeleting) {
      console.log('[CHAT STORE] Cannot delete: already deleting another session');
      return;
    }

    // If trying to delete the active session while streaming, abort the stream first
    if (isStreaming && sessionId === activeSessionId) {
      console.log('[CHAT STORE] Aborting stream before deleting active session');
      abortCurrentStream();
      // Also clean up the streaming message state
      set({ isStreaming: false, streamingMessageId: null });
    }

    // Set deleting state for UI feedback
    set({ isDeleting: sessionId });

    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 150));

    // Filter out the deleted session
    const remainingSessions = sessions.filter((s) => s.id !== sessionId);

    // Determine new active session
    let newActiveId = activeSessionId;
    let newSession: ChatSession | null = null;

    if (activeSessionId === sessionId) {
      if (remainingSessions.length > 0) {
        // Find the next best session to switch to
        const deletedIndex = sessions.findIndex(s => s.id === sessionId);
        // Try to get the session after the deleted one, or the one before
        const nextSession = sessions[deletedIndex + 1] || sessions[deletedIndex - 1];
        newActiveId = nextSession?.id || remainingSessions[0].id;
      } else {
        // No sessions left, create a new one
        newSession = createNewSession();
        remainingSessions.push(newSession);
        newActiveId = newSession.id;
      }
    }

    // Update state
    set({
      sessions: remainingSessions,
      activeSessionId: newActiveId,
      currentAgent: (remainingSessions.find(s => s.id === newActiveId)?.agentId || 'default') as AgentType,
      isDeleting: null,
    });

    // Handle database operations
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const isLoggedIn = !!(currentUser || authUser);

    if (isLoggedIn) {
      // Delete from database
      deleteSessionFromDb(sessionId);
      // Sync new session if created
      if (newSession) {
        get().syncSessionToDb(newSession);
      }
      // Broadcast to other tabs
      broadcastToOtherTabs({ type: 'SESSION_DELETED', sessionId });
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
    // Check both stores for user (handle timing issues)
    const { currentUser } = get();
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    const isLoggedIn = !!(currentUser || authUser);

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === sessionId
          ? { ...session, title: newTitle, updatedAt: new Date() }
          : session
      ),
    }));

    // Save to appropriate storage
    if (isLoggedIn) {
      const session = get().sessions.find(s => s.id === sessionId);
      if (session) get().syncSessionToDb(session);
      // Broadcast to other tabs
      broadcastToOtherTabs({ type: 'SESSION_RENAMED', sessionId, title: newTitle });
    } else {
      get().saveToStorage();
    }
  },

  /**
   * Set the active chat session
   * Safely aborts any ongoing stream before switching
   */
  setActiveSession: (sessionId: string) => {
    const { sessions, activeSessionId, isStreaming } = get();

    // Don't switch if already on this session
    if (sessionId === activeSessionId) return;

    // Abort any ongoing stream before switching sessions
    if (isStreaming) {
      console.log('[CHAT STORE] Aborting stream due to session switch');
      abortCurrentStream();
    }

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

    const messageId = generateUUID();
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
   * Append content to a streaming message (immutable update)
   */
  appendToMessage: (id: string, chunk: string) => {
    const { activeSessionId } = get();
    if (!activeSessionId) return;

    // Use Zustand's set function with callback for proper immutable update
    set((state) => {
      const sessionIndex = state.sessions.findIndex(s => s.id === activeSessionId);
      if (sessionIndex === -1) return state;

      const session = state.sessions[sessionIndex];
      const messageIndex = session.messages.findIndex(m => m.id === id);
      if (messageIndex === -1) return state;

      // Create new message with appended content
      const updatedMessage = {
        ...session.messages[messageIndex],
        content: session.messages[messageIndex].content + chunk,
      };

      // Create new messages array
      const updatedMessages = [...session.messages];
      updatedMessages[messageIndex] = updatedMessage;

      // Create new session with updated messages
      const updatedSession = {
        ...session,
        messages: updatedMessages,
      };

      // Create new sessions array
      const updatedSessions = [...state.sessions];
      updatedSessions[sessionIndex] = updatedSession;

      return { sessions: updatedSessions };
    });
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

    // Check if we're offline before making the request
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setError('Nta nternet ihari. Suzuma isanzure ryawe.');
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

    // Create new AbortController for this request with timeout
    currentAbortController = new AbortController();
    const signal = currentAbortController.signal;

    // Set a timeout for the initial connection (30 seconds)
    // Note: This is for the initial response, not the streaming
    const connectionTimeoutId = setTimeout(() => {
      if (currentAbortController) {
        console.warn('[CHAT STORE] Connection timeout - aborting request');
        currentAbortController.abort(new Error('Connection timeout - server took too long to respond'));
      }
    }, 30000);

    try {
      // Get current session's messages for context
      const currentSession = get().sessions.find((s) => s.id === get().activeSessionId);
      const apiMessages = currentSession?.messages
        .filter((m) => !m.isStreaming && m.id !== assistantMessageId)
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })) || [];

      // Get user settings from store (returns non-default settings only)
      const userSettingsState = useUserSettingsStore.getState();
      const userSettings = userSettingsState.isLoading ? null : (() => {
        const settings = userSettingsState.settings;
        const defaults = {
          responseStyle: 'balanced',
          tone: 'friendly',
          languagePreference: 'mixed',
          rememberContext: true,
        };

        // Only include non-default values to minimize tokens
        const nonDefaults: Record<string, unknown> = {};
        if (settings.responseStyle !== defaults.responseStyle) {
          nonDefaults.responseStyle = settings.responseStyle;
        }
        if (settings.tone !== defaults.tone) {
          nonDefaults.tone = settings.tone;
        }
        if (settings.languagePreference !== defaults.languagePreference) {
          nonDefaults.languagePreference = settings.languagePreference;
        }
        if (settings.aboutMe?.trim()) {
          nonDefaults.aboutMe = settings.aboutMe;
        }
        if (settings.profession?.trim()) {
          nonDefaults.profession = settings.profession;
        }
        if (settings.interests && settings.interests.length > 0) {
          nonDefaults.interests = settings.interests;
        }
        if (settings.rememberContext !== defaults.rememberContext) {
          nonDefaults.rememberContext = settings.rememberContext;
        }

        return Object.keys(nonDefaults).length > 0 ? nonDefaults : null;
      })();

      // Call streaming API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          specialistId: currentAgent, // Maps to specialist prompt
          userSettings, // User AI personalization settings
        }),
        signal,
      });

      // Clear the connection timeout once we have a response
      clearTimeout(connectionTimeoutId);

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
      // Clear timeout on error
      clearTimeout(connectionTimeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
        return;
      }

      // Skip state updates if signal was aborted (prevents updates after unmount)
      if (signal.aborted) {
        console.log('Signal aborted, skipping error state update');
        return;
      }

      // Check for timeout error
      const isTimeout = error instanceof Error && error.message.includes('timeout');
      const errorMessage = isTimeout
        ? 'Connection timeout - please try again'
        : (error instanceof Error ? error.message : 'An error occurred');
      setError(errorMessage);

      const { updateMessage } = get();
      updateMessage(assistantMessageId, `Hari ikibazo cyabaye: ${errorMessage}`);
      finalizeMessage(assistantMessageId);
    } finally {
      // Always clean up the abort controller
      currentAbortController = null;
      // Only update UI state if not aborted (prevents updates after unmount)
      if (!signal.aborted) {
        setLoading(false);
        setStreaming(false, null);
      }
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

    // Don't initialize guest session if user is logged in (check both stores)
    const { currentUser } = get();
    const { useAuthStore } = require('@/store/authStore');
    const authUser = useAuthStore.getState().user;
    if (currentUser || authUser) return;

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

  // ============================================
  // UX HELPER METHODS
  // ============================================

  /**
   * Check if user can create a new session
   * Returns false if there's already an empty session
   */
  canCreateNewSession: () => {
    const { sessions, isStreaming, isDeleting } = get();

    // Can't create while streaming or deleting
    if (isStreaming || isDeleting) return false;

    // Check if there's already an empty session with default title
    const hasEmpty = sessions.some(s =>
      s.messages.length === 0 &&
      s.title === 'Ikiganiro gishya'
    );

    return !hasEmpty;
  },

  /**
   * Get the currently active session
   */
  getActiveSession: () => {
    const { sessions, activeSessionId } = get();
    return sessions.find(s => s.id === activeSessionId) || null;
  },

  /**
   * Check if there's any empty session
   */
  hasEmptySession: () => {
    const { sessions } = get();
    return sessions.some(s => s.messages.length === 0);
  },
}));

// ============================================
// CROSS-TAB SYNC INITIALIZATION
// ============================================
// Initialize cross-tab sync after store is created (client-side only)
if (typeof window !== 'undefined') {
  // Delay initialization to ensure store is ready
  setTimeout(() => {
    initCrossTabSync((message) => {
      const state = useChatStore.getState();

      // Only sync for logged-in users
      if (!state.currentUser) return;

      switch (message.type) {
        case 'SESSION_CREATED': {
          // Add the new session if it doesn't exist
          const exists = state.sessions.some(s => s.id === message.session.id);
          if (!exists) {
            useChatStore.setState((prev) => ({
              sessions: [message.session, ...prev.sessions],
            }));
            console.log('[CROSS-TAB] Added session from other tab:', message.session.id.slice(0, 8));
          }
          break;
        }

        case 'SESSION_DELETED': {
          // Remove the deleted session
          const sessionExists = state.sessions.some(s => s.id === message.sessionId);
          if (sessionExists) {
            const remainingSessions = state.sessions.filter(s => s.id !== message.sessionId);
            const newState: Partial<typeof state> = { sessions: remainingSessions };

            // If deleted session was active, switch to another
            if (state.activeSessionId === message.sessionId && remainingSessions.length > 0) {
              newState.activeSessionId = remainingSessions[0].id;
            }

            useChatStore.setState(newState);
            console.log('[CROSS-TAB] Removed session from other tab:', message.sessionId.slice(0, 8));
          }
          break;
        }

        case 'SESSION_RENAMED': {
          // Update the session title
          useChatStore.setState((prev) => ({
            sessions: prev.sessions.map(s =>
              s.id === message.sessionId
                ? { ...s, title: message.title, updatedAt: new Date() }
                : s
            ),
          }));
          console.log('[CROSS-TAB] Renamed session from other tab:', message.sessionId.slice(0, 8));
          break;
        }

        case 'REQUEST_SYNC':
          // Another tab is requesting sync - could implement full state sync here
          // For now, we rely on database as source of truth
          break;
      }
    });
  }, 100);
}

/**
 * Types for Bakame.ai Chat Application
 *
 * This file contains all TypeScript interfaces and types used throughout
 * the application. Organized by feature area for easy navigation.
 */

// ============================================
// MESSAGE TYPES
// ============================================

// Message role types - who sent the message
export type MessageRole = 'user' | 'assistant' | 'system';

// Individual chat message structure
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean; // True while message is being streamed
}

// ============================================
// CHAT SESSION TYPES (Multi-chat support)
// ============================================

// Individual chat session
export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  agentId?: string; // Which specialist agent was used (if any)
}

// Serializable version for localStorage
export interface ChatSessionSerialized {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: MessageRole;
    content: string;
    timestamp: string;
    isStreaming?: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
  agentId?: string;
}

// ============================================
// CHAT STORE TYPES
// ============================================

// Chat state for Zustand store with multi-session support
export interface ChatState {
  // Session management
  sessions: ChatSession[];
  activeSessionId: string | null;

  // Current session state
  isLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
  error: string | null;
  currentAgent: AgentType;

  // UI state
  sidebarOpen: boolean;
}

// Actions for the chat store
export interface ChatActions {
  // Session management
  createSession: (title?: string, agentId?: string) => string;
  deleteSession: (sessionId: string) => void;
  clearAllSessions: () => void;
  renameSession: (sessionId: string, newTitle: string) => void;
  setActiveSession: (sessionId: string) => void;

  // Message management (operates on active session)
  addMessage: (role: MessageRole, content: string, isStreaming?: boolean) => string;
  updateMessage: (id: string, content: string) => void;
  finalizeMessage: (id: string) => void;
  appendToMessage: (id: string, chunk: string) => void;
  flushStreamBuffer: (id: string) => void;
  clearMessages: () => void;

  // State setters
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean, messageId?: string | null) => void;
  setError: (error: string | null) => void;
  setAgent: (agent: AgentType) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Main action
  sendMessage: (content: string) => Promise<void>;
  cancelRequest: () => void;

  // Persistence
  loadFromStorage: () => void;
  saveToStorage: () => void;
}

// Combined store type
export type ChatStore = ChatState & ChatActions;

// ============================================
// API TYPES
// ============================================

// API request/response types
export interface ChatRequest {
  messages: Array<{
    role: MessageRole;
    content: string;
  }>;
  agent?: AgentType;
}

export interface ChatResponse {
  message: string;
  error?: string;
}

// Streaming chunk from SSE
export interface StreamChunk {
  content?: string;
  error?: string;
}

// ============================================
// THEME TYPES
// ============================================

export type Theme = 'light' | 'dark';

export interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// ============================================
// AGENT TYPES (for multi-agent support)
// ============================================

// Available agent types - extend this as you add new agents
export type AgentType = 'default' | 'tax' | 'legal' | 'business' | 'creative';

// Agent configuration
export interface AgentConfig {
  id: AgentType;
  name: string;
  description: string;
  icon: string; // Emoji or icon identifier
  color: string; // Accent color for the agent
}

// Predefined agent configurations
export const AGENTS: Record<AgentType, AgentConfig> = {
  default: {
    id: 'default',
    name: 'Bakame',
    description: 'AI y\'Abanyarwanda',
    icon: '🐰',
    color: '#22C55E',
  },
  tax: {
    id: 'tax',
    name: 'Tax Advisor',
    description: 'Expert tax guidance and planning',
    icon: '📊',
    color: '#10B981',
  },
  legal: {
    id: 'legal',
    name: 'Legal Assistant',
    description: 'Legal information and document help',
    icon: '⚖️',
    color: '#8B5CF6',
  },
  business: {
    id: 'business',
    name: 'Business Consultant',
    description: 'Business strategy and operations',
    icon: '💼',
    color: '#F59E0B',
  },
  creative: {
    id: 'creative',
    name: 'Creative Writer',
    description: 'Creative writing and content creation',
    icon: '✨',
    color: '#EC4899',
  },
};

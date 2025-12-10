/**
 * Sidebar Component - Modern Minimal Design
 *
 * Features:
 * - Quick Actions: Image, Video, Voice generation
 * - New Chat with modern icon
 * - Chat history with sleek design
 * - User account menu (far right)
 * - Glass morphism effects
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useChatStore } from '@/store/chatStore';
import { useAuthStore } from '@/store/authStore';
import { ChatSession } from '@/types';

export default function Sidebar() {
  const router = useRouter();
  const {
    sessions,
    activeSessionId,
    sidebarOpen,
    isStreaming,
    isDeleting,
    isDbSyncing,
    createSession,
    deleteSession,
    renameSession,
    setActiveSession,
    setSidebarOpen,
    canCreateNewSession,
  } = useChatStore();

  const { user, profile, signOut } = useAuthStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click/touch
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showUserMenu]);

  // Don't render sidebar for guests
  if (!user) {
    return null;
  }

  // User display info
  const displayName = profile?.name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72
          bg-white dark:bg-[#0f0f0f]
          border-r border-gray-200/80 dark:border-white/5
          flex flex-col transition-transform duration-300 ease-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header - Logo and Close */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
              flex items-center justify-center shadow-lg shadow-green-500/20">
              <span className="text-sm">🐰</span>
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">Bakame</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button - Thin style like ChatGPT */}
        <div className="px-3 pt-3">
          <button
            onClick={() => {
              createSession();
              if (window.innerWidth < 1024) setSidebarOpen(false);
            }}
            disabled={isStreaming || !canCreateNewSession()}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              transition-all duration-200 border
              ${canCreateNewSession() && !isStreaming
                ? 'border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-200'
                : 'border-gray-100 dark:border-white/5 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm">Ikiganiro Gishya</span>
          </button>
        </div>

        {/* Quick Actions - Media Generation (Rwandan colors: Green, Yellow, Blue) */}
        <div className="px-3 pt-3 pb-2 space-y-1.5">
          {/* Generate Images - Green (Rwanda) */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-green-50 dark:hover:bg-green-500/10
              group transition-all duration-200"
            title="Generate Images - Coming Soon"
          >
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">Generate Images</span>
            <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 rounded">Soon</span>
          </button>

          {/* Generate Videos - Yellow (Rwanda) */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-yellow-50 dark:hover:bg-yellow-500/10
              group transition-all duration-200"
            title="Generate Videos - Coming Soon"
          >
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">Generate Videos</span>
            <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">Soon</span>
          </button>

          {/* Voice Assistant - Blue (Rwanda) */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              hover:bg-blue-50 dark:hover:bg-blue-500/10
              group transition-all duration-200"
            title="Voice Assistant - Coming Soon"
          >
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.25}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Voice Assistant</span>
            <span className="ml-auto px-1.5 py-0.5 text-[9px] font-medium bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded">Soon</span>
          </button>
        </div>

        {/* Chats Section */}
        <div className="px-3 pt-4 pb-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
            Ibiganiro
          </span>
          <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
            {sessions.length}
          </span>
        </div>

        {/* Sessions list */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {isDbSyncing && sessions.length === 0 ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-3/4 bg-gray-200 dark:bg-white/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gray-100 dark:bg-white/5
                flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nta biganiro</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Tangira ikiganiro gishya!</p>
            </div>
          ) : (
            sessions.map((session, index) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                index={index}
                onSelect={() => {
                  if (isDeleting) return;
                  setActiveSession(session.id);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                onDelete={() => deleteSession(session.id)}
                onRename={(newTitle) => renameSession(session.id, newTitle)}
                disabled={isStreaming || !!isDeleting}
                isDeleting={isDeleting === session.id}
              />
            ))
          )}
        </div>

        {/* User Account - Bottom */}
        <div className="border-t border-gray-100 dark:border-white/5 p-3">
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                hover:bg-gray-100 dark:hover:bg-white/5 transition-colors group"
            >
              {/* Avatar */}
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100 dark:ring-white/10" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
                  flex items-center justify-center text-white text-xs font-semibold shadow-lg shadow-green-500/20">
                  {initials}
                </div>
              )}
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Menu Popup */}
            {showUserMenu && (
              <div className="absolute bottom-full left-0 right-0 mb-2
                bg-white dark:bg-[#1a1a1a] rounded-xl
                shadow-xl shadow-black/10 dark:shadow-black/40
                border border-gray-200/80 dark:border-white/10
                overflow-hidden animate-fadeIn">
                <div className="py-1">
                  <button
                    onClick={() => { setShowUserMenu(false); router.push('/profile'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Umwirondoro
                  </button>
                  <button
                    onClick={() => { setShowUserMenu(false); router.push('/profile'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Igenamiterere
                  </button>
                </div>
                <div className="border-t border-gray-100 dark:border-white/10 py-1">
                  <button
                    onClick={async () => { setShowUserMenu(false); await signOut(); router.push('/'); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                      text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sohoka
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Toggle button when closed */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 p-2.5 rounded-xl
            bg-white dark:bg-[#1a1a1a]
            border border-gray-200/80 dark:border-white/10
            text-gray-600 dark:text-gray-300
            hover:bg-gray-50 dark:hover:bg-white/5
            shadow-lg shadow-black/5 dark:shadow-black/20
            transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>
      )}
    </>
  );
}

// Session Item Component
interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  disabled: boolean;
  isDeleting: boolean;
}

function SessionItem({
  session,
  isActive,
  index,
  onSelect,
  onDelete,
  onRename,
  disabled,
  isDeleting,
}: SessionItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(session.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

  const handleRename = () => {
    if (editTitle.trim() && editTitle !== session.title) {
      onRename(editTitle.trim());
    } else {
      setEditTitle(session.title);
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200
        ${isDeleting ? 'opacity-50 bg-red-50 dark:bg-red-500/10' : ''}
        ${isActive && !isDeleting ? 'bg-green-50 dark:bg-green-500/10' : ''}
        ${!isActive && !isDeleting ? 'hover:bg-gray-100 dark:hover:bg-white/5' : ''}
        ${disabled && !isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && !isEditing && !isDeleting && onSelect()}
    >
      {/* Chat icon */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
        ${isActive ? 'bg-green-100 dark:bg-green-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
        {isDeleting ? (
          <svg className="w-4 h-4 animate-spin text-red-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className={`w-4 h-4 ${isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setEditTitle(session.title); setIsEditing(false); }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 text-sm bg-white dark:bg-gray-800
              border border-green-500/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        ) : (
          <p className={`text-sm truncate ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-300'}`}
            title={session.title}>
            {session.title}
          </p>
        )}
      </div>

      {/* Menu button */}
      {!isEditing && !disabled && !isDeleting && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
            className={`p-1.5 rounded-lg transition-all
              ${showMenu ? 'bg-gray-200 dark:bg-white/10' : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10'}`}
          >
            <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-8 w-32 bg-white dark:bg-[#1a1a1a]
              rounded-lg shadow-xl border border-gray-200/80 dark:border-white/10 py-1 z-50">
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); setIsEditing(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-700 dark:text-gray-200
                  hover:bg-gray-50 dark:hover:bg-white/5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                Hindura
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(false); onDelete(); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 dark:text-red-400
                  hover:bg-red-50 dark:hover:bg-red-500/10"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
                Siba
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

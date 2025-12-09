/**
 * Sidebar Component - Premium Design
 *
 * Features:
 * - Sleek narrow design with custom scrollbar
 * - Smooth hover animations with gradients
 * - Glass morphism effects
 * - Micro-interactions on all elements
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ChatSession } from '@/types';

export default function Sidebar() {
  const {
    sessions,
    activeSessionId,
    sidebarOpen,
    isStreaming,
    createSession,
    deleteSession,
    renameSession,
    setActiveSession,
    setSidebarOpen,
  } = useChatStore();

  return (
    <>
      {/* Mobile overlay with blur */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-md transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - narrower and sleeker */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64
          bg-gradient-to-b from-gray-50 to-gray-100
          dark:from-[#0a0a0a] dark:to-[#111111]
          border-r border-gray-200/50 dark:border-white/5
          flex flex-col transition-all duration-300 ease-out
          shadow-xl shadow-black/5 dark:shadow-black/30
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header with glassmorphism */}
        <div className="flex items-center justify-between p-3 h-14
          bg-white/50 dark:bg-white/5 backdrop-blur-sm
          border-b border-gray-200/50 dark:border-white/5">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
              flex items-center justify-center shadow-lg shadow-green-500/20
              hover:shadow-green-500/40 hover:scale-105 transition-all duration-300">
              <span className="text-xs">🐰</span>
            </div>
            <span className="text-sm font-semibold bg-gradient-to-r from-green-500 to-blue-500 bg-clip-text text-transparent">
              Bakame
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* New chat button */}
            <button
              onClick={() => {
                createSession();
                if (window.innerWidth < 1024) setSidebarOpen(false);
              }}
              disabled={isStreaming}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                hover:bg-gradient-to-r hover:from-green-500/10 hover:to-blue-500/10
                hover:text-green-600 dark:hover:text-green-400
                active:scale-95 transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed"
              title="Ikiganiro gishya"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400
                hover:bg-gray-200/50 dark:hover:bg-white/5
                active:scale-95 transition-all duration-200"
              title="Funga"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sessions list with custom scrollbar */}
        <div className="flex-1 overflow-y-auto sidebar-scroll px-2 py-3">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br from-green-500/20 to-blue-500/20
                flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Nta biganiro bihari</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Tangira ikiganiro gishya!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map((session, index) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === activeSessionId}
                  index={index}
                  onSelect={() => {
                    setActiveSession(session.id);
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  onDelete={() => deleteSession(session.id)}
                  onRename={(newTitle) => renameSession(session.id, newTitle)}
                  disabled={isStreaming}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer with gradient border */}
        <div className="p-3 border-t border-gray-200/50 dark:border-white/5
          bg-gradient-to-t from-gray-100 to-transparent dark:from-black/20 dark:to-transparent">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl
            bg-white/70 dark:bg-white/5
            border border-gray-200/50 dark:border-white/5
            hover:border-green-500/30 dark:hover:border-green-500/20
            transition-all duration-300 group cursor-default">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 via-yellow-500 to-blue-500
              flex items-center justify-center shadow-md shadow-green-500/20
              group-hover:shadow-green-500/40 group-hover:scale-105 transition-all duration-300">
              <span className="text-sm">🐰</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 dark:text-gray-100 truncate">
                Bakame AI
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {sessions.length} {sessions.length === 1 ? 'ikiganiro' : 'ibiganiro'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
          </div>
        </div>
      </aside>

      {/* Toggle button when closed - floating pill design */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-3 left-3 z-40 p-2.5 rounded-xl
            bg-white/90 dark:bg-[#1a1a1a]/90 backdrop-blur-md
            border border-gray-200/50 dark:border-white/10
            text-gray-600 dark:text-gray-300
            hover:bg-gradient-to-r hover:from-green-500/10 hover:to-blue-500/10
            hover:border-green-500/30 dark:hover:border-green-500/20
            hover:text-green-600 dark:hover:text-green-400
            shadow-lg shadow-black/5 dark:shadow-black/30
            hover:shadow-xl hover:shadow-green-500/10
            active:scale-95 transition-all duration-300"
          title="Fungura"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </button>
      )}
    </>
  );
}

// ============================================
// Session Item Component - Premium
// ============================================

interface SessionItemProps {
  session: ChatSession;
  isActive: boolean;
  index: number;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  disabled: boolean;
}

function SessionItem({
  session,
  isActive,
  index,
  onSelect,
  onDelete,
  onRename,
  disabled,
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
      style={{ animationDelay: `${index * 30}ms` }}
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200 animate-fadeIn
        ${isActive
          ? 'bg-gradient-to-r from-green-500/15 to-blue-500/10 border border-green-500/20 shadow-sm'
          : 'hover:bg-gray-200/50 dark:hover:bg-white/5 border border-transparent hover:border-gray-200/50 dark:hover:border-white/5'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && !isEditing && onSelect()}
    >
      {/* Chat icon */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
        transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-br from-green-500 to-blue-500 text-white shadow-md shadow-green-500/20'
          : 'bg-gray-200/70 dark:bg-white/10 text-gray-500 dark:text-gray-400 group-hover:bg-green-500/20 group-hover:text-green-600'
        }`}>
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
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
              if (e.key === 'Escape') {
                setEditTitle(session.title);
                setIsEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-800
              border border-green-500/50 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-green-500/30"
          />
        ) : (
          <p className={`text-xs truncate transition-colors duration-200
            ${isActive ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-600 dark:text-gray-300'}`}>
            {session.title}
          </p>
        )}
      </div>

      {/* Menu button */}
      {!isEditing && !disabled && (
        <div className="relative" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className={`p-1.5 rounded-lg transition-all duration-200
              ${showMenu
                ? 'bg-gray-200 dark:bg-white/10 opacity-100'
                : 'opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-white/10'
              }`}
          >
            <svg className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
            </svg>
          </button>

          {/* Dropdown menu */}
          {showMenu && (
            <div className="absolute right-0 top-8 w-32
              bg-white dark:bg-[#1a1a1a]
              rounded-xl shadow-xl shadow-black/10 dark:shadow-black/40
              border border-gray-200/50 dark:border-white/10
              py-1 z-50 animate-fadeIn overflow-hidden">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setIsEditing(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs
                  text-gray-700 dark:text-gray-200
                  hover:bg-gradient-to-r hover:from-green-500/10 hover:to-blue-500/10
                  transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487z" />
                </svg>
                Hindura
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  if (confirm('Urashaka gusiba iki kiganiro?')) {
                    onDelete();
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs
                  text-red-600 dark:text-red-400
                  hover:bg-red-500/10
                  transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
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

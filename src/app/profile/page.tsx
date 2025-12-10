/**
 * User Profile Page
 *
 * Features:
 * - Profile info (name, email, phone, avatar)
 * - Settings & preferences
 * - Language preference
 * - Theme preference
 * - Chat history management
 * - Account actions
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { useLanguageStore } from '@/store/languageStore';
import { useChatStore } from '@/store/chatStore';

type TabType = 'profile' | 'preferences' | 'data';

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, isInitialized, signOut, updateProfile, refreshProfile } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const { language, toggleLanguage } = useLanguageStore();
  const { sessions, clearAllSessions } = useChatStore();

  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/auth/login');
    }
  }, [user, isInitialized, router]);

  // Initialize edit name
  useEffect(() => {
    if (profile?.name) {
      setEditName(profile.name);
    } else if (user?.user_metadata?.full_name) {
      setEditName(user.user_metadata.full_name);
    }
  }, [profile, user]);

  // Loading state
  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center
        bg-gradient-to-br from-gray-50 via-white to-gray-100
        dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = profile?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();
  const totalMessages = sessions.reduce((acc, s) => acc + s.messages.length, 0);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;

    setIsSaving(true);
    const { error } = await updateProfile({ name: editName.trim() });
    setIsSaving(false);

    if (!error) {
      setIsEditing(false);
      setSuccessMessage(language === 'rw' ? 'Byahinduwe neza!' : 'Profile updated!');
      setTimeout(() => setSuccessMessage(null), 3000);
      refreshProfile();
    }
  };

  const handleClearAllChats = async () => {
    clearAllSessions();
    setShowDeleteConfirm(false);
    setSuccessMessage(language === 'rw' ? 'Ibiganiro byose byasibwe!' : 'All chats cleared!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const tabs = [
    { id: 'profile' as TabType, label: language === 'rw' ? 'Umwirondoro' : 'Profile', icon: '👤' },
    { id: 'preferences' as TabType, label: language === 'rw' ? 'Ibyifuzo' : 'Preferences', icon: '⚙️' },
    { id: 'data' as TabType, label: language === 'rw' ? 'Amakuru' : 'Data', icon: '📊' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100
      dark:from-[#0a0a0a] dark:via-[#0a0a0a] dark:to-[#111111]">

      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 dark:bg-[#0a0a0a]/80
        border-b border-gray-200/50 dark:border-white/5">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400
              hover:text-gray-900 dark:hover:text-white
              transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">
              {language === 'rw' ? 'Subira' : 'Back'}
            </span>
          </button>

          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            {language === 'rw' ? 'Igenamiterere' : 'Settings'}
          </h1>

          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl
            bg-green-500 text-white shadow-lg shadow-green-500/30">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        </div>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Profile Header Card */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl
          rounded-3xl border border-gray-200/50 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/30
          p-6 mb-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-20 h-20 rounded-2xl object-cover
                  ring-4 ring-green-500/20"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-blue-500
                flex items-center justify-center text-white text-2xl font-bold
                ring-4 ring-green-500/20">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl text-lg font-semibold
                      bg-gray-100 dark:bg-white/10
                      border border-gray-200 dark:border-white/20
                      text-gray-900 dark:text-white
                      focus:outline-none focus:ring-2 focus:ring-green-500/50"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={isSaving}
                    className="p-2 rounded-xl bg-green-500 text-white
                      hover:bg-green-600 disabled:opacity-50
                      transition-colors duration-200"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditName(displayName);
                    }}
                    className="p-2 rounded-xl bg-gray-200 dark:bg-white/10
                      text-gray-600 dark:text-gray-400
                      hover:bg-gray-300 dark:hover:bg-white/20
                      transition-colors duration-200"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                    {displayName}
                  </h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                      hover:bg-gray-100 dark:hover:bg-white/10
                      transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {user.email || user.phone}
              </p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {sessions.length} {language === 'rw' ? 'ibiganiro' : 'chats'}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {totalMessages} {language === 'rw' ? 'ubutumwa' : 'messages'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
                whitespace-nowrap transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
                  : 'bg-white/80 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
                }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl
          rounded-3xl border border-gray-200/50 dark:border-white/10
          shadow-xl shadow-black/5 dark:shadow-black/30
          overflow-hidden">

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="divide-y divide-gray-200/50 dark:divide-white/10">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Email</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {language === 'rw' ? 'Telefoni' : 'Phone'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.phone || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {language === 'rw' ? 'Iyandikishirijwe' : 'Joined'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString(language === 'rw' ? 'rw-RW' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="divide-y divide-gray-200/50 dark:divide-white/10">
              {/* Theme */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                    {theme === 'dark' ? (
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {language === 'rw' ? 'Isura' : 'Theme'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {theme === 'dark'
                        ? (language === 'rw' ? 'Ijoro' : 'Dark')
                        : (language === 'rw' ? 'Umucyo' : 'Light')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200
                    ${theme === 'dark' ? 'bg-green-500' : 'bg-gray-300 dark:bg-white/20'}`}
                >
                  <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow-md
                    transition-transform duration-200
                    ${theme === 'dark' ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Language */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {language === 'rw' ? 'Ururimi' : 'Language'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {language === 'rw' ? 'Ikinyarwanda' : 'English'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleLanguage}
                  className="px-4 py-2 rounded-xl text-sm font-medium
                    bg-gray-100 dark:bg-white/10
                    text-gray-700 dark:text-gray-300
                    hover:bg-gray-200 dark:hover:bg-white/20
                    transition-colors duration-200"
                >
                  {language === 'rw' ? 'EN' : 'RW'}
                </button>
              </div>
            </div>
          )}

          {/* Data Tab */}
          {activeTab === 'data' && (
            <div className="divide-y divide-gray-200/50 dark:divide-white/10">
              {/* Chat Stats */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {language === 'rw' ? 'Imibare' : 'Statistics'}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{sessions.length}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'rw' ? 'Ibiganiro' : 'Chats'}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/5">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalMessages}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {language === 'rw' ? 'Ubutumwa' : 'Messages'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Clear Chats */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  {language === 'rw' ? 'Gusiba amakuru' : 'Delete Data'}
                </h3>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={sessions.length === 0}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl
                    bg-red-500/10 text-red-600 dark:text-red-400
                    hover:bg-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {language === 'rw' ? 'Siba ibiganiro byose' : 'Clear all chats'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sign Out Button */}
        <button
          onClick={handleSignOut}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-4 rounded-2xl
            bg-white/80 dark:bg-white/5 backdrop-blur-xl
            border border-gray-200/50 dark:border-white/10
            text-red-600 dark:text-red-400 font-medium
            hover:bg-red-50 dark:hover:bg-red-500/10
            transition-all duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {language === 'rw' ? 'Sohoka' : 'Sign Out'}
        </button>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-[#1a1a1a] rounded-3xl
            border border-gray-200 dark:border-white/10
            shadow-2xl p-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-red-500/10
                flex items-center justify-center">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {language === 'rw' ? 'Uremeza gusiba?' : 'Confirm Delete?'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {language === 'rw'
                  ? 'Ibiganiro byose bizasibwa burundu. Ntibishobora gusubizwa.'
                  : 'All chats will be permanently deleted. This cannot be undone.'}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl
                    bg-gray-100 dark:bg-white/10
                    text-gray-700 dark:text-gray-200 font-medium
                    hover:bg-gray-200 dark:hover:bg-white/20
                    transition-colors duration-200"
                >
                  {language === 'rw' ? 'Bireke' : 'Cancel'}
                </button>
                <button
                  onClick={handleClearAllChats}
                  className="flex-1 px-4 py-3 rounded-xl
                    bg-red-500 text-white font-medium
                    hover:bg-red-600
                    transition-colors duration-200"
                >
                  {language === 'rw' ? 'Yego, siba' : 'Yes, delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

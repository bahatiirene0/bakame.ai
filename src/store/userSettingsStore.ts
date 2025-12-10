/**
 * User Settings Store
 *
 * Manages user AI preferences and personalization settings.
 * Settings are stored in user.metadata.aiSettings in Supabase.
 *
 * FEATURES:
 * - Debounced saves to prevent excessive database calls
 * - Optimistic updates for instant UI feedback
 * - Error recovery with retry logic
 */

import { create } from 'zustand';
import { getSupabaseClient } from '@/lib/supabase';
import {
  UserAISettings,
  DEFAULT_AI_SETTINGS,
  sanitizeUserSettings,
} from '@/lib/prompts';

interface UserSettingsState {
  // Settings
  settings: UserAISettings;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  lastSaved: Date | null;

  // Actions
  loadSettings: (userId: string) => Promise<void>;
  updateSettings: (updates: Partial<UserAISettings>) => void;
  saveSettings: () => Promise<void>;
  resetSettings: () => Promise<void>;
  clearSettings: () => void;
}

// Debounce timer for saving
let saveDebounceTimer: NodeJS.Timeout | null = null;
const SAVE_DEBOUNCE_MS = 800; // Wait 800ms after last change before saving

// Track pending updates to batch them
let pendingUpdates: Partial<UserAISettings> = {};

export const useUserSettingsStore = create<UserSettingsState>((set, get) => ({
  settings: { ...DEFAULT_AI_SETTINGS },
  isLoading: false,
  isSaving: false,
  error: null,
  lastSaved: null,

  /**
   * Load settings from Supabase user.metadata
   */
  loadSettings: async (userId: string) => {
    set({ isLoading: true, error: null });

    try {
      const supabase = getSupabaseClient();

      const { data: user, error } = await supabase
        .from('users')
        .select('metadata')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[USER SETTINGS] Failed to load:', error.message);
        set({
          isLoading: false,
          error: 'Failed to load settings. Using defaults.'
        });
        return;
      }

      // Extract aiSettings from metadata
      const userData = user as { metadata?: Record<string, unknown> } | null;
      const metadata = userData?.metadata;
      const aiSettings = metadata?.aiSettings as Partial<UserAISettings> | undefined;

      if (aiSettings) {
        const sanitized = sanitizeUserSettings(aiSettings);
        set({
          settings: { ...DEFAULT_AI_SETTINGS, ...sanitized },
          isLoading: false,
          error: null,
        });
        console.log('[USER SETTINGS] Loaded:', sanitized);
      } else {
        // No settings yet, use defaults
        set({ settings: { ...DEFAULT_AI_SETTINGS }, isLoading: false, error: null });
        console.log('[USER SETTINGS] Using defaults');
      }
    } catch (error) {
      console.error('[USER SETTINGS] Load error:', error);
      set({ isLoading: false, error: 'Failed to load settings' });
    }
  },

  /**
   * Update settings locally with debounced save
   * This provides instant UI feedback while batching database writes
   */
  updateSettings: (updates: Partial<UserAISettings>) => {
    // Immediately update local state (optimistic update)
    const currentSettings = get().settings;
    const sanitized = sanitizeUserSettings(updates);
    const newSettings = { ...currentSettings, ...sanitized };

    set({ settings: newSettings, error: null });

    // Accumulate pending updates
    pendingUpdates = { ...pendingUpdates, ...sanitized };

    // Clear existing debounce timer
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
    }

    // Set new debounce timer
    saveDebounceTimer = setTimeout(() => {
      get().saveSettings();
    }, SAVE_DEBOUNCE_MS);
  },

  /**
   * Actually save settings to Supabase (called after debounce)
   */
  saveSettings: async () => {
    // Skip if no pending updates
    if (Object.keys(pendingUpdates).length === 0) {
      return;
    }

    set({ isSaving: true, error: null });

    try {
      const supabase = getSupabaseClient();

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        set({ isSaving: false, error: 'Not authenticated' });
        return;
      }

      // Get current settings from state (already includes pending updates)
      const settingsToSave = get().settings;

      // Get current metadata from database
      const { data: userRow, error: fetchError } = await supabase
        .from('users')
        .select('metadata')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        console.error('[USER SETTINGS] Fetch error:', fetchError.message);
        set({ isSaving: false, error: 'Failed to save settings' });
        return;
      }

      const userRowTyped = userRow as { metadata?: Record<string, unknown> } | null;
      const currentMetadata = userRowTyped?.metadata || {};

      // Update metadata with new aiSettings
      const { error } = await supabase
        .from('users')
        .update({
          metadata: {
            ...currentMetadata,
            aiSettings: settingsToSave,
          },
        } as never)
        .eq('id', user.id);

      if (error) {
        console.error('[USER SETTINGS] Save error:', error.message);
        set({ isSaving: false, error: 'Failed to save settings' });
        return;
      }

      // Clear pending updates and mark as saved
      pendingUpdates = {};
      set({ isSaving: false, lastSaved: new Date(), error: null });
      console.log('[USER SETTINGS] Saved successfully');
    } catch (error) {
      console.error('[USER SETTINGS] Update error:', error);
      set({ isSaving: false, error: 'Failed to update settings' });
    }
  },

  /**
   * Reset settings to defaults
   */
  resetSettings: async () => {
    set({ settings: { ...DEFAULT_AI_SETTINGS } });
    pendingUpdates = { ...DEFAULT_AI_SETTINGS };
    await get().saveSettings();
  },

  /**
   * Clear settings (on logout)
   */
  clearSettings: () => {
    // Clear debounce timer
    if (saveDebounceTimer) {
      clearTimeout(saveDebounceTimer);
      saveDebounceTimer = null;
    }
    pendingUpdates = {};

    set({
      settings: { ...DEFAULT_AI_SETTINGS },
      isLoading: false,
      isSaving: false,
      error: null,
      lastSaved: null,
    });
  },
}));

/**
 * Hook to get current AI settings for API calls
 */
export function useAISettings(): Partial<UserAISettings> | null {
  const settings = useUserSettingsStore((state) => state.settings);
  const isLoading = useUserSettingsStore((state) => state.isLoading);

  // Return null if still loading to avoid sending incomplete settings
  if (isLoading) return null;

  // Only return non-default settings to minimize token usage
  const nonDefaults: Partial<UserAISettings> = {};

  if (settings.responseStyle !== DEFAULT_AI_SETTINGS.responseStyle) {
    nonDefaults.responseStyle = settings.responseStyle;
  }
  if (settings.tone !== DEFAULT_AI_SETTINGS.tone) {
    nonDefaults.tone = settings.tone;
  }
  if (settings.languagePreference !== DEFAULT_AI_SETTINGS.languagePreference) {
    nonDefaults.languagePreference = settings.languagePreference;
  }
  if (settings.aboutMe && settings.aboutMe.trim()) {
    nonDefaults.aboutMe = settings.aboutMe;
  }
  if (settings.profession && settings.profession.trim()) {
    nonDefaults.profession = settings.profession;
  }
  if (settings.interests && settings.interests.length > 0) {
    nonDefaults.interests = settings.interests;
  }
  if (settings.rememberContext !== DEFAULT_AI_SETTINGS.rememberContext) {
    nonDefaults.rememberContext = settings.rememberContext;
  }

  return Object.keys(nonDefaults).length > 0 ? nonDefaults : null;
}

/**
 * User Context & Personalization
 *
 * Builds user-specific prompt context from their settings.
 * Designed to be token-efficient (~50 tokens max).
 */

/**
 * User AI Settings - stored in user.metadata.aiSettings
 */
export interface UserAISettings {
  // Response preferences
  responseStyle: 'concise' | 'balanced' | 'detailed';
  tone: 'professional' | 'friendly' | 'casual';
  languagePreference: 'kinyarwanda' | 'english' | 'mixed';

  // Context memory
  aboutMe: string; // User's self-description (max 200 chars)
  profession: string; // e.g., "nurse", "teacher", "business owner"
  interests: string[]; // e.g., ["tech", "health", "agriculture"]

  // Feature toggles
  rememberContext: boolean; // Whether to include aboutMe in prompts
}

/**
 * Default settings for new users
 */
export const DEFAULT_AI_SETTINGS: UserAISettings = {
  responseStyle: 'balanced',
  tone: 'friendly',
  languagePreference: 'mixed',
  aboutMe: '',
  profession: '',
  interests: [],
  rememberContext: true,
};

/**
 * Build user context prompt from settings
 * Returns empty string if no meaningful context
 */
export function buildUserContext(settings: Partial<UserAISettings> | null): string {
  if (!settings) return '';

  const parts: string[] = [];

  // Response style preference
  if (settings.responseStyle && settings.responseStyle !== 'balanced') {
    const styleMap = {
      concise: 'Keep responses brief and to the point.',
      detailed: 'Provide thorough, detailed explanations.',
    };
    if (styleMap[settings.responseStyle]) {
      parts.push(styleMap[settings.responseStyle]);
    }
  }

  // Tone preference
  if (settings.tone && settings.tone !== 'friendly') {
    const toneMap = {
      professional: 'Use a professional, formal tone.',
      casual: 'Be casual and relaxed in your responses.',
    };
    if (toneMap[settings.tone]) {
      parts.push(toneMap[settings.tone]);
    }
  }

  // Language preference
  if (settings.languagePreference && settings.languagePreference !== 'mixed') {
    const langMap = {
      kinyarwanda: 'Respond primarily in Kinyarwanda.',
      english: 'Respond primarily in English.',
    };
    if (langMap[settings.languagePreference]) {
      parts.push(langMap[settings.languagePreference]);
    }
  }

  // User context (if enabled and provided)
  if (settings.rememberContext !== false) {
    if (settings.profession) {
      parts.push(`User is a ${settings.profession}.`);
    }

    if (settings.aboutMe && settings.aboutMe.trim().length > 0) {
      // Truncate to prevent token bloat
      const truncated = settings.aboutMe.slice(0, 200);
      parts.push(`About user: ${truncated}`);
    }

    if (settings.interests && settings.interests.length > 0) {
      const interestsStr = settings.interests.slice(0, 5).join(', ');
      parts.push(`Interests: ${interestsStr}`);
    }
  }

  if (parts.length === 0) return '';

  return `\nUSER PREFERENCES:\n${parts.join('\n')}`;
}

/**
 * Validate and sanitize user settings
 */
export function sanitizeUserSettings(input: unknown): Partial<UserAISettings> {
  if (!input || typeof input !== 'object') return {};

  const settings = input as Record<string, unknown>;
  const result: Partial<UserAISettings> = {};

  // Validate responseStyle
  if (['concise', 'balanced', 'detailed'].includes(settings.responseStyle as string)) {
    result.responseStyle = settings.responseStyle as UserAISettings['responseStyle'];
  }

  // Validate tone
  if (['professional', 'friendly', 'casual'].includes(settings.tone as string)) {
    result.tone = settings.tone as UserAISettings['tone'];
  }

  // Validate languagePreference
  if (['kinyarwanda', 'english', 'mixed'].includes(settings.languagePreference as string)) {
    result.languagePreference = settings.languagePreference as UserAISettings['languagePreference'];
  }

  // Sanitize strings
  if (typeof settings.aboutMe === 'string') {
    result.aboutMe = settings.aboutMe.slice(0, 200).trim();
  }

  if (typeof settings.profession === 'string') {
    result.profession = settings.profession.slice(0, 50).trim();
  }

  // Validate interests array
  if (Array.isArray(settings.interests)) {
    result.interests = settings.interests
      .filter((i): i is string => typeof i === 'string')
      .slice(0, 5)
      .map(i => i.slice(0, 30).trim());
  }

  // Validate boolean
  if (typeof settings.rememberContext === 'boolean') {
    result.rememberContext = settings.rememberContext;
  }

  return result;
}

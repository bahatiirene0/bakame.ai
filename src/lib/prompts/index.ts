/**
 * Prompts System
 *
 * Centralized prompt management for Bakame AI.
 */

// Base prompts
export { BASE_PROMPT, LEGACY_PROMPT } from './base';

// Specialist prompts
export {
  SPECIALIST_PROMPTS,
  getSpecialistPrompt,
  getSpecialistConfig,
  getAllSpecialists,
  type SpecialistType,
  type SpecialistConfig,
} from './specialists';

// User context
export {
  DEFAULT_AI_SETTINGS,
  buildUserContext,
  sanitizeUserSettings,
  type UserAISettings,
} from './userContext';

// Prompt builder
export {
  buildSystemPrompt,
  isCustomPromptsEnabled,
  estimateTokens,
  getPromptStats,
  type PromptBuildOptions,
} from './builder';

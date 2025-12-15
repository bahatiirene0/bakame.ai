/**
 * Environment Variable Validation and Typing
 *
 * This module validates and types all environment variables used in the Bakame AI application.
 * It uses Zod for runtime validation and provides type-safe access to environment variables.
 *
 * The validation runs at module load time and will fail fast if critical variables are missing.
 * Optional features gracefully disable if their environment variables are not provided.
 *
 * @module lib/env
 */

import { z } from 'zod';

// ===========================================
// Schema Definitions
// ===========================================

/**
 * Core required environment variables
 * These are essential for the application to function
 */
const coreSchema = z.object({
  // OpenAI Configuration (Optional - can use OpenRouter instead)
  OPENAI_API_KEY: z.string().optional(),

  // Supabase Configuration (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

/**
 * Optional Supabase service role key for admin operations
 * and database pooler URL for connection pooling
 */
const supabaseServiceSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_DB_POOLER_URL: z.string().optional(),
});

/**
 * OpenAI/OpenRouter configuration with defaults
 */
const aiModelSchema = z.object({
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().or(z.literal('')),
});

/**
 * N8N Workflow automation configuration
 * Optional but recommended for full feature set
 */
const n8nSchema = z.object({
  N8N_BASE_URL: z.string().url().optional().or(z.literal('')),
  N8N_WEBHOOK_PATH: z.string().optional(),
  N8N_HOST: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().optional(),
  N8N_USER: z.string().optional(),
  N8N_PASSWORD: z.string().optional(),
  N8N_AUTH_TOKEN: z.string().optional(),
});

/**
 * Database configuration (for Docker deployment)
 */
const databaseSchema = z.object({
  DB_PASSWORD: z.string().optional(),
});

/**
 * Redis configuration for rate limiting and caching
 */
const redisSchema = z.object({
  UPSTASH_REDIS_REST_URL: z.string().url().optional().or(z.literal('')),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
});

/**
 * Monitoring and error tracking
 */
const monitoringSchema = z.object({
  SENTRY_DSN: z.string().url().optional().or(z.literal('')),
});

/**
 * Hume AI Voice configuration
 */
const humeSchema = z.object({
  NEXT_PUBLIC_HUME_API_KEY: z.string().optional(),
  NEXT_PUBLIC_HUME_CONFIG_ID: z.string().optional(),
});

/**
 * External API integrations
 * All optional - features disable gracefully if not configured
 */
const externalApisSchema = z.object({
  // Weather API
  OPENWEATHER_API_KEY: z.string().optional(),

  // Currency Exchange
  EXCHANGE_RATE_API_KEY: z.string().optional(),

  // Web Search
  TAVILY_API_KEY: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional(),

  // News API
  NEWS_API_KEY: z.string().optional(),

  // Translation API (falls back to LibreTranslate if not set)
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),

  // Kling AI (Video generation)
  KLING_ACCESS_KEY: z.string().optional(),
  KLING_SECRET_KEY: z.string().optional(),
});

/**
 * Feature flags and configuration
 */
const featureFlagsSchema = z.object({
  ENABLE_CUSTOM_PROMPTS: z.string().optional(),
});

/**
 * Combined schema for all environment variables
 */
const envSchema = coreSchema
  .merge(supabaseServiceSchema)
  .merge(aiModelSchema)
  .merge(n8nSchema)
  .merge(databaseSchema)
  .merge(redisSchema)
  .merge(monitoringSchema)
  .merge(humeSchema)
  .merge(externalApisSchema)
  .merge(featureFlagsSchema);

// ===========================================
// Validation and Export
// ===========================================

/**
 * Validate environment variables at module load time
 * This will throw a clear error if required variables are missing
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors for better readability
      const formattedErrors = error.errors.map((err) => {
        const path = err.path.join('.');
        return `  - ${path}: ${err.message}`;
      });

      console.error('\n❌ Environment variable validation failed:\n');
      console.error(formattedErrors.join('\n'));
      console.error('\n💡 Please check your .env file and ensure all required variables are set.');
      console.error('   See .env.example for reference.\n');

      throw new Error('Invalid environment variables');
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 * Use this instead of process.env for type-safe access
 */
export const env = validateEnv();

/**
 * Type export for use in other modules
 */
export type Env = z.infer<typeof envSchema>;

// ===========================================
// Feature Detection Helpers
// ===========================================

/**
 * Check if Redis is configured
 */
export const hasRedis = !!env.UPSTASH_REDIS_REST_URL && !!env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Check if Sentry monitoring is configured
 */
export const hasSentry = !!env.SENTRY_DSN;

/**
 * Check if N8N workflows are configured
 */
export const hasN8N = !!env.N8N_WEBHOOK_URL || !!env.N8N_BASE_URL;

/**
 * Check if OpenRouter is configured
 */
export const hasOpenRouter = !!env.OPENROUTER_API_KEY;

/**
 * Check if Hume AI Voice is configured
 */
export const hasHumeVoice = !!env.NEXT_PUBLIC_HUME_API_KEY && !!env.NEXT_PUBLIC_HUME_CONFIG_ID;

/**
 * Check if weather API is configured
 */
export const hasWeatherAPI = !!env.OPENWEATHER_API_KEY;

/**
 * Check if currency exchange API is configured
 */
export const hasCurrencyAPI = !!env.EXCHANGE_RATE_API_KEY;

/**
 * Check if web search API is configured
 */
export const hasWebSearch = !!env.TAVILY_API_KEY || !!env.SERPAPI_API_KEY;

/**
 * Check if news API is configured
 */
export const hasNewsAPI = !!env.NEWS_API_KEY;

/**
 * Check if translation API is configured
 */
export const hasTranslationAPI = !!env.GOOGLE_TRANSLATE_API_KEY;

/**
 * Check if Kling AI is configured
 */
export const hasKlingAI = !!env.KLING_ACCESS_KEY && !!env.KLING_SECRET_KEY;

/**
 * Check if running in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if running in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if running in test mode
 */
export const isTest = env.NODE_ENV === 'test';

// ===========================================
// Logging (Development Only)
// ===========================================

if (isDevelopment) {
  console.log('\n✅ Environment variables validated successfully');
  console.log('\n📊 Feature availability:');
  console.log(`  - Redis: ${hasRedis ? '✓' : '✗'}`);
  console.log(`  - Sentry: ${hasSentry ? '✓' : '✗'}`);
  console.log(`  - N8N Workflows: ${hasN8N ? '✓' : '✗'}`);
  console.log(`  - OpenRouter: ${hasOpenRouter ? '✓' : '✗'}`);
  console.log(`  - Hume Voice: ${hasHumeVoice ? '✓' : '✗'}`);
  console.log(`  - Weather API: ${hasWeatherAPI ? '✓' : '✗'}`);
  console.log(`  - Currency API: ${hasCurrencyAPI ? '✓' : '✗'}`);
  console.log(`  - Web Search: ${hasWebSearch ? '✓' : '✗'}`);
  console.log(`  - News API: ${hasNewsAPI ? '✓' : '✗'}`);
  console.log(`  - Translation API: ${hasTranslationAPI ? '✓' : '✗'}`);
  console.log(`  - Kling AI: ${hasKlingAI ? '✓' : '✗'}\n`);
}

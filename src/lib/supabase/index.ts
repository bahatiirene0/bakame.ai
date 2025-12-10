/**
 * Supabase Library Exports
 *
 * Note: Server client is NOT exported here to avoid
 * importing 'next/headers' in client components.
 * Use: import { createServerSupabaseClient } from '@/lib/supabase/server'
 */

export { createClient, getSupabaseClient } from './client';
export * from './types';

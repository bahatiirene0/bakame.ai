'use server';

/**
 * Admin Server Actions
 *
 * Secure server-side actions for admin operations.
 * All actions verify admin role before executing.
 */

import { createServerSupabaseClient, createServerSupabaseAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { UserRole, SubscriptionPlan, SubscriptionStatus, Json, User, Subscription, AdminAuditLog, AdminSetting, UsageLog } from '@/lib/supabase/types';

// Type helper for Supabase query results
type QueryResult<T> = { data: T | null; error: Error | null; count?: number | null };
type QueryResultArray<T> = { data: T[] | null; error: Error | null; count?: number | null };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

// ============================================
// Helper: Verify Admin Access
// ============================================

async function verifyAdmin(): Promise<{ supabase: AnySupabase; userId: string }> {
  // First, verify user is authenticated using regular client (needs cookies)
  const authClient = await createServerSupabaseClient() as AnySupabase;
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized: Not authenticated');
  }

  // Check admin role using regular client (user can read their own profile)
  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(`Database error: ${profileError.message}`);
  }

  if (!profile || profile.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }

  // Return admin client (service role key) for database operations
  // This bypasses RLS for admin queries
  const adminClient = await createServerSupabaseAdminClient() as AnySupabase;

  return { supabase: adminClient, userId: user.id };
}

// ============================================
// Dashboard Stats
// ============================================

export async function getDashboardStats() {
  const { supabase } = await verifyAdmin();

  // Get counts in parallel
  const [
    usersResult,
    sessionsResult,
    messagesResult,
    activeUsersResult,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
  ]);

  return {
    totalUsers: usersResult.count || 0,
    totalSessions: sessionsResult.count || 0,
    totalMessages: messagesResult.count || 0,
    activeToday: activeUsersResult.count || 0,
  };
}

export async function getRecentActivity() {
  const { supabase } = await verifyAdmin();

  // Get recent user signups (last 7 days, aggregated by day)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: recentUsers } = await supabase
    .from('users')
    .select('created_at')
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: true });

  // Aggregate by day
  const dailySignups: Record<string, number> = {};
  recentUsers?.forEach((user: { created_at: string }) => {
    const date = new Date(user.created_at).toLocaleDateString('en-US', {
      weekday: 'short',
    });
    dailySignups[date] = (dailySignups[date] || 0) + 1;
  });

  return {
    dailySignups: Object.entries(dailySignups).map(([label, value]) => ({
      label,
      value,
    })),
  };
}

export async function getToolUsageStats() {
  const { supabase } = await verifyAdmin();

  // Get tool usage from usage_logs
  const { data: toolLogs } = await supabase
    .from('usage_logs')
    .select('action, metadata')
    .eq('action', 'tool_executed')
    .limit(1000);

  // Aggregate by tool name
  const toolCounts: Record<string, number> = {};
  toolLogs?.forEach((log: { metadata: Record<string, unknown> | null }) => {
    const toolName = log.metadata?.tool_name as string;
    if (toolName) {
      toolCounts[toolName] = (toolCounts[toolName] || 0) + 1;
    }
  });

  // Sort by usage and take top 8
  const sortedTools = Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([label, value]) => ({ label, value }));

  return sortedTools;
}

// ============================================
// User Management
// ============================================

export async function getUsers(options?: {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, search, role } = options || {};

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (search) {
    query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  }

  if (role) {
    query = query.eq('role', role);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

export async function getUserById(userId: string) {
  const { supabase } = await verifyAdmin();

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!user) throw new Error('User not found');

  // Get user stats (counts only - no content)
  // First get session IDs for this user, then count messages in those sessions
  const { data: userSessions } = await supabase
    .from('chat_sessions')
    .select('id')
    .eq('user_id', userId);

  const sessionIds = (userSessions || []).map((s: { id: string }) => s.id);

  const [sessionsResult, messagesResult, subscriptionResult] = await Promise.all([
    supabase
      .from('chat_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId),
    // Count messages in user's sessions
    sessionIds.length > 0
      ? supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .in('session_id', sessionIds)
      : Promise.resolve({ count: 0 }),
    // Use maybeSingle since user might not have a subscription
    supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  return {
    ...user,
    stats: {
      totalSessions: sessionsResult.count || 0,
      totalMessages: messagesResult.count || 0,
    },
    subscription: subscriptionResult.data,
  };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const { supabase, userId: adminId } = await verifyAdmin();

  // Prevent admin from demoting themselves
  if (userId === adminId && role !== 'admin') {
    throw new Error('Cannot change your own admin role');
  }

  const { error } = await supabase
    .from('users')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;

  // Log the action
  await logAdminAction(supabase, adminId, 'update_user_role', 'user', userId, {
    new_role: role,
  });

  revalidatePath('/admin/users');
  return { success: true };
}

export async function suspendUser(userId: string, suspended: boolean) {
  const { supabase, userId: adminId } = await verifyAdmin();

  // Prevent admin from suspending themselves
  if (userId === adminId) {
    throw new Error('Cannot suspend your own account');
  }

  const { error } = await supabase
    .from('users')
    .update({
      metadata: { suspended, suspended_at: suspended ? new Date().toISOString() : null },
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(supabase, adminId, suspended ? 'suspend_user' : 'unsuspend_user', 'user', userId);

  revalidatePath('/admin/users');
  return { success: true };
}

export async function deleteUser(userId: string) {
  const { supabase, userId: adminId } = await verifyAdmin();

  if (userId === adminId) {
    throw new Error('Cannot delete your own account');
  }

  // Delete from users table (cascades to related data)
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) throw error;

  await logAdminAction(supabase, adminId, 'delete_user', 'user', userId);

  revalidatePath('/admin/users');
  return { success: true };
}

// ============================================
// Subscription Management
// ============================================

export async function getSubscriptions(options?: {
  page?: number;
  pageSize?: number;
  status?: SubscriptionStatus;
  plan?: SubscriptionPlan;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, status, plan } = options || {};

  let query = supabase
    .from('subscriptions')
    .select('*, users(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (status) query = query.eq('status', status);
  if (plan) query = query.eq('plan', plan);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    subscriptions: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

export async function updateSubscription(
  subscriptionId: string,
  updates: {
    plan?: SubscriptionPlan;
    status?: SubscriptionStatus;
    current_period_end?: string;
  }
) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', subscriptionId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'update_subscription', 'subscription', subscriptionId, {
    updates,
  });

  revalidatePath('/admin/subscriptions');
  return data;
}

// ============================================
// Audit Logs
// ============================================

async function logAdminAction(
  supabase: AnySupabase,
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details: Record<string, unknown> = {}
) {
  // Get request headers for IP and user agent
  const headersList = await headers();
  const ipAddress = headersList.get('x-forwarded-for')?.split(',')[0] || null;
  const userAgent = headersList.get('user-agent') || null;

  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    details: details as Json,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

export async function getAuditLogs(options?: {
  page?: number;
  pageSize?: number;
  action?: string;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 50, action } = options || {};

  let query = supabase
    .from('admin_audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (action) {
    query = query.eq('action', action);
  }

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    logs: data || [],
    total: count || 0,
    page,
    pageSize,
  };
}

// ============================================
// Settings Management
// ============================================

export async function getSettings(category?: string) {
  const { supabase } = await verifyAdmin();

  let query = supabase
    .from('admin_settings')
    .select('*')
    .order('category')
    .order('key');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getSetting(key: string) {
  const { supabase } = await verifyAdmin();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

export async function updateSetting(key: string, value: unknown) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('admin_settings')
    .update({
      value: { value } as Json,
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq('key', key)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'update_setting', 'setting', undefined, {
    setting_key: key,
  });

  revalidatePath('/admin/settings');
  return data;
}

export async function updateSettings(settings: Array<{ key: string; value: unknown }>) {
  const { supabase, userId } = await verifyAdmin();

  // Update all settings in parallel
  const results = await Promise.all(
    settings.map(({ key, value }) =>
      supabase
        .from('admin_settings')
        .update({
          value: { value } as Json,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key)
        .select()
        .single()
    )
  );

  const errors = results.filter((r) => r.error);
  if (errors.length > 0) {
    throw new Error(`Failed to update ${errors.length} settings`);
  }

  await logAdminAction(supabase, userId, 'update_settings', 'setting', undefined, {
    updated_keys: settings.map((s) => s.key),
  });

  revalidatePath('/admin/settings');
  return results.map((r) => r.data);
}

// ============================================
// System Health
// ============================================

export async function getSystemHealth() {
  const { supabase } = await verifyAdmin();

  // Check database connectivity
  const dbStart = Date.now();
  const { error: dbError } = await supabase.from('users').select('id').limit(1);
  const dbLatency = Date.now() - dbStart;

  // Get table sizes (approximate row counts)
  const [users, sessions, messages, agents] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('chat_sessions').select('id', { count: 'exact', head: true }),
    supabase.from('messages').select('id', { count: 'exact', head: true }),
    supabase.from('agents').select('id', { count: 'exact', head: true }),
  ]);

  return {
    database: {
      status: dbError ? 'error' : 'healthy',
      latency: dbLatency,
      error: dbError?.message,
    },
    tables: {
      users: users.count || 0,
      chat_sessions: sessions.count || 0,
      messages: messages.count || 0,
      agents: agents.count || 0,
    },
    timestamp: new Date().toISOString(),
  };
}

// ============================================
// System Prompts Management
// ============================================

export async function getSystemPrompts() {
  const { supabase } = await verifyAdmin();

  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('category', 'prompts')
    .order('key');

  if (error) throw error;
  return data || [];
}

export async function updateSystemPrompt(
  key: string,
  promptData: { value: string; isActive: boolean }
) {
  const { supabase, userId } = await verifyAdmin();

  // Check if prompt exists
  const { data: existing } = await supabase
    .from('admin_settings')
    .select('id, value')
    .eq('key', key)
    .single();

  // Store previous version in history (via audit log)
  if (existing) {
    await logAdminAction(supabase, userId, 'update_prompt', 'prompt', key, {
      previous_value: existing.value,
      new_value: promptData,
    });
  }

  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('admin_settings')
      .update({
        value: promptData as unknown as Json,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('key', key)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/prompts');
    return data;
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('admin_settings')
      .insert({
        key,
        value: promptData as unknown as Json,
        category: 'prompts',
        description: `System prompt: ${key}`,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/prompts');
    return data;
  }
}

export async function getPromptHistory(key: string) {
  const { supabase } = await verifyAdmin();

  // Get history from audit logs
  const { data, error } = await supabase
    .from('admin_audit_logs')
    .select('id, details, created_at, admin_id')
    .eq('action', 'update_prompt')
    .eq('target_id', key)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  // Transform to history format
  return (data || []).map((log: { id: string; details: unknown; created_at: string; admin_id: string }) => ({
    id: log.id,
    value: (log.details as { previous_value?: { value?: string } })?.previous_value?.value || '',
    updated_by: log.admin_id,
    updated_at: log.created_at,
  }));
}

// ============================================
// Get Active System Prompt (for Chat API)
// ============================================

export async function getActiveSystemPrompt(): Promise<string | null> {
  // This function can be called without admin auth
  const supabase = await createServerSupabaseClient() as AnySupabase;

  const { data, error } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'system_prompt_main')
    .eq('category', 'prompts')
    .single();

  if (error || !data) return null;

  const promptData = data.value as { value?: string; isActive?: boolean };
  if (!promptData.isActive) return null;

  return promptData.value || null;
}

// ============================================
// Knowledge Base Management
// ============================================

export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  language: string;
  source: string | null;
  priority: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
  chunk_count?: number;
}

export interface KnowledgeQA {
  id: string;
  document_id: string | null;
  question: string;
  answer: string;
  category: string;
  language: string;
  source: string | null;
  is_active: boolean;
  created_at: string;
}

/**
 * Get all knowledge documents with pagination
 */
export async function getKnowledgeDocuments(options?: {
  page?: number;
  pageSize?: number;
  category?: string;
  status?: string;
  search?: string;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, category, status, search } = options || {};

  let query = supabase
    .from('knowledge_documents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) query = query.eq('category', category);
  if (status) query = query.eq('status', status);
  if (search) query = query.ilike('title', `%${search}%`);

  const { data, count, error } = await query;

  if (error) throw error;

  // Get chunk counts for each document
  const documentsWithChunks = await Promise.all(
    (data || []).map(async (doc: KnowledgeDocument) => {
      const { count: chunkCount } = await supabase
        .from('knowledge_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('document_id', doc.id);

      return { ...doc, chunk_count: chunkCount || 0 };
    })
  );

  return {
    documents: documentsWithChunks,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeStats() {
  const { supabase } = await verifyAdmin();

  const [
    documentsResult,
    chunksResult,
    qaResult,
    categoriesResult,
  ] = await Promise.all([
    supabase.from('knowledge_documents').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_chunks').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_qa').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_documents').select('category').eq('is_active', true),
  ]);

  // Count unique categories
  const categories = new Set((categoriesResult.data || []).map((d: { category: string }) => d.category));

  return {
    totalDocuments: documentsResult.count || 0,
    totalChunks: chunksResult.count || 0,
    totalQA: qaResult.count || 0,
    totalCategories: categories.size,
  };
}

/**
 * Create a new knowledge document
 */
export async function createKnowledgeDocument(document: {
  title: string;
  content: string;
  category: string;
  language?: string;
  source?: string;
  priority?: number;
}) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('knowledge_documents')
    .insert({
      title: document.title,
      content: document.content,
      category: document.category,
      language: document.language || 'en',
      source: document.source || null,
      priority: document.priority || 1,
      status: 'pending',
      is_active: false,
      metadata: { created_by: userId },
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'create_knowledge_document', 'knowledge', data.id, {
    title: document.title,
    category: document.category,
  });

  revalidatePath('/admin/knowledge');
  return data;
}

/**
 * Update a knowledge document
 */
export async function updateKnowledgeDocument(
  documentId: string,
  updates: Partial<{
    title: string;
    content: string;
    category: string;
    language: string;
    source: string | null;
    priority: number;
    is_active: boolean;
    status: string;
  }>
) {
  const { supabase, userId } = await verifyAdmin();

  // If content is updated, set status back to pending for re-processing
  if (updates.content) {
    updates.status = 'pending';
  }

  const { data, error } = await supabase
    .from('knowledge_documents')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', documentId)
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'update_knowledge_document', 'knowledge', documentId, {
    updates: Object.keys(updates),
  });

  revalidatePath('/admin/knowledge');
  return data;
}

/**
 * Delete a knowledge document
 */
export async function deleteKnowledgeDocument(documentId: string) {
  const { supabase, userId } = await verifyAdmin();

  // Get document info for logging
  const { data: doc } = await supabase
    .from('knowledge_documents')
    .select('title')
    .eq('id', documentId)
    .single();

  // Delete document (chunks will cascade)
  const { error } = await supabase
    .from('knowledge_documents')
    .delete()
    .eq('id', documentId);

  if (error) throw error;

  await logAdminAction(supabase, userId, 'delete_knowledge_document', 'knowledge', documentId, {
    title: doc?.title,
  });

  revalidatePath('/admin/knowledge');
  return { success: true };
}

/**
 * Process a knowledge document (generate embeddings)
 */
export async function processKnowledgeDocument(documentId: string) {
  const { supabase, userId } = await verifyAdmin();

  // Call the processing API
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/admin/knowledge/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Processing failed');
    }

    await logAdminAction(supabase, userId, 'process_knowledge_document', 'knowledge', documentId, {
      chunksCreated: result.chunksCreated,
      tokensUsed: result.tokensUsed,
    });

    revalidatePath('/admin/knowledge');
    return {
      success: true,
      message: `Document processed: ${result.chunksCreated} chunks created`,
      ...result,
    };
  } catch (error) {
    // If API call fails, just set status to processing (background job will handle it)
    await supabase
      .from('knowledge_documents')
      .update({ status: 'processing' })
      .eq('id', documentId);

    await logAdminAction(supabase, userId, 'process_knowledge_document', 'knowledge', documentId);

    revalidatePath('/admin/knowledge');
    return { success: true, message: 'Document queued for processing' };
  }
}

/**
 * Get Q&A pairs with pagination
 */
export async function getKnowledgeQA(options?: {
  page?: number;
  pageSize?: number;
  category?: string;
  search?: string;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, category, search } = options || {};

  let query = supabase
    .from('knowledge_qa')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (category) query = query.eq('category', category);
  if (search) query = query.or(`question.ilike.%${search}%,answer.ilike.%${search}%`);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    qa: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Create a Q&A pair
 */
export async function createKnowledgeQA(qa: {
  question: string;
  answer: string;
  category: string;
  language?: string;
  source?: string;
}) {
  const { supabase, userId } = await verifyAdmin();

  const { data, error } = await supabase
    .from('knowledge_qa')
    .insert({
      question: qa.question,
      answer: qa.answer,
      category: qa.category,
      language: qa.language || 'en',
      source: qa.source || null,
      is_active: true,
      metadata: { created_by: userId },
    })
    .select()
    .single();

  if (error) throw error;

  await logAdminAction(supabase, userId, 'create_knowledge_qa', 'knowledge_qa', data.id);

  revalidatePath('/admin/knowledge');
  return data;
}

/**
 * Delete a Q&A pair
 */
export async function deleteKnowledgeQA(qaId: string) {
  const { supabase, userId } = await verifyAdmin();

  const { error } = await supabase
    .from('knowledge_qa')
    .delete()
    .eq('id', qaId);

  if (error) throw error;

  await logAdminAction(supabase, userId, 'delete_knowledge_qa', 'knowledge_qa', qaId);

  revalidatePath('/admin/knowledge');
  return { success: true };
}

/**
 * Get knowledge categories
 */
export async function getKnowledgeCategories() {
  const { supabase } = await verifyAdmin();

  const { data: docs } = await supabase
    .from('knowledge_documents')
    .select('category');

  const { data: qa } = await supabase
    .from('knowledge_qa')
    .select('category');

  // Combine and count
  const categories: Record<string, { documents: number; qa: number }> = {};

  (docs || []).forEach((d: { category: string }) => {
    if (!categories[d.category]) {
      categories[d.category] = { documents: 0, qa: 0 };
    }
    categories[d.category].documents++;
  });

  (qa || []).forEach((q: { category: string }) => {
    if (!categories[q.category]) {
      categories[q.category] = { documents: 0, qa: 0 };
    }
    categories[q.category].qa++;
  });

  return Object.entries(categories).map(([name, counts]) => ({
    name,
    ...counts,
    total: counts.documents + counts.qa,
  }));
}

// ============================================
// User Memories Management
// ============================================

/**
 * Get user memories (admin view)
 */
export async function getUserMemories(options?: {
  page?: number;
  pageSize?: number;
  userId?: string;
  memoryType?: string;
}) {
  const { supabase } = await verifyAdmin();
  const { page = 1, pageSize = 20, userId, memoryType } = options || {};

  let query = supabase
    .from('user_memories')
    .select('*, users(name, email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (userId) query = query.eq('user_id', userId);
  if (memoryType) query = query.eq('memory_type', memoryType);

  const { data, count, error } = await query;

  if (error) throw error;

  return {
    memories: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  };
}

/**
 * Get memory statistics
 */
export async function getMemoryStats() {
  const { supabase } = await verifyAdmin();

  const [
    totalResult,
    usersWithMemoriesResult,
    byTypeResult,
  ] = await Promise.all([
    supabase.from('user_memories').select('id', { count: 'exact', head: true }),
    supabase.from('user_memories').select('user_id'),
    supabase.from('user_memories').select('memory_type'),
  ]);

  // Count unique users
  const uniqueUsers = new Set((usersWithMemoriesResult.data || []).map((m: { user_id: string }) => m.user_id));

  // Count by type
  const byType: Record<string, number> = {};
  (byTypeResult.data || []).forEach((m: { memory_type: string }) => {
    byType[m.memory_type] = (byType[m.memory_type] || 0) + 1;
  });

  return {
    totalMemories: totalResult.count || 0,
    usersWithMemories: uniqueUsers.size,
    byType,
  };
}

/**
 * Delete a user memory (admin action)
 */
export async function deleteUserMemory(memoryId: string) {
  const { supabase, userId } = await verifyAdmin();

  const { error } = await supabase
    .from('user_memories')
    .delete()
    .eq('id', memoryId);

  if (error) throw error;

  await logAdminAction(supabase, userId, 'delete_user_memory', 'memory', memoryId);

  revalidatePath('/admin/memories');
  return { success: true };
}

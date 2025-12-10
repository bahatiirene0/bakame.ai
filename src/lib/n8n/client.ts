/**
 * n8n Workflow Client
 *
 * Handles communication between Bakame and n8n workflow engine.
 * Supports webhook calls, response handling, and error management.
 */

// n8n Configuration
const N8N_BASE_URL = process.env.N8N_WEBHOOK_URL || 'https://n8n.bakame.ai';
const N8N_AUTH_TOKEN = process.env.N8N_AUTH_TOKEN || '';

/**
 * Workflow response types
 */
export interface WorkflowResponse {
  success: boolean;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'data' | 'error';
  data: unknown;
  message?: string;
  metadata?: {
    workflowId: string;
    processingTime: number;
    cost?: number;
    model?: string;
  };
}

/**
 * Workflow input context
 */
export interface WorkflowInput {
  query: string;
  parameters?: Record<string, unknown>;
  context?: {
    sessionId?: string;
    userId?: string;
    language?: 'rw' | 'en';
    previousMessages?: Array<{ role: string; content: string }>;
  };
}

/**
 * Call an n8n workflow via webhook
 */
export async function callWorkflow(
  workflowId: string,
  input: WorkflowInput,
  timeoutMs: number = 30000
): Promise<WorkflowResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${N8N_BASE_URL}/webhook/${workflowId}`;

    console.log(`[N8N] Calling workflow: ${workflowId}`);
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bakame-Auth': N8N_AUTH_TOKEN,
      },
      body: JSON.stringify({
        ...input,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[N8N] Workflow error: ${response.status} - ${errorText}`);

      return {
        success: false,
        type: 'error',
        data: null,
        message: `Workflow failed: ${response.status}`,
        metadata: {
          workflowId,
          processingTime: Date.now() - startTime,
        },
      };
    }

    const result = await response.json();
    const processingTime = Date.now() - startTime;

    console.log(`[N8N] Workflow completed in ${processingTime}ms`);

    return {
      success: true,
      type: result.type || 'text',
      data: result.data,
      message: result.message,
      metadata: {
        workflowId,
        processingTime,
        cost: result.cost,
        model: result.model,
      },
    };
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[N8N] Workflow timeout: ${workflowId}`);
      return {
        success: false,
        type: 'error',
        data: null,
        message: 'Workflow timeout - please try again',
        metadata: {
          workflowId,
          processingTime: timeoutMs,
        },
      };
    }

    console.error(`[N8N] Workflow error:`, error);
    return {
      success: false,
      type: 'error',
      data: null,
      message: error instanceof Error ? error.message : 'Unknown error',
      metadata: {
        workflowId,
        processingTime: 0,
      },
    };
  }
}

/**
 * Check if n8n is available
 */
export async function checkN8nHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${N8N_BASE_URL}/healthz`, {
      method: 'GET',
      headers: {
        'X-Bakame-Auth': N8N_AUTH_TOKEN,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Format workflow response for chat display
 */
export function formatWorkflowResponse(response: WorkflowResponse): string {
  if (!response.success) {
    return response.message || 'Habaye ikibazo. Ongera ugerageze.';
  }

  switch (response.type) {
    case 'text':
      return typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data, null, 2);

    case 'image':
      const imageData = response.data as { url: string; caption?: string };
      return `![Generated Image](${imageData.url})${imageData.caption ? `\n\n${imageData.caption}` : ''}`;

    case 'video':
      const videoData = response.data as { url: string; caption?: string };
      return `🎬 [Video](${videoData.url})${videoData.caption ? `\n\n${videoData.caption}` : ''}`;

    case 'audio':
      const audioData = response.data as { url: string; caption?: string };
      return `🎵 [Audio](${audioData.url})${audioData.caption ? `\n\n${audioData.caption}` : ''}`;

    case 'file':
      const fileData = response.data as { url: string; filename: string };
      return `📎 [${fileData.filename}](${fileData.url})`;

    case 'data':
      return '```json\n' + JSON.stringify(response.data, null, 2) + '\n```';

    default:
      return response.message || 'Workflow completed.';
  }
}

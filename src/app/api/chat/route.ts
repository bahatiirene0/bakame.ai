/**
 * Chat API Route with Streaming & Tool Support
 *
 * PRODUCTION-READY FEATURES:
 * - Redis-based rate limiting for distributed systems
 * - Structured logging with request context tracking
 * - Sentry error tracking with breadcrumbs
 * - Environment variable validation
 * - Unique request IDs for traceability
 *
 * SUPPORTS MULTIPLE PROVIDERS:
 * - OpenRouter (default): Access to GPT-4o-mini, Claude, Llama, etc.
 * - OpenAI Direct: Use OPENAI_API_KEY instead of OPENROUTER_API_KEY
 *
 * SMART TOOL ROUTING:
 * - LLM intelligently decides which tools to use
 * - n8n workflows are exposed as tools (tax info, gov services, etc.)
 * - No manual keyword matching - AI figures it out
 * - Always streams responses
 *
 * MULTIMODAL SUPPORT:
 * - Images: Sent to Vision API for analysis
 * - Documents: Text extracted and appended to message
 *
 * SECURITY:
 * - Supabase authentication check (or guest mode)
 * - Distributed rate limiting via Redis
 * - Comprehensive error tracking
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionContentPart } from 'openai/resources/chat/completions';
import { randomUUID } from 'crypto';
import { BAKAME_TOOLS, executeTool } from '@/lib/tools';
import { buildSystemPrompt, SpecialistType, UserAISettings } from '@/lib/prompts';
import { getDynamicSystemPrompt } from '@/lib/prompts/dynamic';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Language } from '@/store/languageStore';
import { checkRateLimit } from '@/lib/redis';
import { logger } from '@/lib/logger';
import { captureException, addBreadcrumb, setUser } from '@/lib/sentry';
import { env, hasOpenRouter, isDevelopment } from '@/lib/env';
import { FileAttachment } from '@/types';
// RAG and Memory imports
import { retrieveKnowledge, formatForSystemPrompt } from '@/lib/rag';
import { getMemoryContext, extractMemories, storeMemories } from '@/lib/memory';

// Lazy-initialized OpenAI client (created on first request, not at build time)
let _openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!_openaiClient) {
    const useOpenRouter = hasOpenRouter;
    const apiKey = env.OPENROUTER_API_KEY || env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('No AI API key configured. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
    }

    _openaiClient = new OpenAI({
      apiKey: apiKey,
      baseURL: useOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
      timeout: 60000,
      maxRetries: 2,
      defaultHeaders: useOpenRouter ? {
        'HTTP-Referer': env.NEXT_PUBLIC_APP_URL || 'https://bakame.ai',
        'X-Title': 'Bakame AI',
      } : undefined,
    });

    logger.info('Chat API client initialized', {
      provider: useOpenRouter ? 'OpenRouter' : 'OpenAI Direct',
    });
  }
  return _openaiClient;
}

// Default model - OpenRouter format: provider/model
const MODEL = env.OPENROUTER_MODEL || env.OPENAI_MODEL || 'openai/gpt-4o-mini';

/**
 * POST handler for chat API
 * Handles streaming chat completions with tool support, multimodal input, and rate limiting
 */
export async function POST(request: NextRequest) {
  // Generate unique request ID for traceability
  const requestId = randomUUID();

  try {
    // Extract user IP for rate limiting
    const forwarded = request.headers.get('x-forwarded-for');
    const userIp = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

    // Check authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Create request-scoped logger with context
    const reqLogger = logger.withContext({
      requestId,
      userId: user?.id,
      userEmail: user?.email,
      ip: userIp,
    });

    // Set Sentry user context if authenticated
    if (user) {
      setUser({
        id: user.id,
        email: user.email,
      });
    }

    reqLogger.info('Chat request received', {
      authenticated: !!user,
    });

    // Parse request body
    const body = await request.json();
    const {
      messages,
      useTools = true,
      specialistId = 'default',
      userSettings = null,
      userLocation = null,
      isGuest = false,
      attachments = [],
      uiLanguage = 'rw',
    } = body as {
      messages: Array<{ role: string; content: string }>;
      useTools?: boolean;
      specialistId?: SpecialistType;
      userSettings?: Partial<UserAISettings> | null;
      userLocation?: { latitude: number; longitude: number } | null;
      isGuest?: boolean;
      attachments?: FileAttachment[];
      uiLanguage?: Language;
    };

    // Add breadcrumb for request details
    addBreadcrumb({
      message: 'Chat request parsed',
      category: 'chat',
      data: {
        messageCount: messages.length,
        useTools,
        specialistId,
        hasAttachments: attachments.length > 0,
        uiLanguage,
      },
    });

    // Require authentication for non-guest users
    if (!user && !isGuest) {
      reqLogger.warn('Authentication required for non-guest access');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting - use Redis-based distributed rate limiter
    const rateLimitResult = await checkRateLimit('chat', userIp, !!user);

    if (!rateLimitResult.allowed) {
      reqLogger.warn('Rate limit exceeded', {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        retryAfter: rateLimitResult.retryAfter,
      });

      addBreadcrumb({
        message: 'Rate limit exceeded',
        category: 'security',
        level: 'warning',
        data: {
          ip: userIp,
          authenticated: !!user,
        },
      });

      const resetTime = new Date(rateLimitResult.resetTime).toISOString();
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before trying again.',
          resetTime,
          remaining: 0,
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': user ? '100' : '30',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime,
            'Retry-After': String(rateLimitResult.retryAfter || 60),
          }
        }
      );
    }

    reqLogger.debug('Rate limit check passed', {
      remaining: rateLimitResult.remaining,
    });

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      reqLogger.warn('Invalid request: messages array missing or empty');
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Fetch custom prompt from admin dashboard (if configured)
    const customBasePrompt = await getDynamicSystemPrompt();

    // Build dynamic system prompt
    let systemPrompt = buildSystemPrompt({
      specialistId,
      userSettings,
      userLocation,
      uiLanguage,
      customBasePrompt, // Use admin-configured prompt if available
    });

    // Get the last user message for context
    const lastUserMessage = messages.filter((m: { role: string }) => m.role === 'user').pop();
    const userQuery = lastUserMessage?.content || '';

    // ===== RAG KNOWLEDGE RETRIEVAL =====
    // Retrieve relevant knowledge from our knowledge base
    // This takes PRIORITY over LLM's base knowledge
    let ragContext = '';
    let shouldSuggestWebSearch = false;

    try {
      const ragResult = await retrieveKnowledge(userQuery, {
        userLanguage: uiLanguage === 'rw' ? 'rw' : 'en',
        maxContextTokens: 2000,
        includeSources: true,
      });

      if (ragResult.hasKnowledge) {
        ragContext = formatForSystemPrompt(ragResult, uiLanguage === 'rw' ? 'rw' : 'en');
        reqLogger.info('RAG knowledge retrieved', {
          confidence: ragResult.confidence,
          sourceCount: ragResult.sources.length,
          fromCache: ragResult.raw.fromCache,
        });
      } else if (ragResult.fallbackSuggestion === 'web_search') {
        // Knowledge not found - consider enabling web search
        shouldSuggestWebSearch = true;
        reqLogger.debug('RAG suggests web search fallback');
      }
    } catch (error) {
      reqLogger.warn('RAG retrieval failed, continuing without knowledge context', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // ===== USER MEMORY RETRIEVAL =====
    // Retrieve personalized context from user's memory (authenticated users only)
    let memoryContext = '';

    if (user?.id) {
      try {
        const memoryResult = await getMemoryContext(
          user.id,
          userQuery,
          uiLanguage === 'rw' ? 'rw' : 'en'
        );

        if (memoryResult.hasMemories) {
          memoryContext = memoryResult.context;
          reqLogger.info('User memory context retrieved', {
            memoryCount: memoryResult.count,
          });
        }
      } catch (error) {
        reqLogger.warn('Memory retrieval failed, continuing without memory context', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // ===== AUGMENT SYSTEM PROMPT =====
    // Add RAG knowledge and Memory context to system prompt
    // RAG knowledge is highest priority, then user memory
    if (ragContext) {
      systemPrompt += '\n\n' + ragContext;
    }
    if (memoryContext) {
      systemPrompt += '\n\n' + memoryContext;
    }

    reqLogger.debug('System prompt built', {
      specialistId,
      hasUserSettings: !!userSettings,
      hasUserLocation: !!userLocation,
      uiLanguage,
      usingCustomPrompt: !!customBasePrompt,
      hasRagContext: !!ragContext,
      hasMemoryContext: !!memoryContext,
      suggestWebSearch: shouldSuggestWebSearch,
    });

    /**
     * Build multimodal content for messages with attachments
     * Handles images (Vision API) and documents (extracted text)
     */
    const buildMultimodalContent = (
      text: string,
      files: FileAttachment[]
    ): string | ChatCompletionContentPart[] => {
      if (files.length === 0) {
        return text;
      }

      const contentParts: ChatCompletionContentPart[] = [];

      // Add text content first
      if (text) {
        contentParts.push({ type: 'text', text });
      }

      // Add file contents
      for (const file of files) {
        if (file.type === 'image') {
          // Images: Send to Vision API
          contentParts.push({
            type: 'image_url',
            image_url: {
              url: file.url,
              detail: 'auto',
            },
          });
          reqLogger.debug('Added image to request', {
            fileName: file.name,
            fileSize: file.size,
          });
        } else if (file.type === 'document' && file.extractedText) {
          // Documents: Add extracted text
          contentParts.push({
            type: 'text',
            text: `\n\n[📄 Document: ${file.name}]\n${file.extractedText}`,
          });
          reqLogger.debug('Added document text to request', {
            fileName: file.name,
            textLength: file.extractedText.length,
          });
        }
      }

      return contentParts;
    };

    // Prepare messages - handle multimodal for last user message
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const isLastUserMessage = i === messages.length - 1 && msg.role === 'user';

      if (isLastUserMessage && attachments.length > 0) {
        // Build multimodal content for the last user message with attachments
        apiMessages.push({
          role: 'user',
          content: buildMultimodalContent(msg.content, attachments),
        });
      } else {
        apiMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Create streaming response with tools
    addBreadcrumb({
      message: 'Creating OpenAI stream',
      category: 'chat',
      data: {
        model: MODEL,
        messageCount: apiMessages.length,
        useTools,
      },
    });

    const openai = getOpenAIClient();
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      tools: useTools ? BAKAME_TOOLS : undefined,
      tool_choice: useTools ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    reqLogger.info('OpenAI stream created', {
      model: MODEL,
      toolsEnabled: useTools,
    });

    // Encode and stream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          const toolCalls: Array<{
            id: string;
            function: { name: string; arguments: string };
          }> = [];
          let currentToolCallId = '';
          let currentFunctionName = '';
          let currentArguments = '';

          // Process stream chunks
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;

            // Handle regular content
            if (delta?.content) {
              const data = JSON.stringify({ content: delta.content });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }

            // Handle tool calls (accumulate)
            if (delta?.tool_calls) {
              for (const toolCall of delta.tool_calls) {
                if (toolCall.id) {
                  // New tool call starting
                  if (currentToolCallId && currentFunctionName) {
                    toolCalls.push({
                      id: currentToolCallId,
                      function: {
                        name: currentFunctionName,
                        arguments: currentArguments,
                      },
                    });
                  }
                  currentToolCallId = toolCall.id;
                  currentFunctionName = toolCall.function?.name || '';
                  currentArguments = toolCall.function?.arguments || '';
                } else {
                  // Continuation of current tool call
                  if (toolCall.function?.name) {
                    currentFunctionName += toolCall.function.name;
                  }
                  if (toolCall.function?.arguments) {
                    currentArguments += toolCall.function.arguments;
                  }
                }
              }
            }
          }

          // Finalize last tool call if exists
          if (currentToolCallId && currentFunctionName) {
            toolCalls.push({
              id: currentToolCallId,
              function: {
                name: currentFunctionName,
                arguments: currentArguments,
              },
            });
          }

          // If we have tool calls, execute them and get final response
          if (toolCalls.length > 0) {
            const toolNames = toolCalls.map(tc => tc.function.name);
            reqLogger.info('AI selected tools for execution', { tools: toolNames });

            addBreadcrumb({
              message: 'Executing AI-selected tools',
              category: 'tools',
              data: { tools: toolNames },
            });
            // Send tool info for loading indicator (first tool only for simplicity)
            const firstToolName = toolCalls[0]?.function?.name || 'default';
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ toolCall: firstToolName })}\n\n`)
            );

            // Execute tools
            const toolResults = await Promise.all(
              toolCalls.map(async (tc) => {
                let args: Record<string, unknown> = {};
                try {
                  args = JSON.parse(tc.function.arguments);
                } catch (error) {
                  reqLogger.error('Failed to parse tool arguments', {
                    toolName: tc.function.name,
                    arguments: tc.function.arguments,
                    error: error instanceof Error ? error.message : String(error),
                  });
                }

                // For maps/directions tool, inject user location if available
                if (tc.function.name === 'get_location_and_directions') {
                  if (userLocation) {
                    args.user_latitude = userLocation.latitude;
                    args.user_longitude = userLocation.longitude;
                    reqLogger.debug('Injected user location for maps tool', {
                      latitude: userLocation.latitude,
                      longitude: userLocation.longitude,
                    });
                  } else if (userIp) {
                    args.user_ip = userIp;
                    reqLogger.debug('Using IP fallback for maps tool', { ip: userIp });
                  }
                }

                reqLogger.info('Executing tool', {
                  toolName: tc.function.name,
                  hasArgs: Object.keys(args).length > 0,
                });

                const result = await executeTool(tc.function.name, args);

                reqLogger.info('Tool execution completed', {
                  toolName: tc.function.name,
                  success: result.success,
                });

                // Special handling for image generation - send image data to client
                if (tc.function.name === 'generate_image' && result.success && result.data) {
                  const imageData = result.data as { image_url: string; prompt: string; width: number; height: number };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      generatedImage: {
                        url: imageData.image_url,
                        prompt: imageData.prompt,
                        width: imageData.width,
                        height: imageData.height,
                      }
                    })}\n\n`)
                  );
                }

                // Special handling for video generation - send video data to client
                if (tc.function.name === 'generate_video' && result.success && result.data) {
                  const videoData = result.data as { video_url: string; prompt: string; duration: number; aspect_ratio: string };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      generatedVideo: {
                        url: videoData.video_url,
                        prompt: videoData.prompt,
                        duration: videoData.duration,
                        aspectRatio: videoData.aspect_ratio,
                      }
                    })}\n\n`)
                  );
                }

                // Special handling for code execution - send code output to client
                if (tc.function.name === 'run_code' && result.success && result.data) {
                  const codeData = result.data as {
                    code: string;
                    language: string;
                    version?: string;
                    output: string;
                    error?: string | null;
                    exitCode?: number;
                  };
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      codeOutput: {
                        code: codeData.code,
                        language: codeData.language,
                        version: codeData.version,
                        output: codeData.output,
                        error: codeData.error,
                        exitCode: codeData.exitCode,
                      }
                    })}\n\n`)
                  );
                }

                return {
                  tool_call_id: tc.id,
                  role: 'tool' as const,
                  content: JSON.stringify(result),
                };
              })
            );

            // Build messages with tool results
            const messagesWithTools: ChatCompletionMessageParam[] = [
              ...apiMessages,
              {
                role: 'assistant',
                content: null,
                tool_calls: toolCalls.map((tc) => ({
                  id: tc.id,
                  type: 'function' as const,
                  function: tc.function,
                })),
              },
              ...toolResults,
            ];

            // Get final response (streaming)
            const finalStream = await getOpenAIClient().chat.completions.create({
              model: MODEL,
              messages: messagesWithTools,
              temperature: 0.7,
              max_tokens: 2048,
              stream: true,
            });

            for await (const chunk of finalStream) {
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                const data = JSON.stringify({ content });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
          }

          reqLogger.info('Stream completed successfully');
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

          // ===== BACKGROUND MEMORY EXTRACTION =====
          // Extract memories from this conversation (non-blocking)
          // Only for authenticated users
          // Extract memories from conversation (uses OpenRouter for embeddings now)
          if (user?.id && userQuery) {
            // Run in background - don't await
            (async () => {
              try {
                const userMessages = messages
                  .filter((m: { role: string }) => m.role === 'user')
                  .map((m: { content: string }) => m.content);
                const assistantMessages = messages
                  .filter((m: { role: string }) => m.role === 'assistant')
                  .map((m: { content: string }) => m.content);

                // Only extract if we have enough conversation context
                if (userMessages.length > 0) {
                  const extractionResult = await extractMemories(
                    userMessages,
                    assistantMessages
                  );

                  if (extractionResult.success && extractionResult.memories.length > 0) {
                    const storedIds = await storeMemories(user.id, extractionResult.memories);
                    if (storedIds.length > 0) {
                      reqLogger.info('Memories extracted and stored', {
                        userId: user.id,
                        extractedCount: extractionResult.memories.length,
                        storedCount: storedIds.length,
                      });
                    }
                  }
                }
              } catch (memError) {
                reqLogger.warn('Background memory extraction failed', {
                  error: memError instanceof Error ? memError.message : String(memError),
                });
              }
            })();
          }
        } catch (error) {
          reqLogger.error('Stream error', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          });

          captureException(error, {
            tags: {
              component: 'chat-stream',
              requestId,
            },
            extra: {
              userId: user?.id,
              messageCount: messages.length,
            },
          });

          const errorData = JSON.stringify({
            error: error instanceof Error ? error.message : 'Stream interrupted'
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-RateLimit-Limit': user ? '100' : '30',
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString(),
      },
    });

  } catch (error) {
    // Create a scoped logger for error handling if we don't have one
    const errorLogger = logger.withContext({ requestId });

    errorLogger.error('Chat API error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Capture error in Sentry
    captureException(error, {
      tags: {
        component: 'chat-api',
        requestId,
      },
    });

    if (error instanceof OpenAI.APIError) {
      errorLogger.error('OpenAI API error', {
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code,
      });

      const messages: Record<number, string> = {
        401: 'Invalid API key configuration.',
        429: 'AI service rate limit exceeded. Please wait a moment and try again.',
        503: 'AI service temporarily unavailable. Please try again.',
      };

      return new Response(
        JSON.stringify({
          error: messages[error.status] || `AI service error: ${error.message}`,
          requestId,
        }),
        {
          status: error.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'An unexpected error occurred. Please try again.',
        requestId,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

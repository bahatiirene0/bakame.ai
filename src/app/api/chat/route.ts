/**
 * OpenAI Chat API Route with Streaming & Tool Support
 *
 * OPTIMIZED FOR RESPONSIVENESS:
 * - Always streams responses immediately
 * - Tool calls are executed mid-stream
 * - n8n workflow integration for specialized tasks
 * - No blocking waits
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { BAKAME_TOOLS, executeTool } from '@/lib/tools';
import { buildSystemPrompt, SpecialistType, UserAISettings } from '@/lib/prompts';
import {
  matchWorkflow,
  callWorkflow,
  formatWorkflowResponse,
  extractParameters,
} from '@/lib/n8n';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 2,
});

// Default model
const MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();
    const {
      messages,
      useTools = true,
      specialistId = 'default',
      userSettings = null,
    } = body as {
      messages: Array<{ role: string; content: string }>;
      useTools?: boolean;
      specialistId?: SpecialistType;
      userSettings?: Partial<UserAISettings> | null;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the latest user message
    const latestMessage = messages[messages.length - 1];
    const userQuery = latestMessage?.content || '';

    // Check if we can route to an n8n workflow
    const workflowMatch = matchWorkflow(userQuery);

    if (workflowMatch && workflowMatch.confidence >= 0.5) {
      console.log(`[N8N] Matched workflow: ${workflowMatch.workflow.id} (confidence: ${workflowMatch.confidence})`);

      // Extract parameters from the query
      const params = extractParameters(workflowMatch.workflow, userQuery);

      // Call n8n workflow
      const workflowResponse = await callWorkflow(workflowMatch.workflow.id, {
        query: userQuery,
        parameters: params,
        context: {
          language: userQuery.match(/[а-яёЁА-Я]/) ? 'rw' : 'en', // Basic language detection
          previousMessages: messages.slice(-5).map(m => ({ role: m.role, content: m.content })),
        },
      });

      // If workflow succeeded, format and return the response
      if (workflowResponse.success) {
        const formattedResponse = formatWorkflowResponse(workflowResponse);

        // Stream the workflow response
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
          async start(controller) {
            // Stream character by character for smooth display
            for (const char of formattedResponse) {
              const data = JSON.stringify({ content: char });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              // Small delay for smooth streaming effect
              await new Promise(resolve => setTimeout(resolve, 5));
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });

        return new Response(readableStream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // If workflow failed, fall through to GPT-4
      console.log(`[N8N] Workflow failed, falling back to GPT-4`);
    }

    // Build dynamic system prompt
    const systemPrompt = buildSystemPrompt({
      specialistId,
      userSettings,
    });

    // Prepare messages
    const apiMessages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    ];

    // Create streaming response with tools
    const stream = await openai.chat.completions.create({
      model: MODEL,
      messages: apiMessages,
      tools: useTools ? BAKAME_TOOLS : undefined,
      tool_choice: useTools ? 'auto' : undefined,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
    });

    // Encode and stream
    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let toolCalls: Array<{
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
            // Send a "thinking" indicator
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: '\n\n🔧 *Ndimo gukoresha ibikoresho...*\n\n' })}\n\n`)
            );

            // Execute tools
            const toolResults = await Promise.all(
              toolCalls.map(async (tc) => {
                let args = {};
                try {
                  args = JSON.parse(tc.function.arguments);
                } catch {
                  console.error('Failed to parse args:', tc.function.arguments);
                }

                console.log(`Executing: ${tc.function.name}`, args);
                const result = await executeTool(tc.function.name, args);
                console.log(`Result:`, result);

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
            const finalStream = await openai.chat.completions.create({
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

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
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
      },
    });

  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof OpenAI.APIError) {
      const messages: Record<number, string> = {
        401: 'Invalid API key.',
        429: 'Rate limit exceeded. Try again later.',
        503: 'OpenAI unavailable. Try again.',
      };
      return new Response(
        JSON.stringify({ error: messages[error.status] || 'API error' }),
        { status: error.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Hari ikibazo. Gerageza nanone.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

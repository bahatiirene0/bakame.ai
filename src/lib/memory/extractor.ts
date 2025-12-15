/**
 * Memory Extractor
 *
 * Automatically extracts memorable facts, preferences, and context
 * from user conversations using LLM analysis.
 *
 * @module lib/memory/extractor
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';
import type { MemoryType } from '@/lib/supabase/types';

// ============================================
// Configuration
// ============================================

// Lazy-initialized OpenAI client for memory extraction
let _extractorClient: OpenAI | null = null;
let _extractorUseOpenRouter: boolean | null = null;

function getExtractorClient(): OpenAI {
  if (!_extractorClient) {
    _extractorUseOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('No API key for memory extraction. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
    }

    _extractorClient = new OpenAI({
      apiKey: apiKey,
      baseURL: _extractorUseOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
      timeout: 30000,
      defaultHeaders: _extractorUseOpenRouter ? {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Bakame AI',
      } : undefined,
    });
  }
  return _extractorClient;
}

// Get extraction model (lazy)
function getExtractionModel(): string {
  if (_extractorUseOpenRouter === null) {
    _extractorUseOpenRouter = !!process.env.OPENROUTER_API_KEY;
  }
  return _extractorUseOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
}

// ============================================
// Types
// ============================================

export interface ExtractedMemory {
  /** The fact/preference/context to remember */
  content: string;
  /** Type of memory */
  type: MemoryType;
  /** Category for organization */
  category: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Why this should be remembered */
  reasoning: string;
}

export interface ExtractionResult {
  /** Extracted memories */
  memories: ExtractedMemory[];
  /** Whether extraction was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

// ============================================
// Core Functions
// ============================================

/**
 * Extract memories from a conversation
 *
 * Analyzes user messages to identify facts, preferences, and context
 * that should be remembered for future conversations.
 *
 * @param userMessages - Array of user messages from conversation
 * @param assistantMessages - Array of assistant responses
 * @param existingMemories - Optional existing memories to avoid duplicates
 * @returns Extracted memories
 *
 * @example
 * ```ts
 * const result = await extractMemories(
 *   ["I'm a coffee farmer in Musanze", "I have 5 hectares"],
 *   ["That's great! How can I help with your farm?"],
 *   ["User is from Rwanda"]
 * );
 *
 * // Result:
 * // { memories: [
 * //   { content: "User is a coffee farmer", type: "fact", confidence: 0.95 },
 * //   { content: "User lives in Musanze", type: "fact", confidence: 0.95 },
 * //   { content: "User has 5 hectares of land", type: "context", confidence: 0.9 }
 * // ]}
 * ```
 */
export async function extractMemories(
  userMessages: string[],
  assistantMessages: string[] = [],
  existingMemories: string[] = []
): Promise<ExtractionResult> {
  if (userMessages.length === 0) {
    return { memories: [], success: true };
  }

  // Build conversation context
  const conversation = userMessages
    .map((msg, i) => {
      let text = `User: ${msg}`;
      if (assistantMessages[i]) {
        text += `\nAssistant: ${assistantMessages[i]}`;
      }
      return text;
    })
    .join('\n\n');

  // Build existing memories context
  const existingContext = existingMemories.length > 0
    ? `\nExisting memories (avoid duplicates):\n${existingMemories.map((m) => `- ${m}`).join('\n')}`
    : '';

  const systemPrompt = `You are a memory extraction system for an AI assistant called Bakame.
Your job is to identify important information about the user that should be remembered for future conversations.

Extract ONLY information that:
1. Is explicitly stated by the user (not assumed)
2. Would be useful in future conversations
3. Is not already in existing memories

Categories:
- personal: name, location, family, age
- business: job, company, projects
- preferences: likes, dislikes, communication style
- technical: tools, languages, expertise
- goals: what they want to achieve
- context: temporary but relevant info

Types:
- fact: Definite information (name, location, occupation)
- preference: Likes, dislikes, preferences
- context: Situational info that may change
- goal: Objectives or intentions

Respond in JSON format only:
{
  "memories": [
    {
      "content": "The specific fact to remember",
      "type": "fact|preference|context|goal",
      "category": "personal|business|preferences|technical|goals|context",
      "confidence": 0.0-1.0,
      "reasoning": "Why this should be remembered"
    }
  ]
}

If nothing worth remembering, return: { "memories": [] }
${existingContext}`;

  try {
    const response = await getExtractorClient().chat.completions.create({
      model: getExtractionModel(),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this conversation:\n\n${conversation}` },
      ],
      temperature: 0.3, // Lower temperature for more consistent extraction
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { memories: [], success: true };
    }

    const parsed = JSON.parse(content);
    const memories = validateMemories(parsed.memories || []);

    logger.debug('Extracted memories', {
      messageCount: userMessages.length,
      extractedCount: memories.length,
    });

    return { memories, success: true };
  } catch (error) {
    logger.error('Memory extraction failed', {
      error: (error as Error).message,
    });
    return {
      memories: [],
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Extract memories from a single message (lightweight)
 *
 * Faster extraction for real-time use during conversation.
 * Uses pattern matching before LLM for efficiency.
 *
 * @param message - Single user message
 * @returns Quick extraction result
 */
export async function extractFromMessage(
  message: string
): Promise<ExtractedMemory[]> {
  // First try pattern-based extraction (fast, no API call)
  const patternMemories = extractByPatterns(message);

  // If patterns found something, return early
  if (patternMemories.length > 0) {
    return patternMemories;
  }

  // For messages that might contain implicit info, use LLM
  if (mightContainMemory(message)) {
    const result = await extractMemories([message]);
    return result.memories;
  }

  return [];
}

/**
 * Summarize old memories for consolidation
 *
 * Takes multiple related memories and creates a summary.
 *
 * @param memories - Array of memory contents
 * @param category - Memory category
 * @returns Summarized memory
 */
export async function summarizeMemories(
  memories: string[],
  category: string
): Promise<string | null> {
  if (memories.length < 3) {
    return null; // Not enough to summarize
  }

  try {
    const response = await getExtractorClient().chat.completions.create({
      model: getExtractionModel(),
      messages: [
        {
          role: 'system',
          content: `Summarize these related facts about a user into one concise statement.
Category: ${category}
Keep it factual and specific.`,
        },
        {
          role: 'user',
          content: memories.map((m) => `- ${m}`).join('\n'),
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    return response.choices[0]?.message?.content?.trim() || null;
  } catch (error) {
    logger.error('Memory summarization failed', { error: (error as Error).message });
    return null;
  }
}

// ============================================
// Pattern-Based Extraction (Fast, No API)
// ============================================

/**
 * Extract memories using regex patterns
 * Much faster than LLM for common patterns
 */
function extractByPatterns(message: string): ExtractedMemory[] {
  const memories: ExtractedMemory[] = [];
  const lowerMessage = message.toLowerCase();

  // Name patterns
  const namePatterns = [
    /(?:my name is|i'm called|call me|nitwa|izina ryange ni)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:i am|i'm)\s+([A-Z][a-z]+)\b/i,
  ];

  for (const pattern of namePatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length > 2) {
      memories.push({
        content: `User's name is ${match[1]}`,
        type: 'fact',
        category: 'personal',
        confidence: 0.9,
        reasoning: 'User explicitly stated their name',
      });
      break;
    }
  }

  // Location patterns
  const locationPatterns = [
    /(?:i live in|i'm from|i am from|ntuye|mba)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:in|from)\s+(Kigali|Musanze|Huye|Rubavu|Muhanga|Butare|Gisenyi|Ruhengeri|Nyagatare)/i,
  ];

  for (const pattern of locationPatterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      memories.push({
        content: `User is located in ${match[1]}`,
        type: 'fact',
        category: 'personal',
        confidence: 0.85,
        reasoning: 'User mentioned their location',
      });
      break;
    }
  }

  // Occupation patterns
  const occupationPatterns = [
    /(?:i am a|i'm a|i work as a?|ndi)\s+([\w\s]+(?:farmer|developer|teacher|doctor|engineer|student|business|entrepreneur))/i,
    /(?:my job is|my work is|akazi kange ni)\s+([\w\s]+)/i,
  ];

  for (const pattern of occupationPatterns) {
    const match = message.match(pattern);
    if (match && match[1] && match[1].length < 50) {
      memories.push({
        content: `User works as ${match[1].trim()}`,
        type: 'fact',
        category: 'business',
        confidence: 0.85,
        reasoning: 'User mentioned their occupation',
      });
      break;
    }
  }

  // Preference patterns
  if (lowerMessage.includes('i prefer') || lowerMessage.includes('i like') ||
      lowerMessage.includes('nkunda') || lowerMessage.includes('ndakunda')) {
    const prefMatch = message.match(/(?:i prefer|i like|nkunda|ndakunda)\s+([^.!?]+)/i);
    if (prefMatch && prefMatch[1]) {
      memories.push({
        content: `User prefers ${prefMatch[1].trim()}`,
        type: 'preference',
        category: 'preferences',
        confidence: 0.8,
        reasoning: 'User stated a preference',
      });
    }
  }

  return memories;
}

/**
 * Check if message might contain memorable info
 */
function mightContainMemory(message: string): boolean {
  const indicators = [
    // Self-references
    /\b(i am|i'm|i have|i work|i live|my|mine)\b/i,
    // Kinyarwanda self-references
    /\b(ndi|mfite|ntuye|akazi kange|izina ryange)\b/i,
    // Numbers (often contextual)
    /\d+\s*(years?|hectares?|employees?|rwf|frw|\$)/i,
    // Future intentions
    /\b(i want|i need|i plan|ndashaka|nifuza)\b/i,
  ];

  return indicators.some((pattern) => pattern.test(message));
}

/**
 * Validate extracted memories
 */
function validateMemories(memories: any[]): ExtractedMemory[] {
  if (!Array.isArray(memories)) return [];

  return memories
    .filter((m) => {
      // Must have content
      if (!m.content || typeof m.content !== 'string') return false;
      // Content must be reasonable length
      if (m.content.length < 5 || m.content.length > 500) return false;
      // Must have valid type
      if (!['fact', 'preference', 'context', 'goal'].includes(m.type)) return false;
      // Confidence must be valid
      if (typeof m.confidence !== 'number' || m.confidence < 0 || m.confidence > 1) {
        m.confidence = 0.7; // Default
      }
      return true;
    })
    .map((m) => ({
      content: m.content.trim(),
      type: m.type as MemoryType,
      category: m.category || 'general',
      confidence: m.confidence,
      reasoning: m.reasoning || 'Extracted from conversation',
    }));
}

// ============================================
// Exports
// ============================================

export default {
  extractMemories,
  extractFromMessage,
  summarizeMemories,
};

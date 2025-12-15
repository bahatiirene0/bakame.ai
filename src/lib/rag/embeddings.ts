/**
 * Embeddings Service (via OpenRouter)
 *
 * Generates vector embeddings for text using OpenRouter's embedding models.
 * Supports batch processing, retry logic, and rate limiting.
 *
 * @module lib/rag/embeddings
 */

import OpenAI from 'openai';
import { logger } from '@/lib/logger';

// ============================================
// Configuration
// ============================================

/**
 * Embedding model configuration via OpenRouter
 * openai/text-embedding-3-small: 1536 dimensions (recommended)
 * openai/text-embedding-3-large: 3072 dimensions (higher quality)
 */
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';
const EMBEDDING_DIMENSIONS = 1536;
const MAX_BATCH_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Lazy-initialized OpenAI client for embeddings
let _embeddingsClient: OpenAI | null = null;
let _useOpenRouter: boolean | null = null;

function getEmbeddingsClient(): OpenAI {
  if (!_embeddingsClient) {
    _useOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('No API key for embeddings. Set OPENROUTER_API_KEY or OPENAI_API_KEY.');
    }

    _embeddingsClient = new OpenAI({
      apiKey: apiKey,
      baseURL: _useOpenRouter ? 'https://openrouter.ai/api/v1' : undefined,
      timeout: 30000,
      maxRetries: 2,
      defaultHeaders: _useOpenRouter ? {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Bakame AI',
      } : undefined,
    });
  }
  return _embeddingsClient;
}

// Get model name based on provider (lazy)
function getModelName(): string {
  if (_useOpenRouter === null) {
    _useOpenRouter = !!process.env.OPENROUTER_API_KEY;
  }
  return _useOpenRouter ? 'openai/text-embedding-3-small' : 'text-embedding-3-small';
}

// ============================================
// Types
// ============================================

export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokenCount: number;
}

export interface BatchEmbeddingResult {
  results: EmbeddingResult[];
  totalTokens: number;
  failedIndices: number[];
}

// ============================================
// Core Functions
// ============================================

/**
 * Generate embedding for a single text
 *
 * @param text - Text to embed
 * @returns Embedding vector (1536 dimensions)
 *
 * @example
 * ```ts
 * const embedding = await generateEmbedding("What is VAT in Rwanda?");
 * console.log(embedding.length); // 1536
 * ```
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Cannot generate embedding for empty text');
  }

  // Clean and truncate text if needed (max ~8000 tokens)
  const cleanedText = cleanText(text);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await getEmbeddingsClient().embeddings.create({
        model: getModelName(),
        input: cleanedText,
        encoding_format: 'float',
      });

      logger.debug('Generated embedding', {
        textLength: cleanedText.length,
        tokenCount: response.usage?.total_tokens,
      });

      return response.data[0].embedding;
    } catch (error) {
      lastError = error as Error;

      // Check if rate limited
      if (isRateLimitError(error)) {
        const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
        logger.warn('Rate limited, waiting before retry', {
          attempt: attempt + 1,
          waitMs: waitTime,
        });
        await sleep(waitTime);
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }

  throw new Error(`Failed to generate embedding after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}

/**
 * Generate embeddings for multiple texts in batch
 *
 * More efficient than calling generateEmbedding() multiple times.
 * Handles batching automatically for large arrays.
 *
 * @param texts - Array of texts to embed
 * @returns Batch result with embeddings and metadata
 *
 * @example
 * ```ts
 * const result = await generateBatchEmbeddings([
 *   "What is VAT?",
 *   "How to register a company?",
 *   "Tax filing deadline?"
 * ]);
 * console.log(result.results.length); // 3
 * ```
 */
export async function generateBatchEmbeddings(texts: string[]): Promise<BatchEmbeddingResult> {
  if (texts.length === 0) {
    return { results: [], totalTokens: 0, failedIndices: [] };
  }

  const results: EmbeddingResult[] = [];
  const failedIndices: number[] = [];
  let totalTokens = 0;

  // Process in batches
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE);
    const batchStartIndex = i;

    // Clean texts
    const cleanedBatch = batch.map((text, idx) => {
      try {
        return cleanText(text);
      } catch {
        failedIndices.push(batchStartIndex + idx);
        return ''; // Will be filtered out
      }
    });

    // Filter out empty texts but track their indices
    const validTexts: { text: string; originalIndex: number }[] = [];
    cleanedBatch.forEach((text, idx) => {
      if (text.length > 0) {
        validTexts.push({ text, originalIndex: batchStartIndex + idx });
      }
    });

    if (validTexts.length === 0) continue;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await getEmbeddingsClient().embeddings.create({
          model: getModelName(),
          input: validTexts.map((v) => v.text),
          encoding_format: 'float',
        });

        // Map results back to original texts
        response.data
          .sort((a, b) => a.index - b.index)
          .forEach((item, idx) => {
            results.push({
              text: validTexts[idx].text,
              embedding: item.embedding,
              tokenCount: Math.ceil(validTexts[idx].text.length / 4), // Approximate
            });
          });

        totalTokens += response.usage?.total_tokens || 0;
        break; // Success, exit retry loop
      } catch (error) {
        lastError = error as Error;

        if (isRateLimitError(error)) {
          const waitTime = RETRY_DELAY_MS * Math.pow(2, attempt);
          logger.warn('Batch rate limited, waiting before retry', {
            attempt: attempt + 1,
            waitMs: waitTime,
            batchSize: validTexts.length,
          });
          await sleep(waitTime);
          continue;
        }

        // For other errors, mark all as failed
        validTexts.forEach((v) => failedIndices.push(v.originalIndex));
        logger.error('Batch embedding failed', {
          error: lastError.message,
          batchSize: validTexts.length,
        });
        break;
      }
    }
  }

  logger.info('Batch embedding complete', {
    total: texts.length,
    successful: results.length,
    failed: failedIndices.length,
    totalTokens,
  });

  return { results, totalTokens, failedIndices };
}

/**
 * Estimate token count for text
 *
 * Approximate estimation: ~4 characters per token for English,
 * ~3 characters for Kinyarwanda (morphologically complex)
 *
 * @param text - Text to estimate
 * @param language - Language code ('en' or 'rw')
 * @returns Estimated token count
 */
export function estimateTokenCount(text: string, language: string = 'en'): number {
  if (!text) return 0;

  // Kinyarwanda has longer words due to agglutination
  const charsPerToken = language === 'rw' ? 3 : 4;
  return Math.ceil(text.length / charsPerToken);
}

/**
 * Get embedding model info
 */
export function getEmbeddingModelInfo() {
  const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
  return {
    model: getModelName(),
    provider: isOpenRouter ? 'OpenRouter' : 'OpenAI',
    dimensions: EMBEDDING_DIMENSIONS,
    maxBatchSize: MAX_BATCH_SIZE,
    costPer1MTokens: 0.02, // USD
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Clean text for embedding
 * - Remove excessive whitespace
 * - Truncate if too long
 * - Normalize unicode
 */
function cleanText(text: string): string {
  if (!text) return '';

  let cleaned = text
    // Normalize unicode
    .normalize('NFKC')
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Remove null bytes and other control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim
    .trim();

  // Truncate if too long (rough estimate: 8000 tokens * 4 chars = 32000 chars)
  const MAX_CHARS = 30000;
  if (cleaned.length > MAX_CHARS) {
    cleaned = cleaned.substring(0, MAX_CHARS);
    logger.debug('Text truncated for embedding', {
      originalLength: text.length,
      truncatedLength: cleaned.length,
    });
  }

  return cleaned;
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof OpenAI.RateLimitError) return true;

  const message = (error as Error)?.message?.toLowerCase() || '';
  return message.includes('rate limit') || message.includes('429');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// Exports
// ============================================

export default {
  generateEmbedding,
  generateBatchEmbeddings,
  estimateTokenCount,
  getEmbeddingModelInfo,
  EMBEDDING_DIMENSIONS,
};

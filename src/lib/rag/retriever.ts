/**
 * RAG Retriever
 *
 * High-level retrieval interface that combines knowledge search with
 * context formatting for LLM consumption. Prioritizes RAG knowledge
 * over LLM base knowledge.
 *
 * @module lib/rag/retriever
 */

import { searchKnowledge, searchQA, type SearchOptions, type SearchResult } from './search';
import { logger } from '@/lib/logger';
import type {
  KnowledgeSearchResult,
  KnowledgeQASearchResult,
} from '@/lib/supabase/types';

// ============================================
// Configuration
// ============================================

/** Maximum context tokens to include */
const MAX_CONTEXT_TOKENS = 2000;

/** Minimum similarity to include a result */
const MIN_INCLUDE_SIMILARITY = 0.5;

/** High confidence threshold for Q&A */
const HIGH_CONFIDENCE_THRESHOLD = 0.85;

// ============================================
// Types
// ============================================

export interface RetrievalOptions extends SearchOptions {
  /** Maximum tokens for context */
  maxContextTokens?: number;
  /** Include source citations */
  includeSources?: boolean;
  /** User's language preference */
  userLanguage?: 'en' | 'rw';
}

export interface RetrievalResult {
  /** Formatted context for LLM */
  context: string;
  /** Whether we found relevant knowledge */
  hasKnowledge: boolean;
  /** Confidence level in the retrieved knowledge */
  confidence: 'high' | 'medium' | 'low' | 'none';
  /** Sources used (for citation) */
  sources: Array<{
    title: string;
    source: string | null;
    category: string;
  }>;
  /** Raw search results */
  raw: SearchResult;
  /** Suggested fallback action if no knowledge found */
  fallbackSuggestion?: 'web_search' | 'ask_clarification' | 'use_base_knowledge';
}

// ============================================
// Core Functions
// ============================================

/**
 * Retrieve knowledge for a query
 *
 * This is the main entry point for RAG retrieval. It:
 * 1. Searches the knowledge base
 * 2. Prioritizes Q&A matches (direct answers)
 * 3. Formats context for the LLM
 * 4. Includes source attribution
 *
 * @param query - User's query
 * @param options - Retrieval options
 * @returns Formatted context and metadata
 *
 * @example
 * ```ts
 * const retrieval = await retrieveKnowledge("What is the VAT rate?");
 *
 * if (retrieval.hasKnowledge) {
 *   // Include context in system prompt
 *   const systemPrompt = `${basePrompt}\n\n${retrieval.context}`;
 * } else if (retrieval.fallbackSuggestion === 'web_search') {
 *   // Trigger web search tool
 * }
 * ```
 */
export async function retrieveKnowledge(
  query: string,
  options: RetrievalOptions = {}
): Promise<RetrievalResult> {
  const {
    maxContextTokens = MAX_CONTEXT_TOKENS,
    includeSources = true,
    userLanguage = 'en',
    ...searchOptions
  } = options;

  // Search knowledge base
  const searchResult = await searchKnowledge(query, {
    ...searchOptions,
    language: userLanguage,
    includeQA: true,
  });

  // Determine confidence and build context
  const { context, confidence, sources } = buildContext(
    searchResult,
    maxContextTokens,
    includeSources,
    userLanguage
  );

  // Determine fallback suggestion
  let fallbackSuggestion: RetrievalResult['fallbackSuggestion'];
  if (confidence === 'none') {
    // No knowledge found - suggest web search for factual queries
    if (isFactualQuery(query)) {
      fallbackSuggestion = 'web_search';
    } else {
      fallbackSuggestion = 'use_base_knowledge';
    }
  } else if (confidence === 'low') {
    fallbackSuggestion = 'use_base_knowledge';
  }

  logger.info('Knowledge retrieval completed', {
    query: query.substring(0, 50),
    hasKnowledge: confidence !== 'none',
    confidence,
    sourceCount: sources.length,
    fallback: fallbackSuggestion,
  });

  return {
    context,
    hasKnowledge: confidence !== 'none',
    confidence,
    sources,
    raw: searchResult,
    fallbackSuggestion,
  };
}

/**
 * Retrieve direct answer from Q&A
 *
 * Use this when you need a precise answer without additional context.
 *
 * @param question - User's question
 * @param options - Search options
 * @returns Direct answer if found, null otherwise
 */
export async function retrieveDirectAnswer(
  question: string,
  options: Omit<RetrievalOptions, 'includeQA'> = {}
): Promise<{ answer: string; source: string | null; confidence: number } | null> {
  const qaResults = await searchQA(question, {
    ...options,
    matchCount: 1,
    similarityThreshold: HIGH_CONFIDENCE_THRESHOLD,
  });

  if (qaResults.length === 0) {
    return null;
  }

  const best = qaResults[0];
  return {
    answer: best.answer,
    source: best.source,
    confidence: best.similarity,
  };
}

/**
 * Format retrieved knowledge as system prompt context
 *
 * Generates a formatted context block to inject into the system prompt.
 * Includes clear instructions for the LLM to prioritize this knowledge.
 *
 * @param retrieval - Retrieval result
 * @param language - Response language
 * @returns Formatted context for system prompt
 */
export function formatForSystemPrompt(
  retrieval: RetrievalResult,
  language: 'en' | 'rw' = 'en'
): string {
  if (!retrieval.hasKnowledge) {
    return '';
  }

  const instructions = language === 'en'
    ? `## KNOWLEDGE BASE CONTEXT (PRIORITY: HIGH)
The following information is from Bakame's verified knowledge base.
ALWAYS use this information when answering related questions.
If the user's question is covered by this context, base your answer on it.
Do NOT contradict this information with your general knowledge.`
    : `## AMAKURU Y'UBUMENYI (PRIORITY: HEJURU)
Amakuru akurikira aturuka mu bubiko bw'ubumenyi bwa Bakame bwemejwe.
BURI GIHE koresha aya makuru igihe usubiza ibibazo bifitanye isano.
Niba ikibazo cy'umukoresha cyasubijwe n'aya makuru, shingira igisubizo cyawe kuri yo.
NTUKEMERE amakuru y'ibanze kugirango avuguruze aya makuru.`;

  return `${instructions}

${retrieval.context}`;
}

// ============================================
// Context Building
// ============================================

/**
 * Build formatted context from search results
 */
function buildContext(
  searchResult: SearchResult,
  maxTokens: number,
  includeSources: boolean,
  language: 'en' | 'rw'
): {
  context: string;
  confidence: RetrievalResult['confidence'];
  sources: RetrievalResult['sources'];
} {
  const { chunks, qa } = searchResult;
  const sources: RetrievalResult['sources'] = [];
  const contextParts: string[] = [];
  let currentTokens = 0;

  // Determine confidence based on results
  let confidence: RetrievalResult['confidence'] = 'none';

  // High confidence Q&A matches (direct answers)
  const highConfidenceQA = qa.filter((q) => q.similarity >= HIGH_CONFIDENCE_THRESHOLD);
  if (highConfidenceQA.length > 0) {
    confidence = 'high';

    for (const qaItem of highConfidenceQA) {
      const qaContext = formatQAResult(qaItem, language);
      const qaTokens = estimateTokens(qaContext);

      if (currentTokens + qaTokens > maxTokens) break;

      contextParts.push(qaContext);
      currentTokens += qaTokens;

      if (includeSources && qaItem.source) {
        sources.push({
          title: qaItem.question,
          source: qaItem.source,
          category: qaItem.category,
        });
      }
    }
  }

  // Medium confidence Q&A
  const mediumConfidenceQA = qa.filter(
    (q) => q.similarity >= MIN_INCLUDE_SIMILARITY && q.similarity < HIGH_CONFIDENCE_THRESHOLD
  );
  if (mediumConfidenceQA.length > 0 && confidence === 'none') {
    confidence = 'medium';
  }

  for (const qaItem of mediumConfidenceQA) {
    const qaContext = formatQAResult(qaItem, language);
    const qaTokens = estimateTokens(qaContext);

    if (currentTokens + qaTokens > maxTokens) break;

    contextParts.push(qaContext);
    currentTokens += qaTokens;

    if (includeSources && qaItem.source) {
      sources.push({
        title: qaItem.question,
        source: qaItem.source,
        category: qaItem.category,
      });
    }
  }

  // Add relevant chunks
  const relevantChunks = chunks.filter((c) => c.similarity >= MIN_INCLUDE_SIMILARITY);

  if (relevantChunks.length > 0 && confidence === 'none') {
    confidence = relevantChunks[0].similarity >= 0.7 ? 'medium' : 'low';
  }

  for (const chunk of relevantChunks) {
    const chunkContext = formatChunkResult(chunk, language);
    const chunkTokens = estimateTokens(chunkContext);

    if (currentTokens + chunkTokens > maxTokens) break;

    contextParts.push(chunkContext);
    currentTokens += chunkTokens;

    // Add source if not already included
    const sourceKey = `${chunk.document_title}-${chunk.category}`;
    if (
      includeSources &&
      !sources.find((s) => `${s.title}-${s.category}` === sourceKey)
    ) {
      sources.push({
        title: chunk.document_title,
        source: chunk.source,
        category: chunk.category,
      });
    }
  }

  // Build final context
  const context = contextParts.length > 0
    ? contextParts.join('\n\n---\n\n')
    : '';

  return { context, confidence, sources };
}

/**
 * Format Q&A result for context
 */
function formatQAResult(qa: KnowledgeQASearchResult, language: 'en' | 'rw'): string {
  const header = language === 'en'
    ? `**Verified Answer** [${qa.category}]`
    : `**Igisubizo Cyemejwe** [${qa.category}]`;

  const sourceLabel = language === 'en' ? 'Source' : 'Inkomoko';

  let result = `${header}\n`;
  result += `Q: ${qa.question}\n`;
  result += `A: ${qa.answer}`;

  if (qa.source) {
    result += `\n(${sourceLabel}: ${qa.source})`;
  }

  return result;
}

/**
 * Format chunk result for context
 */
function formatChunkResult(chunk: KnowledgeSearchResult, language: 'en' | 'rw'): string {
  const header = language === 'en'
    ? `**From: ${chunk.document_title}** [${chunk.category}]`
    : `**Bivuye: ${chunk.document_title}** [${chunk.category}]`;

  let result = `${header}\n`;
  result += chunk.content;

  if (chunk.source) {
    const sourceLabel = language === 'en' ? 'Source' : 'Inkomoko';
    result += `\n(${sourceLabel}: ${chunk.source})`;
  }

  return result;
}

/**
 * Estimate token count for text
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if query is likely factual (would benefit from web search)
 */
function isFactualQuery(query: string): boolean {
  const factualPatterns = [
    /\b(what|when|where|who|how much|how many)\b/i,
    /\b(price|cost|rate|fee|deadline|date)\b/i,
    /\b(news|latest|recent|current|today)\b/i,
    /\b(ninde|ryari|hehe|bite|angahe)\b/i, // Kinyarwanda question words
  ];

  return factualPatterns.some((pattern) => pattern.test(query));
}

// ============================================
// Exports
// ============================================

export default {
  retrieveKnowledge,
  retrieveDirectAnswer,
  formatForSystemPrompt,
  MAX_CONTEXT_TOKENS,
  HIGH_CONFIDENCE_THRESHOLD,
};

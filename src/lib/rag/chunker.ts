/**
 * Document Chunker
 *
 * Splits documents into semantically meaningful chunks for RAG.
 * Supports multiple chunking strategies optimized for different content types.
 *
 * @module lib/rag/chunker
 */

import { createHash } from 'crypto';

// ============================================
// Configuration
// ============================================

/**
 * Chunking configuration by content type
 */
export const CHUNK_CONFIG = {
  default: { chunkSize: 512, overlap: 50, separator: '\n\n' },
  prose: { chunkSize: 768, overlap: 100, separator: '\n\n' },
  technical: { chunkSize: 512, overlap: 80, separator: '\n' },
  qa: { chunkSize: 256, overlap: 0, separator: '\n---\n' },
  kinyarwanda: { chunkSize: 384, overlap: 60, separator: '\n\n' }, // Smaller for morphological complexity
} as const;

export type ChunkConfigType = keyof typeof CHUNK_CONFIG;

// ============================================
// Types
// ============================================

export interface ChunkOptions {
  /** Target chunk size in tokens (approximate) */
  chunkSize?: number;
  /** Overlap between chunks in tokens */
  overlap?: number;
  /** Primary separator for splitting */
  separator?: string;
  /** Whether to preserve markdown structure */
  preserveMarkdown?: boolean;
  /** Content type for optimized chunking */
  contentType?: ChunkConfigType;
}

export interface Chunk {
  /** Chunk content */
  content: string;
  /** Index in document (0-based) */
  index: number;
  /** Estimated token count */
  tokenCount: number;
  /** Hash for deduplication */
  contentHash: string;
  /** Metadata about the chunk */
  metadata: {
    /** Start character position in original */
    startChar: number;
    /** End character position in original */
    endChar: number;
    /** Section/heading if detected */
    section?: string;
  };
}

// ============================================
// Core Functions
// ============================================

/**
 * Chunk a document into smaller pieces
 *
 * Uses recursive character splitting with semantic awareness.
 * Tries to split on paragraph boundaries, then sentences, then words.
 *
 * @param text - Document text to chunk
 * @param options - Chunking options
 * @returns Array of chunks
 *
 * @example
 * ```ts
 * const chunks = chunkDocument(longText, {
 *   contentType: 'prose',
 *   preserveMarkdown: true
 * });
 * console.log(`Split into ${chunks.length} chunks`);
 * ```
 */
export function chunkDocument(text: string, options: ChunkOptions = {}): Chunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Get config based on content type
  const contentType = options.contentType || 'default';
  const config = CHUNK_CONFIG[contentType];

  const chunkSize = options.chunkSize || config.chunkSize;
  const overlap = options.overlap ?? config.overlap;
  const separator = options.separator || config.separator;

  // Convert token-based sizes to character estimates (4 chars ≈ 1 token)
  const chunkChars = chunkSize * 4;
  const overlapChars = overlap * 4;

  // Split into initial segments by primary separator
  const segments = splitBySeparators(text, [separator, '\n\n', '\n', '. ', ' ']);

  const chunks: Chunk[] = [];
  let currentChunk = '';
  let currentStartChar = 0;
  let charPosition = 0;

  for (const segment of segments) {
    // If adding this segment exceeds chunk size
    if (currentChunk.length + segment.length > chunkChars && currentChunk.length > 0) {
      // Save current chunk
      chunks.push(createChunk(
        currentChunk.trim(),
        chunks.length,
        currentStartChar,
        charPosition
      ));

      // Start new chunk with overlap
      if (overlapChars > 0 && currentChunk.length > overlapChars) {
        currentChunk = currentChunk.slice(-overlapChars) + segment;
        currentStartChar = charPosition - overlapChars;
      } else {
        currentChunk = segment;
        currentStartChar = charPosition;
      }
    } else {
      currentChunk += segment;
    }

    charPosition += segment.length;
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(createChunk(
      currentChunk.trim(),
      chunks.length,
      currentStartChar,
      charPosition
    ));
  }

  return chunks;
}

/**
 * Chunk text optimized for Q&A pairs
 *
 * Splits on Q&A delimiters, keeping question and answer together.
 *
 * @param text - Text containing Q&A pairs
 * @returns Array of Q&A chunks
 */
export function chunkQAPairs(text: string): Chunk[] {
  // Common Q&A patterns (using [\s\S] instead of 's' flag for compatibility)
  const qaPatterns = [
    /(?:Q:|Question:|FAQ:)\s*([\s\S]*?)\n+(?:A:|Answer:)\s*([\s\S]*?)(?=(?:Q:|Question:|FAQ:)|$)/gi,
    /\*\*(.+?)\*\*\n+([\s\S]*?)(?=\*\*|$)/g, // Markdown bold questions
    /###\s*(.+?)\n+([\s\S]*?)(?=###|$)/g, // Markdown h3 questions
  ];

  const chunks: Chunk[] = [];
  let matched = false;

  for (const pattern of qaPatterns) {
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      matched = true;
      const question = match[1]?.trim();
      const answer = match[2]?.trim();

      if (question && answer) {
        const content = `Q: ${question}\nA: ${answer}`;
        chunks.push(createChunk(
          content,
          chunks.length,
          match.index || 0,
          (match.index || 0) + match[0].length
        ));
      }
    }

    if (matched) break;
  }

  // Fallback to regular chunking if no Q&A pattern found
  if (!matched) {
    return chunkDocument(text, { contentType: 'qa' });
  }

  return chunks;
}

/**
 * Chunk markdown document preserving structure
 *
 * Respects heading hierarchy and code blocks.
 *
 * @param markdown - Markdown text
 * @param options - Chunking options
 * @returns Array of chunks with section metadata
 */
export function chunkMarkdown(markdown: string, options: ChunkOptions = {}): Chunk[] {
  const chunks: Chunk[] = [];
  const chunkChars = (options.chunkSize || 512) * 4;

  // Split by headings
  const headingPattern = /^(#{1,6})\s+(.+)$/gm;
  const sections: { level: number; title: string; content: string; startChar: number }[] = [];

  let lastIndex = 0;
  let lastHeading = { level: 0, title: '' };
  let match;

  while ((match = headingPattern.exec(markdown)) !== null) {
    // Save previous section
    if (lastIndex > 0 || match.index > 0) {
      sections.push({
        level: lastHeading.level,
        title: lastHeading.title,
        content: markdown.slice(lastIndex, match.index).trim(),
        startChar: lastIndex,
      });
    }

    lastHeading = {
      level: match[1].length,
      title: match[2].trim(),
    };
    lastIndex = match.index;
  }

  // Don't forget last section
  if (lastIndex < markdown.length) {
    sections.push({
      level: lastHeading.level,
      title: lastHeading.title,
      content: markdown.slice(lastIndex).trim(),
      startChar: lastIndex,
    });
  }

  // Process each section
  for (const section of sections) {
    if (!section.content) continue;

    // If section is small enough, keep as one chunk
    if (section.content.length <= chunkChars) {
      const chunk = createChunk(
        section.content,
        chunks.length,
        section.startChar,
        section.startChar + section.content.length
      );
      chunk.metadata.section = section.title;
      chunks.push(chunk);
    } else {
      // Split large sections
      const subChunks = chunkDocument(section.content, options);
      for (const subChunk of subChunks) {
        subChunk.index = chunks.length;
        subChunk.metadata.section = section.title;
        chunks.push(subChunk);
      }
    }
  }

  return chunks;
}

/**
 * Merge small chunks to meet minimum size
 *
 * @param chunks - Array of chunks
 * @param minTokens - Minimum tokens per chunk
 * @returns Merged chunks
 */
export function mergeSmallChunks(chunks: Chunk[], minTokens: number = 100): Chunk[] {
  if (chunks.length <= 1) return chunks;

  const merged: Chunk[] = [];
  let current: Chunk | null = null;

  for (const chunk of chunks) {
    if (!current) {
      current = { ...chunk };
      continue;
    }

    // If current chunk is too small, merge with next
    if (current.tokenCount < minTokens) {
      current.content += '\n\n' + chunk.content;
      current.tokenCount += chunk.tokenCount;
      current.metadata.endChar = chunk.metadata.endChar;
      current.contentHash = generateHash(current.content);
    } else {
      merged.push(current);
      current = { ...chunk };
    }
  }

  // Don't forget the last chunk
  if (current) {
    merged.push(current);
  }

  // Re-index
  return merged.map((chunk, i) => ({ ...chunk, index: i }));
}

// ============================================
// Helper Functions
// ============================================

/**
 * Split text by multiple separators in order of preference
 */
function splitBySeparators(text: string, separators: string[]): string[] {
  let segments = [text];

  for (const separator of separators) {
    const newSegments: string[] = [];

    for (const segment of segments) {
      if (segment.includes(separator)) {
        const parts = segment.split(separator);
        parts.forEach((part, i) => {
          // Re-add separator except for last part
          newSegments.push(i < parts.length - 1 ? part + separator : part);
        });
      } else {
        newSegments.push(segment);
      }
    }

    segments = newSegments;
  }

  return segments.filter((s) => s.length > 0);
}

/**
 * Create a chunk object
 */
function createChunk(
  content: string,
  index: number,
  startChar: number,
  endChar: number
): Chunk {
  return {
    content,
    index,
    tokenCount: Math.ceil(content.length / 4),
    contentHash: generateHash(content),
    metadata: {
      startChar,
      endChar,
    },
  };
}

/**
 * Generate hash for content deduplication
 */
function generateHash(content: string): string {
  return createHash('sha256')
    .update(content)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Estimate if content is primarily Kinyarwanda
 *
 * Simple heuristic based on common Kinyarwanda word patterns
 */
export function detectKinyarwanda(text: string): boolean {
  const kinyarwandaPatterns = [
    /\bni\b/i, /\bku\b/i, /\bmu\b/i, /\bcya\b/i, /\bbya\b/i,
    /\bubu\b/i, /\bumu\b/i, /\baba\b/i, /\biri\b/i, /\bnta\b/i,
    /rwanda/i, /kigali/i,
  ];

  const matches = kinyarwandaPatterns.reduce(
    (count, pattern) => count + (pattern.test(text) ? 1 : 0),
    0
  );

  // If more than 3 patterns match, likely Kinyarwanda
  return matches >= 3;
}

/**
 * Get optimal chunk config for text
 */
export function getOptimalConfig(text: string, explicitType?: ChunkConfigType): ChunkConfigType {
  if (explicitType) return explicitType;

  // Detect Kinyarwanda
  if (detectKinyarwanda(text)) {
    return 'kinyarwanda';
  }

  // Detect markdown
  if (text.includes('```') || /^#{1,6}\s/m.test(text)) {
    return 'technical';
  }

  // Detect Q&A format
  if (/(?:Q:|Question:|FAQ:)/i.test(text)) {
    return 'qa';
  }

  return 'prose';
}

// ============================================
// Exports
// ============================================

export default {
  chunkDocument,
  chunkQAPairs,
  chunkMarkdown,
  mergeSmallChunks,
  detectKinyarwanda,
  getOptimalConfig,
  CHUNK_CONFIG,
};

/**
 * MarkdownRenderer Component (ChatGPT-style)
 *
 * Renders markdown with rich formatting:
 * - **bold** and *italic* text
 * - `inline code` and ```code blocks``` with copy button
 * - # Headers (h1-h3)
 * - Bullet and numbered lists
 * - > Blockquotes
 * - --- Horizontal rules
 * - [Links](url)
 * - Tables
 */

'use client';

import React, { useMemo, useState } from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  const renderedContent = useMemo(() => {
    return parseMarkdown(content);
  }, [content]);

  return (
    <div className={`markdown-content space-y-3 ${className}`}>
      {renderedContent}
    </div>
  );
}

/**
 * Main parser - splits content into blocks
 */
function parseMarkdown(text: string): React.ReactNode {
  if (!text) return null;

  const lines = text.split('\n');
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push(
        <CodeBlock
          key={`code-${blocks.length}`}
          code={codeLines.join('\n')}
          language={language}
        />
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|_{3,}|\*{3,})$/.test(line.trim())) {
      blocks.push(
        <hr key={`hr-${blocks.length}`} className="border-gray-200 dark:border-gray-700 my-4" />
      );
      i++;
      continue;
    }

    // Headers
    const headerMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const text = headerMatch[2];
      blocks.push(
        <Header key={`h-${blocks.length}`} level={level} text={text} />
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) {
        quoteLines.push(lines[i].slice(1).trim());
        i++;
      }
      blocks.push(
        <blockquote
          key={`quote-${blocks.length}`}
          className="border-l-4 border-green-500 pl-4 py-1 my-2 text-gray-600 dark:text-gray-400 italic"
        >
          {quoteLines.map((l, idx) => (
            <span key={idx}>
              {renderInline(l)}
              {idx < quoteLines.length - 1 && <br />}
            </span>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered list
    if (/^[\s]*[-*•]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\s]*[-*•]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[\s]*[-*•]\s+/, ''));
        i++;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="list-disc list-outside ml-5 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (/^[\s]*\d+[.)]\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[\s]*\d+[.)]\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[\s]*\d+[.)]\s+/, ''));
        i++;
      }
      blocks.push(
        <ol key={`ol-${blocks.length}`} className="list-decimal list-outside ml-5 space-y-1">
          {listItems.map((item, idx) => (
            <li key={idx} className="text-gray-700 dark:text-gray-300">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Table (| col1 | col2 |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        blocks.push(
          <Table key={`table-${blocks.length}`} lines={tableLines} />
        );
      }
      continue;
    }

    // Empty line
    if (!line.trim()) {
      i++;
      continue;
    }

    // Regular paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('>') &&
      !/^[\s]*[-*•]\s+/.test(lines[i]) &&
      !/^[\s]*\d+[.)]\s+/.test(lines[i]) &&
      !/^(-{3,}|_{3,}|\*{3,})$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|'))
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {paragraphLines.map((l, idx) => (
            <React.Fragment key={idx}>
              {renderInline(l)}
              {idx < paragraphLines.length - 1 && ' '}
            </React.Fragment>
          ))}
        </p>
      );
    }
  }

  return blocks;
}

/**
 * Header component
 */
function Header({ level, text }: { level: number; text: string }) {
  const styles: Record<number, string> = {
    1: 'text-xl font-semibold text-gray-900 dark:text-white mb-2',
    2: 'text-lg font-semibold text-gray-900 dark:text-white mb-2',
    3: 'text-base font-semibold text-gray-900 dark:text-white mb-1',
  };

  const className = styles[level] || styles[3];

  if (level === 1) {
    return <h1 className={className}>{renderInline(text)}</h1>;
  } else if (level === 2) {
    return <h2 className={className}>{renderInline(text)}</h2>;
  } else {
    return <h3 className={className}>{renderInline(text)}</h3>;
  }
}

/**
 * Table component for markdown tables
 */
function Table({ lines }: { lines: string[] }) {
  // Parse table rows
  const parseRow = (line: string): string[] => {
    return line
      .slice(1, -1) // Remove leading and trailing |
      .split('|')
      .map(cell => cell.trim());
  };

  const headers = parseRow(lines[0]);

  // Check if second line is separator (|---|---|)
  const hasSeparator = lines.length > 1 && /^[\s]*\|[\s:-]+\|/.test(lines[1]);
  const dataStartIndex = hasSeparator ? 2 : 1;
  const dataRows = lines.slice(dataStartIndex).map(parseRow);

  return (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-300 dark:border-gray-600">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800"
              >
                {renderInline(header)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, rowIdx) => (
            <tr
              key={rowIdx}
              className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300"
                >
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Code block with syntax highlighting and copy button
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply syntax highlighting
  const highlightedCode = useMemo(() => {
    return highlightSyntax(code, language);
  }, [code, language]);

  return (
    <div className="code-block">
      {/* Header with language and copy button */}
      <div className="code-block-header">
        <span className="code-block-language">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-white/10"
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>
      {/* Code content with syntax highlighting */}
      <pre className="code-block-content">
        <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </pre>
    </div>
  );
}

/**
 * Syntax highlighter using token-based approach to avoid regex conflicts
 */
function highlightSyntax(code: string, language: string): string {
  const lang = language.toLowerCase();
  const tokens = tokenize(code, lang);
  return tokens.map(token => {
    const escaped = escapeHtml(token.value);
    if (token.type === 'plain') {
      return escaped;
    }
    return `<span class="syntax-${token.type}">${escaped}</span>`;
  }).join('');
}

interface Token {
  type: 'keyword' | 'string' | 'number' | 'comment' | 'function' | 'class' | 'operator' | 'punctuation' | 'plain';
  value: string;
}

function tokenize(code: string, lang: string): Token[] {
  const tokens: Token[] = [];
  const keywords = getKeywords(lang);
  const keywordSet = new Set(keywords);

  let i = 0;
  while (i < code.length) {
    // Check for comments
    if (isCommentStart(code, i, lang)) {
      const comment = extractComment(code, i, lang);
      tokens.push({ type: 'comment', value: comment });
      i += comment.length;
      continue;
    }

    // Check for strings
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const str = extractString(code, i);
      tokens.push({ type: 'string', value: str });
      i += str.length;
      continue;
    }

    // Check for numbers
    if (/\d/.test(code[i]) && (i === 0 || !/[a-zA-Z_]/.test(code[i - 1]))) {
      const num = extractNumber(code, i);
      tokens.push({ type: 'number', value: num });
      i += num.length;
      continue;
    }

    // Check for identifiers (keywords, functions, classes)
    if (/[a-zA-Z_]/.test(code[i])) {
      const ident = extractIdentifier(code, i);
      const nextNonSpace = code.slice(i + ident.length).match(/^\s*(.)/)?.[1];

      if (keywordSet.has(ident)) {
        tokens.push({ type: 'keyword', value: ident });
      } else if (nextNonSpace === '(') {
        tokens.push({ type: 'function', value: ident });
      } else if (/^[A-Z]/.test(ident) && ident.length > 1) {
        tokens.push({ type: 'class', value: ident });
      } else {
        tokens.push({ type: 'plain', value: ident });
      }
      i += ident.length;
      continue;
    }

    // Check for operators
    if (/[=!<>+\-*/%&|^~?:]/.test(code[i])) {
      const op = extractOperator(code, i);
      tokens.push({ type: 'operator', value: op });
      i += op.length;
      continue;
    }

    // Check for punctuation
    if (/[{}[\]();,.]/.test(code[i])) {
      tokens.push({ type: 'punctuation', value: code[i] });
      i++;
      continue;
    }

    // Plain text (whitespace and other characters)
    tokens.push({ type: 'plain', value: code[i] });
    i++;
  }

  return tokens;
}

function isCommentStart(code: string, i: number, lang: string): boolean {
  const slice = code.slice(i);
  if (['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx', 'java', 'c', 'cpp', 'go', 'rust', 'swift', 'css', 'scss'].includes(lang)) {
    return slice.startsWith('//') || slice.startsWith('/*');
  }
  if (['python', 'py', 'ruby', 'bash', 'sh', 'shell'].includes(lang)) {
    return slice.startsWith('#');
  }
  if (['html', 'xml'].includes(lang)) {
    return slice.startsWith('<!--');
  }
  return false;
}

function extractComment(code: string, i: number, lang: string): string {
  const slice = code.slice(i);

  if (slice.startsWith('//')) {
    const end = slice.indexOf('\n');
    return end === -1 ? slice : slice.slice(0, end);
  }
  if (slice.startsWith('/*')) {
    const end = slice.indexOf('*/');
    return end === -1 ? slice : slice.slice(0, end + 2);
  }
  if (slice.startsWith('#')) {
    const end = slice.indexOf('\n');
    return end === -1 ? slice : slice.slice(0, end);
  }
  if (slice.startsWith('<!--')) {
    const end = slice.indexOf('-->');
    return end === -1 ? slice : slice.slice(0, end + 3);
  }
  return '';
}

function extractString(code: string, i: number): string {
  const quote = code[i];
  let j = i + 1;
  while (j < code.length) {
    if (code[j] === '\\' && j + 1 < code.length) {
      j += 2; // Skip escaped character
      continue;
    }
    if (code[j] === quote) {
      return code.slice(i, j + 1);
    }
    if (quote !== '`' && code[j] === '\n') {
      // End of line without closing quote (except for template literals)
      return code.slice(i, j);
    }
    j++;
  }
  return code.slice(i);
}

function extractNumber(code: string, i: number): string {
  let j = i;
  // Handle hex, octal, binary
  if (code[i] === '0' && i + 1 < code.length) {
    if (code[i + 1] === 'x' || code[i + 1] === 'X') {
      j = i + 2;
      while (j < code.length && /[0-9a-fA-F]/.test(code[j])) j++;
      return code.slice(i, j);
    }
    if (code[i + 1] === 'b' || code[i + 1] === 'B') {
      j = i + 2;
      while (j < code.length && /[01]/.test(code[j])) j++;
      return code.slice(i, j);
    }
  }
  // Regular number (including floats)
  while (j < code.length && /[\d.]/.test(code[j])) j++;
  // Handle exponent
  if (j < code.length && (code[j] === 'e' || code[j] === 'E')) {
    j++;
    if (j < code.length && (code[j] === '+' || code[j] === '-')) j++;
    while (j < code.length && /\d/.test(code[j])) j++;
  }
  return code.slice(i, j);
}

function extractIdentifier(code: string, i: number): string {
  let j = i;
  while (j < code.length && /[a-zA-Z0-9_]/.test(code[j])) j++;
  return code.slice(i, j);
}

function extractOperator(code: string, i: number): string {
  // Multi-character operators
  const ops = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '=>', '->'];
  for (const op of ops) {
    if (code.slice(i, i + op.length) === op) {
      return op;
    }
  }
  return code[i];
}

function getKeywords(lang: string): string[] {
  const keywordMap: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'this', 'super', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'in', 'of', 'yield', 'static', 'get', 'set'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'class', 'extends', 'import', 'export', 'default', 'from', 'async', 'await', 'this', 'super', 'typeof', 'instanceof', 'true', 'false', 'null', 'undefined', 'void', 'delete', 'in', 'of', 'yield', 'static', 'get', 'set', 'interface', 'type', 'enum', 'implements', 'public', 'private', 'protected', 'readonly', 'abstract', 'as', 'is', 'keyof', 'never', 'unknown', 'any'],
    python: ['def', 'class', 'return', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'raise', 'import', 'from', 'as', 'with', 'lambda', 'pass', 'break', 'continue', 'and', 'or', 'not', 'in', 'is', 'True', 'False', 'None', 'global', 'nonlocal', 'yield', 'async', 'await', 'self'],
    java: ['public', 'private', 'protected', 'static', 'final', 'abstract', 'class', 'interface', 'extends', 'implements', 'new', 'return', 'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'throws', 'import', 'package', 'this', 'super', 'void', 'int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short', 'true', 'false', 'null', 'instanceof', 'synchronized', 'volatile', 'transient', 'native', 'enum'],
    go: ['func', 'return', 'if', 'else', 'for', 'range', 'switch', 'case', 'break', 'continue', 'fallthrough', 'default', 'var', 'const', 'type', 'struct', 'interface', 'map', 'chan', 'go', 'select', 'defer', 'package', 'import', 'true', 'false', 'nil', 'make', 'new', 'len', 'cap', 'append', 'copy', 'delete', 'panic', 'recover'],
    rust: ['fn', 'let', 'mut', 'const', 'static', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue', 'return', 'struct', 'enum', 'impl', 'trait', 'type', 'where', 'use', 'mod', 'pub', 'crate', 'self', 'super', 'as', 'in', 'ref', 'move', 'async', 'await', 'dyn', 'true', 'false', 'Some', 'None', 'Ok', 'Err'],
    css: ['important', 'inherit', 'initial', 'unset', 'auto', 'none'],
    sql: ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER', 'ON', 'AS', 'ORDER', 'BY', 'ASC', 'DESC', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NULL', 'UNIQUE', 'DEFAULT', 'CHECK', 'CONSTRAINT'],
    bash: ['if', 'then', 'else', 'elif', 'fi', 'for', 'while', 'do', 'done', 'case', 'esac', 'function', 'return', 'exit', 'echo', 'read', 'export', 'source', 'true', 'false'],
  };

  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    jsx: 'javascript',
    tsx: 'typescript',
    py: 'python',
    sh: 'bash',
    shell: 'bash',
    scss: 'css',
    sass: 'css',
  };

  const normalizedLang = aliases[lang] || lang;
  return keywordMap[normalizedLang] || [];
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Render inline markdown (bold, italic, code, links, underline)
 */
function renderInline(text: string): React.ReactNode {
  if (!text) return null;

  const elements: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold + Italic (***text***)
    let match = remaining.match(/^\*\*\*(.+?)\*\*\*/);
    if (match) {
      elements.push(
        <strong key={key++} className="font-semibold text-gray-900 dark:text-white">
          <em>{match[1]}</em>
        </strong>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Bold (**text** or __text__)
    match = remaining.match(/^(\*\*|__)(.+?)(\*\*|__)/);
    if (match) {
      elements.push(
        <strong key={key++} className="font-semibold text-gray-900 dark:text-white">
          {match[2]}
        </strong>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Italic (*text* or _text_)
    match = remaining.match(/^(\*|_)([^*_]+?)(\*|_)/);
    if (match) {
      elements.push(
        <em key={key++} className="italic">
          {match[2]}
        </em>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Inline code (`code`)
    match = remaining.match(/^`([^`]+?)`/);
    if (match) {
      elements.push(
        <code
          key={key++}
          className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 text-[13px] font-mono"
        >
          {match[1]}
        </code>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Strikethrough (~~text~~)
    match = remaining.match(/^~~(.+?)~~/);
    if (match) {
      elements.push(
        <del key={key++} className="line-through text-gray-500 dark:text-gray-400">
          {match[1]}
        </del>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Highlight/Mark (==text==)
    match = remaining.match(/^==(.+?)==/);
    if (match) {
      elements.push(
        <mark key={key++} className="bg-yellow-200 dark:bg-yellow-500/30 text-gray-900 dark:text-yellow-100 px-0.5 rounded">
          {match[1]}
        </mark>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Links [text](url)
    match = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
    if (match) {
      elements.push(
        <a
          key={key++}
          href={match[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-600 dark:text-green-400 hover:underline"
        >
          {match[1]}
        </a>
      );
      remaining = remaining.slice(match[0].length);
      continue;
    }

    // Regular text - consume until next special character
    const nextSpecial = remaining.search(/[\*_`\[~=]/);
    if (nextSpecial === -1) {
      elements.push(<span key={key++}>{remaining}</span>);
      break;
    } else if (nextSpecial === 0) {
      // Special char at start but didn't match patterns
      elements.push(<span key={key++}>{remaining[0]}</span>);
      remaining = remaining.slice(1);
    } else {
      elements.push(<span key={key++}>{remaining.slice(0, nextSpecial)}</span>);
      remaining = remaining.slice(nextSpecial);
    }
  }

  return elements.length === 1 ? elements[0] : <>{elements}</>;
}

/**
 * n8n Workflow Matcher
 *
 * Matches user queries to the appropriate n8n workflow based on
 * keyword triggers and regex patterns.
 */

import { WORKFLOW_REGISTRY, WorkflowDefinition, getEnabledWorkflows } from './registry';

export interface MatchResult {
  workflow: WorkflowDefinition;
  confidence: number; // 0-1
  matchedTriggers: string[];
  extractedParams?: Record<string, unknown>;
}

/**
 * Match a user query to the best workflow
 */
export function matchWorkflow(query: string): MatchResult | null {
  const normalizedQuery = query.toLowerCase().trim();
  const enabledWorkflows = getEnabledWorkflows();

  let bestMatch: MatchResult | null = null;
  let highestScore = 0;

  for (const workflow of enabledWorkflows) {
    const result = scoreWorkflow(workflow, normalizedQuery);

    if (result.score > highestScore) {
      highestScore = result.score;
      bestMatch = {
        workflow,
        confidence: Math.min(result.score / 3, 1), // Normalize to 0-1
        matchedTriggers: result.matchedTriggers,
        extractedParams: result.extractedParams,
      };
    }
  }

  // Only return match if confidence is high enough
  if (bestMatch && bestMatch.confidence >= 0.3) {
    return bestMatch;
  }

  return null;
}

/**
 * Score a workflow against a query
 */
function scoreWorkflow(
  workflow: WorkflowDefinition,
  query: string
): { score: number; matchedTriggers: string[]; extractedParams?: Record<string, unknown> } {
  let score = 0;
  const matchedTriggers: string[] = [];
  let extractedParams: Record<string, unknown> | undefined;

  // Check keyword triggers
  for (const trigger of workflow.triggers) {
    const triggerLower = trigger.toLowerCase();

    // Exact match gets highest score
    if (query === triggerLower) {
      score += 5;
      matchedTriggers.push(trigger);
    }
    // Query starts with trigger
    else if (query.startsWith(triggerLower + ' ')) {
      score += 4;
      matchedTriggers.push(trigger);
    }
    // Query contains trigger as whole word
    else if (new RegExp(`\\b${escapeRegex(triggerLower)}\\b`).test(query)) {
      score += 3;
      matchedTriggers.push(trigger);
    }
    // Query contains trigger as substring
    else if (query.includes(triggerLower)) {
      score += 1;
      matchedTriggers.push(trigger);
    }
  }

  // Check regex patterns
  if (workflow.triggerPatterns) {
    for (const pattern of workflow.triggerPatterns) {
      const match = query.match(pattern);
      if (match) {
        score += 4;
        matchedTriggers.push(`pattern:${pattern.source}`);

        // Extract parameters from regex groups
        if (match.groups) {
          extractedParams = { ...extractedParams, ...match.groups };
        }
      }
    }
  }

  // Bonus for category-specific context
  score += getCategoryBonus(workflow.category, query);

  return { score, matchedTriggers, extractedParams };
}

/**
 * Give bonus score based on category context clues
 */
function getCategoryBonus(category: WorkflowDefinition['category'], query: string): number {
  const categoryContexts: Record<string, string[]> = {
    knowledge: ['what is', 'how do', 'explain', 'tell me about', 'ni iki', 'sobanura'],
    action: ['do', 'execute', 'perform', 'kora', 'send', 'check'],
    media: ['create', 'generate', 'make', 'draw', 'gukora', 'design'],
    research: ['find', 'search', 'look up', 'latest', 'current', 'shakisha'],
    code: ['run', 'execute', 'code', 'calculate', 'analyze', 'kubara'],
  };

  const contexts = categoryContexts[category] || [];
  let bonus = 0;

  for (const context of contexts) {
    if (query.includes(context.toLowerCase())) {
      bonus += 0.5;
    }
  }

  return bonus;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract parameters from query based on workflow definition
 */
export function extractParameters(
  workflow: WorkflowDefinition,
  query: string
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (!workflow.parameters) {
    return params;
  }

  // For now, pass the query as the main parameter
  // In the future, this can be enhanced with NLP extraction
  const mainParam = workflow.parameters.find(p => p.required);
  if (mainParam) {
    // Remove trigger words to get the actual content
    let content = query;
    for (const trigger of workflow.triggers) {
      const triggerRegex = new RegExp(`^${escapeRegex(trigger)}\\s*`, 'i');
      content = content.replace(triggerRegex, '');
    }
    params[mainParam.name] = content.trim() || query;
  }

  return params;
}

/**
 * Get workflow suggestions for a query (for autocomplete/hints)
 */
export function getSuggestions(query: string, limit: number = 3): WorkflowDefinition[] {
  if (!query || query.length < 2) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const enabledWorkflows = getEnabledWorkflows();

  const scored = enabledWorkflows
    .map(workflow => ({
      workflow,
      score: scoreWorkflow(workflow, normalizedQuery).score,
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(item => item.workflow);
}

/**
 * Check if a query should definitely use a workflow
 * (vs falling back to general AI conversation)
 */
export function shouldUseWorkflow(query: string): boolean {
  const match = matchWorkflow(query);
  return match !== null && match.confidence >= 0.5;
}

/**
 * Get all workflow categories with their counts
 */
export function getWorkflowCategories(): { category: string; count: number; workflows: WorkflowDefinition[] }[] {
  const enabledWorkflows = getEnabledWorkflows();
  const categories: Record<string, WorkflowDefinition[]> = {};

  for (const workflow of enabledWorkflows) {
    if (!categories[workflow.category]) {
      categories[workflow.category] = [];
    }
    categories[workflow.category].push(workflow);
  }

  return Object.entries(categories).map(([category, workflows]) => ({
    category,
    count: workflows.length,
    workflows,
  }));
}

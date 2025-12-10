/**
 * n8n Integration Module
 *
 * Provides workflow orchestration capabilities for Bakame AI.
 */

// Workflow registry and definitions
export {
  WORKFLOW_REGISTRY,
  type WorkflowDefinition,
  getEnabledWorkflows,
  getWorkflow,
  getWorkflowsByCategory,
} from './registry';

// Workflow client for webhook calls
export {
  type WorkflowResponse,
  type WorkflowInput,
  callWorkflow,
  checkN8nHealth,
  formatWorkflowResponse,
} from './client';

// Workflow matching and routing
export {
  type MatchResult,
  matchWorkflow,
  extractParameters,
  getSuggestions,
  shouldUseWorkflow,
  getWorkflowCategories,
} from './matcher';

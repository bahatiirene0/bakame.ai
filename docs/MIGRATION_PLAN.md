# Migration Plan: Agents → n8n Workflows

## Overview

Instead of simply deleting the agent system, we'll **migrate the specialist knowledge into n8n workflows**. This preserves the valuable Rwanda-specific content while gaining the benefits of the new architecture.

## Current Agent System

### Components to Remove
1. `src/components/SpecialistAgentsMenu.tsx` - UI component
2. `src/lib/prompts/specialists.ts` - Specialist prompts (MIGRATE CONTENT FIRST!)
3. `AgentType` in `src/types/index.ts` - Type definitions
4. `currentAgent` in chat store - State management
5. `agent_slug` in database schema - Can keep for legacy

### Valuable Content to Migrate

The specialist prompts contain Rwanda-specific knowledge that should become n8n workflows:

| Agent | → n8n Workflow |
|-------|----------------|
| gov-services | `bakame-gov-services` (Irembo, documents, registration) |
| business-finance | `bakame-business` (RDB, banking, MoMo) |
| police-services | `bakame-police` (clearances, reporting, traffic) |
| rra-tax | `bakame-tax` (VAT, TIN, filing, EBM) |
| health-guide | `bakame-health` (Mutuelle, hospitals, insurance) |
| education | `bakame-education` (schools, exams, scholarships) |

## Migration Strategy

### Phase 1: Create Knowledge Base (Before Removing Agents)

1. **Export specialist knowledge to n8n-ready format**
   - Convert each specialist prompt into structured knowledge
   - Create JSON knowledge files for each domain
   - These will be loaded into n8n workflows

2. **Create knowledge workflow template**
   - Webhook trigger
   - Query classifier
   - Knowledge retrieval
   - Response formatter

### Phase 2: Build n8n Workflows

For each domain, create workflow with:
```
[Webhook] → [Classify Query] → [Retrieve Knowledge] → [Format Response]
```

Example: `bakame-tax` workflow
- Input: "What is VAT rate in Rwanda?"
- Process: Match to tax knowledge base
- Output: Structured tax information

### Phase 3: Update Bakame API

1. Remove agent-specific routing
2. Add n8n workflow routing
3. Simplify system prompt (one Bakame identity)

### Phase 4: Update UI

1. Remove SpecialistAgentsMenu component
2. Update Header to remove agent selector
3. Keep clean, simple interface

### Phase 5: Clean Up Code

1. Remove unused types (AgentType, etc.)
2. Remove specialist prompt files
3. Update database schema (optional)

## New System Prompt

```markdown
You are Bakame, a friendly AI assistant created by Bahati Irene for Rwandans.

PERSONALITY:
- Warm, helpful, speaks naturally in Kinyarwanda and English
- Knowledgeable about Rwanda and East Africa
- You help with ANYTHING - no need to specialize

CAPABILITIES:
You have access to powerful tools and knowledge through workflows:
- Rwanda knowledge (tax, legal, business, government, health, education)
- Real-time data (weather, news, prices, currency)
- Actions (search, generate images, analyze data)
- Research (when you need to dig deep)

HOW TO WORK:
1. Understand what the user needs
2. If a workflow can help → use it (it's accurate and fast)
3. If no workflow fits → use your reasoning
4. Always be helpful, never say "I can't"

You automatically adapt your expertise based on the topic.
No need to announce what "mode" you're in - just help naturally.
```

## Timeline

### Week 1
- [ ] Export specialist knowledge to structured format
- [ ] Create n8n knowledge workflow template
- [ ] Set up first workflow (tax)

### Week 2
- [ ] Create remaining knowledge workflows
- [ ] Update Bakame API for n8n routing
- [ ] Test knowledge retrieval

### Week 3
- [ ] Remove agent UI components
- [ ] Update system prompt
- [ ] Clean up unused code

### Week 4
- [ ] Add media workflows (image, video)
- [ ] Add action workflows (search, code)
- [ ] Full testing and optimization

## Benefits After Migration

1. **Same knowledge, better delivery** - Rwanda expertise preserved
2. **Faster responses** - Pre-computed knowledge
3. **Lower costs** - No GPT-4 for domain knowledge
4. **Easier updates** - Edit workflows, not code
5. **Simpler UI** - One Bakame, infinite capabilities
6. **Extensible** - Add new workflows without code changes

## Rollback Plan

If issues arise:
1. Agent code remains in git history
2. Database schema unchanged
3. Can re-enable agents via feature flag

## Success Metrics

- Response time for knowledge queries < 500ms
- Cost reduction > 80% for knowledge queries
- User satisfaction maintained or improved
- Zero loss of Rwanda-specific capabilities

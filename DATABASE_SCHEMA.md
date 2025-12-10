# Bakame.ai - Scalable Database Schema

## Design Principles
1. **Future-proof**: Supports agents, subscriptions, analytics
2. **Performant**: Proper indexing and relationships
3. **Secure**: Row Level Security (RLS) on all tables
4. **Flexible**: JSONB for extensible metadata

---

## Entity Relationship Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     users       │     │    agents       │     │  subscriptions  │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ id (PK)         │     │ id (PK)         │     │ id (PK)         │
│ email           │     │ name            │     │ user_id (FK)    │
│ name            │     │ slug            │     │ plan            │
│ avatar_url      │     │ description     │     │ status          │
│ phone           │     │ system_prompt   │     │ expires_at      │
│ role            │     │ icon            │     └─────────────────┘
│ metadata        │     │ color           │
│ created_at      │     │ capabilities    │
└─────────────────┘     │ is_active       │
        │               │ is_premium      │
        │               └─────────────────┘
        │                       │
        ▼                       │
┌─────────────────┐            │
│  chat_sessions  │◄───────────┘
├─────────────────┤
│ id (PK)         │
│ user_id (FK)    │
│ agent_id (FK)   │  ← Which agent was used
│ title           │
│ metadata        │
│ created_at      │
│ updated_at      │
└─────────────────┘
        │
        ▼
┌─────────────────┐
│    messages     │
├─────────────────┤
│ id (PK)         │
│ session_id (FK) │
│ role            │
│ content         │
│ tool_calls      │  ← Store tool usage
│ tokens_used     │  ← For analytics/billing
│ metadata        │
│ created_at      │
└─────────────────┘

┌─────────────────┐     ┌─────────────────┐
│  user_agents    │     │   usage_logs    │
├─────────────────┤     ├─────────────────┤
│ user_id (FK)    │     │ id (PK)         │
│ agent_id (FK)   │     │ user_id (FK)    │
│ is_favorite     │     │ action          │
│ last_used_at    │     │ tokens          │
│ usage_count     │     │ cost            │
└─────────────────┘     │ created_at      │
                        └─────────────────┘
```

---

## Future Specialist Agents Examples

| Agent | Slug | Description | Capabilities |
|-------|------|-------------|--------------|
| Bakame (Default) | `default` | General AI assistant | All tools |
| Tax Expert | `tax-expert` | Rwanda tax guidance | Calculator, RRA info |
| Legal Advisor | `legal-advisor` | Legal document help | Document analysis |
| Business Coach | `business-coach` | Entrepreneurship help | Business tools |
| Health Guide | `health-guide` | Health information | Medical info |
| Edu Tutor | `edu-tutor` | Learning assistant | Quiz, explanations |
| Code Helper | `code-helper` | Programming assistance | Code execution |
| Kinyarwanda Teacher | `kiny-teacher` | Language learning | Translation |

---

## Scalability Considerations

### Indexes for Performance
- `messages.session_id` - Fast message retrieval
- `chat_sessions.user_id` - User's sessions lookup
- `chat_sessions.agent_id` - Agent usage analytics
- `users.email` - Login lookup
- `messages.created_at` - Chronological queries

### Partitioning (When Needed)
- Messages table can be partitioned by `created_at` (monthly)
- Keeps queries fast even with millions of messages

### Caching Strategy
- Redis for active sessions (future)
- Edge caching for agent definitions

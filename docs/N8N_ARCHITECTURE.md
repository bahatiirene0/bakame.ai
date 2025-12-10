# Bakame + n8n Integration Architecture

## Overview

This document outlines the revolutionary architecture where Bakame AI becomes an orchestrator for n8n workflows, enabling powerful capabilities at minimal cost.

```
┌─────────────────────────────────────────────────────────────┐
│                        BAKAME AI                             │
│                    (Conversation Layer)                      │
│                                                              │
│  • Intent Recognition (~50 tokens)                          │
│  • Response Formatting (~100 tokens)                        │
│  • Personality & UX                                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    N8N WORKFLOW ENGINE                       │
│                   (Capability Layer)                         │
│                                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  Knowledge  │ │   Actions   │ │    Media    │           │
│  │  Workflows  │ │  Workflows  │ │  Workflows  │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Why This Architecture?

### Cost Savings (90%+)
- GPT-4 only used for intent + formatting (~150 tokens)
- Heavy processing done by n8n + cheaper models (DeepSeek)
- Pre-computed knowledge = zero AI cost

### Speed Improvements
- Cached responses: 100-300ms
- n8n workflows: 300-800ms
- vs Pure GPT-4: 2-5 seconds

### Unlimited Capabilities
- Image generation (FLUX, SDXL)
- Video generation (CogVideoX, Mochi)
- Audio/Music (Bark, MusicGen)
- Rwanda-specific integrations (MoMo, Irembo, RRA)

---

## System Components

### 1. Bakame Frontend (Next.js)
- Chat interface
- File upload handling
- Media display (images, videos, audio)
- Real-time streaming

### 2. Bakame API (`/api/chat`)
- Intent recognition
- Workflow routing
- Response formatting
- Fallback to GPT-4 for complex queries

### 3. n8n Server (Self-hosted)
- Workflow execution
- Webhook endpoints
- Integration management
- Caching layer

### 4. Supporting Services
- PostgreSQL + pgvector (knowledge storage)
- Redis (caching, rate limiting)
- S3/Supabase Storage (media files)

---

## Workflow Categories

### Knowledge Workflows
Pre-computed, instant responses:
- `bakame-tax-info` - Rwanda tax information
- `bakame-business-registration` - RDB procedures
- `bakame-legal-info` - Legal requirements
- `bakame-government-services` - Irembo guide
- `bakame-faq` - Common questions

### Action Workflows
Execute real-world tasks:
- `bakame-momo-check` - MTN MoMo balance
- `bakame-send-sms` - Send SMS via Africa's Talking
- `bakame-email` - Send emails
- `bakame-calendar` - Calendar management
- `bakame-payment` - Process payments

### Research Workflows
Dynamic information gathering:
- `bakame-web-search` - Multi-source web search
- `bakame-news` - Rwanda news aggregation
- `bakame-weather` - Weather information
- `bakame-currency` - Exchange rates

### Media Workflows
Creative content generation:
- `bakame-image-generate` - Text to image (FLUX/SDXL)
- `bakame-image-edit` - Edit/enhance images
- `bakame-video-generate` - Text/image to video
- `bakame-tts` - Text to speech
- `bakame-music` - Music generation
- `bakame-transcribe` - Audio transcription

### Code Workflows
Development assistance:
- `bakame-code-execute` - Run code snippets
- `bakame-code-analyze` - Analyze/review code
- `bakame-data-analyze` - Data analysis with pandas

---

## Workflow Registry

Each workflow registers itself with metadata:

```json
{
  "id": "bakame-image-generate",
  "name": "Image Generation",
  "description": "Generate images from text descriptions",
  "triggers": ["generate image", "create picture", "draw", "ishusho"],
  "parameters": {
    "prompt": { "type": "string", "required": true },
    "style": { "type": "string", "enum": ["realistic", "artistic", "anime"] },
    "size": { "type": "string", "enum": ["square", "portrait", "landscape"] }
  },
  "returns": {
    "type": "image",
    "format": "url"
  },
  "cost": "low",
  "latency": "5-15s"
}
```

---

## API Flow

### Request Flow
```
1. User sends message to /api/chat
2. Bakame analyzes intent (GPT-4, ~50 tokens)
3. Match intent to workflow (local matching)
4. If match found:
   a. Extract parameters
   b. Call n8n webhook
   c. Wait for response
   d. Format response (GPT-4, ~100 tokens)
5. If no match:
   a. Fallback to full GPT-4 reasoning
```

### n8n Webhook Format
```
POST https://n8n.bakame.ai/webhook/{workflow-id}
Headers:
  X-Bakame-Auth: {secret}
  Content-Type: application/json
Body:
  {
    "sessionId": "abc123",
    "userId": "user456",
    "input": {
      "prompt": "Generate image of rabbit",
      "style": "realistic"
    },
    "context": {
      "language": "rw",
      "previousMessages": []
    }
  }
```

### n8n Response Format
```json
{
  "success": true,
  "type": "image",
  "data": {
    "url": "https://storage.bakame.ai/images/xyz.png",
    "width": 1024,
    "height": 1024
  },
  "message": "Image generated successfully",
  "metadata": {
    "model": "flux-schnell",
    "processingTime": 3200,
    "cost": 0.003
  }
}
```

---

## Infrastructure

### Recommended VPS Setup

**Orchestration Server (Hetzner CPX41 - $32/mo)**
- 8 vCPU, 16GB RAM
- n8n + PostgreSQL + Redis
- Always running

**Services:**
- n8n Cloud or self-hosted
- DeepSeek API ($0.14/1M tokens)
- Replicate API (image/video generation)
- Together AI (fast inference)

### Docker Compose
```yaml
version: '3.8'
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - WEBHOOK_URL=https://n8n.bakame.ai/
    volumes:
      - n8n_data:/home/node/.n8n

  postgres:
    image: pgvector/pgvector:pg16
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

---

## Cost Analysis

### Per Query Breakdown
| Component | Tokens/Cost |
|-----------|-------------|
| Intent Recognition | ~50 tokens ($0.0015) |
| n8n Processing | $0 (self-hosted) |
| External APIs | Varies by workflow |
| Response Formatting | ~100 tokens ($0.003) |
| **Total Base** | **~$0.005** |

### Workflow-Specific Costs
| Workflow | Cost per Call |
|----------|---------------|
| Knowledge (cached) | $0.00 |
| Web Search | $0.001 |
| Image Generation | $0.003-0.05 |
| Video Generation | $0.10-0.20 |
| Code Execution | $0.00 (self-hosted) |

### Monthly Estimate (50K queries)
- Base costs: ~$250
- Image gen (5K): ~$50
- Video gen (500): ~$75
- **Total: ~$375/month**
- vs Pure GPT-4: ~$1,500/month

---

## Security Considerations

### Authentication
- Webhook secret validation
- User session verification
- Rate limiting per user

### Sandboxing
- Code execution in isolated containers
- Resource limits (CPU, memory, time)
- No network access from code sandbox

### Data Privacy
- User data stays in Supabase
- No PII sent to external APIs
- Media files stored in user's region

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up n8n server
- [ ] Create webhook integration in Bakame
- [ ] Build workflow registry
- [ ] Implement basic routing

### Phase 2: Knowledge (Week 2-3)
- [ ] Rwanda tax workflow
- [ ] Business registration workflow
- [ ] FAQ/common questions workflow
- [ ] Web search workflow

### Phase 3: Media (Week 3-4)
- [ ] Image generation workflow
- [ ] Image editing workflow
- [ ] Text-to-speech workflow
- [ ] Transcription workflow

### Phase 4: Actions (Week 4-5)
- [ ] Code execution workflow
- [ ] Data analysis workflow
- [ ] Email workflow
- [ ] SMS workflow (Africa's Talking)

### Phase 5: Rwanda Integration (Week 5-6)
- [ ] MoMo integration
- [ ] Irembo services
- [ ] Local news aggregation
- [ ] Currency/weather

---

## Success Metrics

- Response latency < 1s for cached queries
- Cost per query < $0.01 average
- 90%+ queries handled by workflows
- User satisfaction maintained/improved

---

## Future Possibilities

- Voice interface (Kinyarwanda speech)
- WhatsApp bot integration
- Mobile app with offline workflows
- B2B API for other Rwandan businesses
- Custom enterprise workflows

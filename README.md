# Bakame.ai

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind-4.0-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS 4" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai" alt="OpenAI" />
</div>

<div align="center">
  <h3>🐰 AI y'Abanyarwanda - The First Rwandan AI Chat Assistant</h3>
  <p>A premium, ChatGPT-style AI chat interface built for Rwandans, featuring real-time streaming, multi-session support, and integrated tools.</p>
</div>

---

## ✨ Features

### Core Capabilities

- **Real-time Streaming** - Smooth letter-by-letter text animation for natural conversation feel
- **Multi-Session Chat** - Create, manage, rename, and delete multiple chat sessions
- **Persistent Storage** - All conversations automatically saved to localStorage
- **Dark/Light Theme** - Beautiful theme switching with smooth transitions
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Kinyarwanda UI** - Interface text in Kinyarwanda for native experience

### 🛠️ AI Tools Integration

Bakame.ai comes with 8 integrated tools that extend the AI's capabilities:

| Tool | Description | Requires API Key |
|------|-------------|------------------|
| **🧮 Calculator** | Perform mathematical calculations | No |
| **🌤️ Weather** | Get current weather for any location | Yes (OpenWeatherMap) |
| **💱 Currency Converter** | Convert between currencies with live rates | Yes (ExchangeRate API) |
| **🔍 Web Search** | Search the internet for information | Yes (Tavily) |
| **🌐 Translation** | Translate text between languages | Yes (Google Translate) |
| **🕐 Time** | Get current time in any timezone | No |
| **📰 News** | Fetch latest news articles | Yes (NewsAPI) |
| **📍 Places** | Find nearby places and locations | Yes (Google Places) |

### 🎨 Premium UI/UX

- **Glassmorphism Effects** - Modern frosted glass aesthetics
- **Gradient Animations** - Smooth hover effects with gradient backgrounds
- **Micro-interactions** - Subtle scale, rotate, and glow effects on all interactive elements
- **Custom Scrollbars** - Elegant gradient scrollbars in sidebar
- **Loading States** - Beautiful typing indicators with animated gradient dots
- **Floating Logo** - Animated welcome screen logo with glow effects

---

## 🏗️ Tech Stack

### Frontend Framework
- **Next.js 16** - Latest App Router with Turbopack for ultra-fast development
- **React 19** - Latest React with concurrent features
- **TypeScript 5** - Full type safety throughout the codebase

### Styling
- **Tailwind CSS v4** - Latest version with CSS-first configuration
- **Custom CSS Variables** - Comprehensive theming system with 50+ design tokens
- **Inter & JetBrains Mono** - Premium typography for UI and code

### State Management
- **Zustand** - Lightweight, performant state management
- **Selective Subscriptions** - Optimized re-renders for smooth streaming

### AI Integration
- **OpenAI GPT-4** - Powered by the latest GPT-4 model
- **Server-Sent Events (SSE)** - Real-time streaming responses
- **Function Calling** - Native tool integration with 8 built-in tools

### Development
- **ESLint** - Code quality and consistency
- **Turbopack** - Lightning-fast builds and HMR

---

## 📁 Project Structure

```
bakame-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts      # OpenAI streaming API endpoint
│   │   ├── globals.css           # Global styles, animations & utilities
│   │   ├── layout.tsx            # Root layout with metadata
│   │   └── page.tsx              # Main chat page
│   │
│   ├── components/
│   │   ├── ChatContainer.tsx     # Message list & welcome screen
│   │   ├── ChatInput.tsx         # Glassmorphism input with send button
│   │   ├── ChatMessage.tsx       # Message bubbles with gradients
│   │   ├── Header.tsx            # Navigation bar with theme toggle
│   │   ├── MarkdownRenderer.tsx  # Syntax-highlighted markdown
│   │   ├── Sidebar.tsx           # Session management sidebar
│   │   ├── StreamingText.tsx     # Letter-by-letter animation engine
│   │   ├── ThemeProvider.tsx     # Dark/light theme provider
│   │   ├── TypingIndicator.tsx   # AI thinking indicator
│   │   └── index.ts              # Component exports
│   │
│   ├── store/
│   │   ├── chatStore.ts          # Chat state, sessions & streaming
│   │   └── themeStore.ts         # Theme state with persistence
│   │
│   ├── tools/
│   │   ├── calculator.ts         # Math calculations
│   │   ├── currency.ts           # Currency conversion
│   │   ├── index.ts              # Tool definitions & executor
│   │   ├── news.ts               # News fetching
│   │   ├── places.ts             # Location search
│   │   ├── search.ts             # Web search (Tavily)
│   │   ├── time.ts               # Timezone utilities
│   │   ├── translate.ts          # Translation service
│   │   └── weather.ts            # Weather data
│   │
│   └── types/
│       └── index.ts              # TypeScript interfaces
│
├── public/                       # Static assets
├── .env.local                    # Environment variables (create this)
├── next.config.ts                # Next.js configuration
├── package.json                  # Dependencies
├── tailwind.config.ts            # Tailwind configuration
└── tsconfig.json                 # TypeScript configuration
```

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ (recommended: 20+)
- npm, yarn, or pnpm
- OpenAI API key

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/bahatiirene0/bakame.ai.git
   cd bakame.ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key

   # Optional - for extended tool functionality
   OPENWEATHER_API_KEY=your_openweather_key
   EXCHANGERATE_API_KEY=your_exchangerate_key
   TAVILY_API_KEY=your_tavily_key
   GOOGLE_TRANSLATE_API_KEY=your_google_translate_key
   NEWS_API_KEY=your_newsapi_key
   GOOGLE_PLACES_API_KEY=your_google_places_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | **Yes** | OpenAI API key for GPT-4 access |
| `OPENWEATHER_API_KEY` | No | OpenWeatherMap API for weather tool |
| `EXCHANGERATE_API_KEY` | No | ExchangeRate API for currency conversion |
| `TAVILY_API_KEY` | No | Tavily API for web search |
| `GOOGLE_TRANSLATE_API_KEY` | No | Google Translate API |
| `NEWS_API_KEY` | No | NewsAPI for news fetching |
| `GOOGLE_PLACES_API_KEY` | No | Google Places API |

### Customization

#### System Prompt
The AI's personality can be customized in `src/app/api/chat/route.ts`:

```typescript
const systemPrompt = `You are Bakame.ai, a friendly and knowledgeable AI assistant...`;
```

#### Theme Colors
Customize the color palette in `src/app/globals.css`:

```css
:root {
  --accent-green: #22C55E;
  --accent-blue: #3B82F6;
  --accent-yellow: #EAB308;
}
```

---

## 🔄 How Streaming Works

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │────▶│    API Route    │────▶│     OpenAI      │
│    (React)      │     │    (Next.js)    │     │    (GPT-4)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                       │
        │   Server-Sent Events  │
        │   (real-time chunks)  │
        └───────────────────────┘
```

1. **User sends message** via `sendMessage()` in Zustand store
2. **API route** creates OpenAI stream with `stream: true`
3. **Chunks sent back** as SSE: `data: {"type":"content","content":"chunk"}\n\n`
4. **Client reads stream** and calls `appendToMessage()` for each chunk
5. **StreamingText component** animates characters letter-by-letter
6. **UI updates smoothly** with blinking cursor animation

### Letter-by-Letter Animation

The `StreamingText` component creates a smooth typing effect:
- Receives chunks from the API (word tokens)
- Buffers them and reveals character-by-character
- Catches up automatically if falling behind (>30 chars)
- 5 characters per frame at 5ms intervals

---

## 📡 API Reference

### Chat Endpoint

**POST** `/api/chat`

Streams AI responses using Server-Sent Events with tool calling support.

#### Request Body
```json
{
  "messages": [
    { "role": "user", "content": "What's the weather in Kigali?" }
  ]
}
```

#### Response (Server-Sent Events)
```
data: {"type":"content","content":"Let me"}
data: {"type":"content","content":" check"}
data: {"type":"content","content":" the weather"}
data: {"type":"tool_call","tool":"weather","args":{"location":"Kigali"}}
data: {"type":"tool_result","result":"25°C, Sunny"}
data: {"type":"content","content":"The weather in Kigali is 25°C and sunny!"}
data: {"type":"done"}
```

---

## ⚡ Performance Optimizations

- **Selective Zustand Subscriptions** - Components only re-render when their specific data changes
- **Letter-by-Letter Buffer** - Smooth animation with automatic catch-up mechanism
- **CSS GPU Acceleration** - `transform: translateZ(0)` for jank-free animations
- **Disabled Transitions During Streaming** - Prevents performance issues during rapid updates
- **Memoized Components** - Strategic use of `React.memo` for expensive renders
- **Throttled Auto-scroll** - 150ms intervals during streaming to reduce layout thrashing

---

## 🎨 Design System

### Color Palette

| Color | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Background | `#FFFFFF` | `#0A0A0A` | Main background |
| Secondary BG | `#F9FAFB` | `#111111` | Cards, sidebar |
| Text Primary | `#111827` | `#F9FAFB` | Headings |
| Text Secondary | `#4B5563` | `#D1D5DB` | Body text |
| Accent Green | `#22C55E` | `#22C55E` | Primary actions |
| Accent Blue | `#3B82F6` | `#3B82F6` | Links, highlights |
| Accent Yellow | `#EAB308` | `#EAB308` | Theme toggle |

### Typography

- **Sans-serif**: Inter (400, 500, 600 weights)
- **Monospace**: JetBrains Mono (for code blocks)

### Animations

- `fadeIn` - Entry animation for messages
- `float` - Logo bobbing effect
- `typingDot` - Bouncing dots indicator
- `shimmer` - Loading skeleton effect
- `glow` - Pulsing shadow effect
- `cursorBlink` - Typing cursor

---

## 🌐 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## 📦 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add your environment variables
4. Deploy!

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with love for Rwanda 🇷🇼
- Powered by OpenAI GPT-4
- UI inspired by ChatGPT and modern design trends
- Bakame (🐰) means "Rabbit" in Kinyarwanda - symbolizing cleverness and speed

---

<div align="center">
  <h3>🐰 Bakame.ai</h3>
  <p><strong>AI y'Abanyarwanda</strong></p>
  <p>Made with ❤️ in Rwanda</p>
</div>

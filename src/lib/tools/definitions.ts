/**
 * OpenAI Function Calling Tool Definitions
 *
 * These tools extend Bakame AI's capabilities with real-time data access.
 * Each tool is defined with its name, description, and parameters.
 */

import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const BAKAME_TOOLS: ChatCompletionTool[] = [
  // 1. Weather Tool
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: 'Get current weather information for a location. Use this when users ask about weather, temperature, or climate conditions. Works great for Rwandan cities like Kigali, Butare, Gisenyi, etc.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'The city name, e.g., "Kigali", "Butare", "Gisenyi", "London"',
          },
          units: {
            type: 'string',
            enum: ['celsius', 'fahrenheit'],
            description: 'Temperature unit (default: celsius)',
          },
        },
        required: ['location'],
      },
    },
  },

  // 2. Calculator Tool
  {
    type: 'function',
    function: {
      name: 'calculate',
      description: 'Perform mathematical calculations. Use this for any math operations including basic arithmetic, percentages, square roots, powers, etc.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'The mathematical expression to evaluate, e.g., "2 + 2", "15% of 200", "sqrt(144)", "2^10"',
          },
        },
        required: ['expression'],
      },
    },
  },

  // 3. Currency Converter Tool
  {
    type: 'function',
    function: {
      name: 'convert_currency',
      description: 'Convert between currencies. Supports RWF (Rwandan Franc), USD, EUR, GBP, KES, UGX, TZS, and more. Great for checking exchange rates.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'The amount to convert',
          },
          from_currency: {
            type: 'string',
            description: 'Source currency code, e.g., "RWF", "USD", "EUR"',
          },
          to_currency: {
            type: 'string',
            description: 'Target currency code, e.g., "RWF", "USD", "EUR"',
          },
        },
        required: ['amount', 'from_currency', 'to_currency'],
      },
    },
  },

  // 4. Web Search Tool
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the internet for current information. Use this when users ask about recent events, news, current prices, or anything that requires up-to-date information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return (default: 5, max: 10)',
          },
        },
        required: ['query'],
      },
    },
  },

  // 5. Translation Tool
  {
    type: 'function',
    function: {
      name: 'translate_text',
      description: 'Translate text between languages. Supports Kinyarwanda, English, French, Swahili, and many other languages.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The text to translate',
          },
          from_language: {
            type: 'string',
            description: 'Source language code: "rw" (Kinyarwanda), "en" (English), "fr" (French), "sw" (Swahili), etc.',
          },
          to_language: {
            type: 'string',
            description: 'Target language code: "rw" (Kinyarwanda), "en" (English), "fr" (French), "sw" (Swahili), etc.',
          },
        },
        required: ['text', 'to_language'],
      },
    },
  },

  // 6. Current Time Tool
  {
    type: 'function',
    function: {
      name: 'get_current_time',
      description: 'Get the current date and time. Default timezone is Africa/Kigali (CAT - Central Africa Time). Use when users ask what time or date it is.',
      parameters: {
        type: 'object',
        properties: {
          timezone: {
            type: 'string',
            description: 'Timezone name, e.g., "Africa/Kigali", "UTC", "America/New_York"',
          },
          format: {
            type: 'string',
            enum: ['full', 'date', 'time'],
            description: 'Output format: full (date and time), date only, or time only',
          },
        },
        required: [],
      },
    },
  },

  // 7. News Fetcher Tool
  {
    type: 'function',
    function: {
      name: 'get_news',
      description: 'Get latest news articles. Can filter by country (Rwanda, East Africa, World) or topic (technology, business, sports, etc.)',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'News topic: "general", "technology", "business", "sports", "entertainment", "health", "science"',
          },
          country: {
            type: 'string',
            description: 'Country code: "rw" (Rwanda), "ke" (Kenya), "ug" (Uganda), "tz" (Tanzania), "us", "gb", etc.',
          },
          num_articles: {
            type: 'number',
            description: 'Number of articles to return (default: 5, max: 10)',
          },
        },
        required: [],
      },
    },
  },

  // 8. Location/Maps Tool
  {
    type: 'function',
    function: {
      name: 'search_places',
      description: 'Search for places, businesses, restaurants, hotels, hospitals, etc. Great for finding locations in Rwanda and around the world.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for, e.g., "restaurants in Kigali", "hospitals near Nyamirambo", "hotels in Gisenyi"',
          },
          location: {
            type: 'string',
            description: 'Location to search around, e.g., "Kigali, Rwanda"',
          },
        },
        required: ['query'],
      },
    },
  },
];

// Tool names for easy reference
export const TOOL_NAMES = {
  WEATHER: 'get_weather',
  CALCULATOR: 'calculate',
  CURRENCY: 'convert_currency',
  WEB_SEARCH: 'search_web',
  TRANSLATE: 'translate_text',
  TIME: 'get_current_time',
  NEWS: 'get_news',
  PLACES: 'search_places',
} as const;

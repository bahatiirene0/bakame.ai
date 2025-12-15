/**
 * Tool Executor Functions
 *
 * Each function implements the actual logic for a tool.
 * These are called when OpenAI decides to use a tool.
 */

import { TOOL_NAMES } from './definitions';
import OpenAI from 'openai';
import jwt from 'jsonwebtoken';
import {
  cacheWeather,
  cacheCurrency,
  cacheNews,
  cacheWebSearch,
  cachePlace
} from '@/lib/redis';
import { logger } from '@/lib/logger';
import { captureException } from '@/lib/sentry';
import { env } from '@/lib/env';

// Initialize OpenAI client for image generation
const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

// Type for tool arguments
type ToolArgs = Record<string, unknown>;

// Tool result type
interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * Main executor - routes to specific tool functions
 */
export async function executeTool(
  toolName: string,
  args: ToolArgs
): Promise<ToolResult> {
  try {
    logger.info(`Executing tool: ${toolName}`, { args });

    switch (toolName) {
      case TOOL_NAMES.WEATHER:
        return await getWeather(args);
      case TOOL_NAMES.CALCULATOR:
        return await calculate(args);
      case TOOL_NAMES.CURRENCY:
        return await convertCurrency(args);
      case TOOL_NAMES.WEB_SEARCH:
        return await searchWeb(args);
      case TOOL_NAMES.TRANSLATE:
        return await translateText(args);
      case TOOL_NAMES.TIME:
        return await getCurrentTime(args);
      case TOOL_NAMES.NEWS:
        return await getNews(args);
      case TOOL_NAMES.PLACES:
        return await searchPlaces(args);
      // n8n workflow tools
      case TOOL_NAMES.RWANDA_TAX:
        return await callN8nWorkflow('bakame-tax', args);
      case TOOL_NAMES.GOV_SERVICES:
        return await callN8nWorkflow('bakame-gov-services', args);
      case TOOL_NAMES.MAPS:
        return await callN8nWorkflow('bakame-maps', args);
      // Creative tools
      case TOOL_NAMES.IMAGE_GENERATION:
        return await generateImage(args);
      case TOOL_NAMES.VIDEO_GENERATION:
        return await generateVideo(args);
      // Developer tools
      case TOOL_NAMES.RUN_CODE:
        return await runCode(args);
      default:
        logger.warn(`Unknown tool requested: ${toolName}`);
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    logger.error(`Tool execution error (${toolName})`, { error });
    captureException(error, {
      tool: toolName,
      args,
      context: 'tool_execution'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * n8n Workflow Executor - calls n8n webhooks
 */
async function callN8nWorkflow(workflowId: string, args: ToolArgs): Promise<ToolResult> {
  const N8N_BASE_URL = env.N8N_WEBHOOK_URL || 'http://localhost:5678';

  try {
    const url = `${N8N_BASE_URL}/webhook/${workflowId}`;
    logger.info(`Calling n8n workflow: ${workflowId}`, { args });

    // Add timeout controller (45 seconds for map requests)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...args, // Pass ALL arguments to the workflow
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`n8n workflow error: ${response.status}`, { workflowId, errorText });
      return { success: false, error: `Workflow failed: ${response.status}` };
    }

    // Get response text first to check if it's empty
    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      logger.error('Empty response from n8n workflow', { workflowId });
      return { success: false, error: 'Workflow returned empty response - please try again' };
    }

    // Parse JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      logger.error('JSON parse error from n8n workflow', {
        workflowId,
        responsePreview: responseText.substring(0, 200)
      });
      captureException(parseError, {
        workflowId,
        responsePreview: responseText.substring(0, 200),
        context: 'n8n_workflow_parse_error'
      });
      return { success: false, error: 'Invalid response from workflow' };
    }

    logger.info(`n8n workflow ${workflowId} completed successfully`);

    return {
      success: true,
      data,
    };
  } catch (error) {
    logger.error('n8n workflow execution error', { workflowId, error });
    captureException(error, {
      workflowId,
      args,
      context: 'n8n_workflow_error'
    });

    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Request timed out - please try again' };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Workflow execution failed',
    };
  }
}

/**
 * 1. Weather Tool - OpenWeatherMap API
 */
async function getWeather(args: ToolArgs): Promise<ToolResult> {
  const location = args.location as string;
  const units = (args.units as string) || 'celsius';
  const apiKey = env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    // Fallback: Return simulated data if no API key
    logger.warn('Weather API key not configured, returning demo data');
    return {
      success: true,
      data: {
        location,
        temperature: 22,
        units: units === 'celsius' ? '°C' : '°F',
        condition: 'Partly cloudy',
        humidity: 65,
        wind_speed: 12,
        note: 'Demo data - Add OPENWEATHER_API_KEY for real weather',
      },
    };
  }

  try {
    const unitParam = units === 'fahrenheit' ? 'imperial' : 'metric';

    // Use caching with 10 minute TTL
    const weatherData = await cacheWeather(location, async () => {
      logger.debug(`Fetching weather data for ${location} from API`);
      const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${unitParam}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Weather fetch failed');
      }

      return data;
    });

    return {
      success: true,
      data: {
        location: weatherData.name,
        country: weatherData.sys?.country,
        temperature: Math.round(weatherData.main.temp),
        feels_like: Math.round(weatherData.main.feels_like),
        units: units === 'celsius' ? '°C' : '°F',
        condition: weatherData.weather[0]?.description,
        humidity: weatherData.main.humidity,
        wind_speed: Math.round(weatherData.wind.speed * 3.6), // Convert to km/h
        icon: weatherData.weather[0]?.icon,
      },
    };
  } catch (error) {
    logger.error('Weather fetch error', { location, error });
    captureException(error, {
      location,
      units,
      context: 'weather_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch weather data'
    };
  }
}

/**
 * 2. Calculator Tool - Safe math evaluation
 */
async function calculate(args: ToolArgs): Promise<ToolResult> {
  const expression = args.expression as string;

  try {
    // Pre-process common patterns
    const processed = expression
      .toLowerCase()
      .replace(/\s+/g, '')
      // Handle percentages: "15% of 200" -> "0.15 * 200"
      .replace(/(\d+(?:\.\d+)?)\s*%\s*of\s*(\d+(?:\.\d+)?)/gi, (_, p, n) => `(${p}/100)*${n}`)
      // Handle "X% " -> "X/100"
      .replace(/(\d+(?:\.\d+)?)\s*%/g, '($1/100)')
      // Handle sqrt
      .replace(/sqrt\(([^)]+)\)/g, 'Math.sqrt($1)')
      // Handle powers: "2^3" -> "Math.pow(2,3)"
      .replace(/(\d+(?:\.\d+)?)\s*\^\s*(\d+(?:\.\d+)?)/g, 'Math.pow($1,$2)')
      // Handle pi
      .replace(/\bpi\b/g, 'Math.PI')
      // Handle e
      .replace(/\be\b/g, 'Math.E');

    // Security: Only allow safe characters
    if (!/^[0-9+\-*/().Math,sqrtpowPIE\s]+$/.test(processed)) {
      return { success: false, error: 'Invalid expression' };
    }

    // Evaluate using Function (safer than eval)
    const result = new Function(`return ${processed}`)();

    if (typeof result !== 'number' || !isFinite(result)) {
      return { success: false, error: 'Invalid calculation result' };
    }

    return {
      success: true,
      data: {
        expression: expression,
        result: Number(result.toFixed(10)), // Limit decimal places
        formatted: formatNumber(result),
      },
    };
  } catch (error) {
    return { success: false, error: 'Could not evaluate expression' };
  }
}

function formatNumber(num: number): string {
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

/**
 * 3. Currency Converter - Exchange Rate API
 */
async function convertCurrency(args: ToolArgs): Promise<ToolResult> {
  const amount = args.amount as number;
  const fromCurrency = (args.from_currency as string).toUpperCase();
  const toCurrency = (args.to_currency as string).toUpperCase();
  const apiKey = env.EXCHANGE_RATE_API_KEY;

  // Fallback rates (approximate) if no API key
  const fallbackRates: Record<string, number> = {
    USD: 1,
    RWF: 1300,
    EUR: 0.92,
    GBP: 0.79,
    KES: 153,
    UGX: 3750,
    TZS: 2500,
    BIF: 2850,
  };

  if (!apiKey) {
    // Use fallback rates
    logger.warn('Exchange Rate API key not configured, using fallback rates');
    const fromRate = fallbackRates[fromCurrency];
    const toRate = fallbackRates[toCurrency];

    if (!fromRate || !toRate) {
      return { success: false, error: `Unsupported currency: ${fromCurrency} or ${toCurrency}` };
    }

    const inUSD = amount / fromRate;
    const result = inUSD * toRate;

    return {
      success: true,
      data: {
        amount,
        from: fromCurrency,
        to: toCurrency,
        result: Number(result.toFixed(2)),
        rate: Number((toRate / fromRate).toFixed(6)),
        note: 'Approximate rates - Add EXCHANGE_RATE_API_KEY for live rates',
      },
    };
  }

  try {
    // Use caching with 5 minute TTL
    const currencyData = await cacheCurrency(fromCurrency, toCurrency, async () => {
      logger.debug(`Fetching exchange rate for ${fromCurrency} to ${toCurrency} from API`);
      const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}/${amount}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.result !== 'success') {
        throw new Error(data['error-type'] || 'Currency conversion failed');
      }

      return data;
    });

    return {
      success: true,
      data: {
        amount,
        from: fromCurrency,
        to: toCurrency,
        result: Number(currencyData.conversion_result.toFixed(2)),
        rate: currencyData.conversion_rate,
        updated: currencyData.time_last_update_utc,
      },
    };
  } catch (error) {
    logger.error('Currency conversion error', { fromCurrency, toCurrency, amount, error });
    captureException(error, {
      fromCurrency,
      toCurrency,
      amount,
      context: 'currency_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch exchange rates'
    };
  }
}

/**
 * 4. Web Search Tool - SerpAPI (Google Search)
 */
async function searchWeb(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const numResults = Math.min((args.num_results as number) || 5, 10);
  const apiKey = env.SERPAPI_API_KEY;

  if (!apiKey) {
    logger.warn('SerpAPI key not configured');
    return {
      success: true,
      data: {
        query,
        results: [],
        message: 'Web search requires SERPAPI_API_KEY. Get a free key at https://serpapi.com',
      },
    };
  }

  try {
    // Use caching with 30 minute TTL
    const searchData = await cacheWebSearch(query, async () => {
      logger.debug(`Performing web search for: ${query}`);
      // Build SerpAPI URL with parameters
      const params = new URLSearchParams({
        q: query,
        api_key: apiKey,
        engine: 'google',
        num: numResults.toString(),
        hl: 'en', // Language
        gl: 'rw', // Country (Rwanda)
      });

      const response = await fetch(`https://serpapi.com/search?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    });

    // Extract organic results
    const organicResults = searchData.organic_results || [];
    const answerBox = searchData.answer_box;
    const knowledgeGraph = searchData.knowledge_graph;

    // Build a quick answer if available
    let quickAnswer = null;
    if (answerBox?.answer) {
      quickAnswer = answerBox.answer;
    } else if (answerBox?.snippet) {
      quickAnswer = answerBox.snippet;
    } else if (knowledgeGraph?.description) {
      quickAnswer = knowledgeGraph.description;
    }

    return {
      success: true,
      data: {
        query,
        answer: quickAnswer,
        knowledge_graph: knowledgeGraph ? {
          title: knowledgeGraph.title,
          type: knowledgeGraph.type,
          description: knowledgeGraph.description,
          source: knowledgeGraph.source?.name,
        } : null,
        results: organicResults.slice(0, numResults).map((r: { title: string; link: string; snippet: string; date?: string }) => ({
          title: r.title,
          url: r.link,
          snippet: r.snippet,
          date: r.date,
        })),
      },
    };
  } catch (error) {
    logger.error('Web search error', { query, error });
    captureException(error, {
      query,
      numResults,
      context: 'web_search_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Web search failed'
    };
  }
}

/**
 * 5. Translation Tool - Google Translate API (or LibreTranslate)
 */
async function translateText(args: ToolArgs): Promise<ToolResult> {
  const text = args.text as string;
  const fromLang = (args.from_language as string) || 'auto';
  const toLang = args.to_language as string;
  const apiKey = env.GOOGLE_TRANSLATE_API_KEY;

  // Language code mapping
  const langCodes: Record<string, string> = {
    rw: 'rw', // Kinyarwanda
    kinyarwanda: 'rw',
    en: 'en',
    english: 'en',
    fr: 'fr',
    french: 'fr',
    sw: 'sw',
    swahili: 'sw',
    de: 'de',
    german: 'de',
    es: 'es',
    spanish: 'es',
    pt: 'pt',
    portuguese: 'pt',
    ar: 'ar',
    arabic: 'ar',
    zh: 'zh',
    chinese: 'zh',
  };

  const sourceLang = langCodes[fromLang.toLowerCase()] || fromLang;
  const targetLang = langCodes[toLang.toLowerCase()] || toLang;

  if (!apiKey) {
    // Try free LibreTranslate API
    logger.warn('Google Translate API key not configured, trying LibreTranslate');
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
        }),
      });

      const data = await response.json();

      if (data.translatedText) {
        return {
          success: true,
          data: {
            original: text,
            translated: data.translatedText,
            from: sourceLang,
            to: targetLang,
            service: 'LibreTranslate',
          },
        };
      }
    } catch (error) {
      logger.error('LibreTranslate failed', { error });
      captureException(error, {
        text: text.substring(0, 100),
        sourceLang,
        targetLang,
        context: 'libretranslate_fallback'
      });
    }

    return {
      success: true,
      data: {
        original: text,
        translated: null,
        from: sourceLang,
        to: targetLang,
        message: 'Translation service unavailable. Add GOOGLE_TRANSLATE_API_KEY for reliable translations.',
      },
    };
  }

  try {
    const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: sourceLang === 'auto' ? undefined : sourceLang,
        target: targetLang,
      }),
    });

    const data = await response.json();

    if (data.data?.translations?.[0]) {
      return {
        success: true,
        data: {
          original: text,
          translated: data.data.translations[0].translatedText,
          from: data.data.translations[0].detectedSourceLanguage || sourceLang,
          to: targetLang,
          service: 'Google Translate',
        },
      };
    }

    return { success: false, error: 'Translation failed' };
  } catch (error) {
    logger.error('Translation error', { text: text.substring(0, 100), sourceLang, targetLang, error });
    captureException(error, {
      text: text.substring(0, 100),
      sourceLang,
      targetLang,
      context: 'translation_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Translation service error'
    };
  }
}

/**
 * 6. Current Time Tool
 */
async function getCurrentTime(args: ToolArgs): Promise<ToolResult> {
  const timezone = (args.timezone as string) || 'Africa/Kigali';
  const format = (args.format as string) || 'full';

  try {
    const now = new Date();

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone,
      ...(format === 'full' || format === 'date'
        ? {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }
        : {}),
      ...(format === 'full' || format === 'time'
        ? {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }
        : {}),
    };

    const formatter = new Intl.DateTimeFormat('en-RW', options);
    const formatted = formatter.format(now);

    // Get Kinyarwanda day name
    const kinyaDays = ['Ku cyumweru', 'Ku wa mbere', 'Ku wa kabiri', 'Ku wa gatatu', 'Ku wa kane', 'Ku wa gatanu', 'Ku wa gatandatu'];
    const kinyaMonths = ['Mutarama', 'Gashyantare', 'Werurwe', 'Mata', 'Gicurasi', 'Kamena', 'Nyakanga', 'Kanama', 'Nzeri', 'Ukwakira', 'Ugushyingo', 'Ukuboza'];

    // Get the day of week in the specified timezone
    const dayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'long' });
    const dayName = dayFormatter.format(now);
    const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayName);

    const monthFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, month: 'numeric' });
    const monthIndex = parseInt(monthFormatter.format(now)) - 1;

    return {
      success: true,
      data: {
        formatted,
        timezone,
        iso: now.toISOString(),
        kinyarwanda: {
          day: kinyaDays[dayIndex],
          month: kinyaMonths[monthIndex],
        },
        unix: Math.floor(now.getTime() / 1000),
      },
    };
  } catch (error) {
    return { success: false, error: 'Invalid timezone' };
  }
}

/**
 * 7. News Fetcher Tool - NewsAPI
 */
async function getNews(args: ToolArgs): Promise<ToolResult> {
  const topic = (args.topic as string) || 'general';
  const country = (args.country as string) || 'rw';
  const numArticles = Math.min((args.num_articles as number) || 5, 10);
  const apiKey = env.NEWS_API_KEY;

  if (!apiKey) {
    logger.warn('News API key not configured');
    return {
      success: true,
      data: {
        topic,
        country,
        articles: [],
        message: 'News requires NEWS_API_KEY. Get a free key at https://newsapi.org',
      },
    };
  }

  try {
    // Use caching with 15 minute TTL
    const newsData = await cacheNews<{ articles?: Array<{ title: string; description: string; url: string; source: { name: string }; publishedAt: string }> }>(`${topic}-${country || 'global'}`, async () => {
      logger.debug(`Fetching news for topic: ${topic}, country: ${country}`);
      // Use top-headlines for country-specific or everything for topic search
      let url: string;
      if (country) {
        url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${topic}&pageSize=${numArticles}&apiKey=${apiKey}`;
      } else {
        url = `https://newsapi.org/v2/everything?q=${topic}&pageSize=${numArticles}&sortBy=publishedAt&apiKey=${apiKey}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'ok') {
        // NewsAPI doesn't support all countries, fallback to search
        if (data.code === 'countryUnsupported') {
          logger.info(`Country ${country} unsupported, using fallback search`);
          const fallbackUrl = `https://newsapi.org/v2/everything?q=${country === 'rw' ? 'Rwanda' : country}+${topic}&pageSize=${numArticles}&sortBy=publishedAt&apiKey=${apiKey}`;
          const fallbackResponse = await fetch(fallbackUrl);
          const fallbackData = await fallbackResponse.json();

          if (fallbackData.status === 'ok') {
            return fallbackData;
          }
        }
        throw new Error(data.message || 'News fetch failed');
      }

      return data;
    });

    return {
      success: true,
      data: {
        topic,
        country,
        articles: newsData.articles?.slice(0, numArticles).map((a) => ({
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source?.name,
          published: a.publishedAt,
        })),
      },
    };
  } catch (error) {
    logger.error('News fetch error', { topic, country, error });
    captureException(error, {
      topic,
      country,
      numArticles,
      context: 'news_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'News service error'
    };
  }
}

/**
 * 8. Places/Maps Search Tool - OpenStreetMap Nominatim (free)
 */
async function searchPlaces(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const location = args.location as string;

  try {
    // Combine query with location if provided
    const searchQuery = location ? `${query} ${location}` : query;

    // Use caching with 1 hour TTL
    const placesData = await cachePlace(searchQuery, async () => {
      logger.debug(`Searching places for: ${searchQuery}`);
      // Use OpenStreetMap Nominatim (free, no API key required)
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BakameAI/1.0 (https://bakame.ai)', // Required by Nominatim
        },
      });

      if (!response.ok) {
        throw new Error(`Nominatim API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    });

    if (!Array.isArray(placesData) || placesData.length === 0) {
      return {
        success: true,
        data: {
          query: searchQuery,
          places: [],
          message: 'No places found for this search',
        },
      };
    }

    return {
      success: true,
      data: {
        query: searchQuery,
        places: placesData.map((place: { display_name: string; lat: string; lon: string; type: string; address: Record<string, string> }) => ({
          name: place.display_name,
          latitude: parseFloat(place.lat),
          longitude: parseFloat(place.lon),
          type: place.type,
          address: place.address,
          map_url: `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lon}&zoom=15`,
        })),
      },
    };
  } catch (error) {
    logger.error('Place search error', { query, location, error });
    captureException(error, {
      query,
      location,
      context: 'places_tool'
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Place search failed'
    };
  }
}

/**
 * 9. Image Generation Tool - OpenAI DALL-E 3
 *
 * Uses OpenAI's DALL-E 3 for high-quality image generation.
 * More reliable and produces better results than free alternatives.
 */
async function generateImage(args: ToolArgs): Promise<ToolResult> {
  const prompt = args.prompt as string;
  // DALL-E 3 supports: 1024x1024, 1792x1024, 1024x1792
  const requestedWidth = (args.width as number) || 1024;
  const requestedHeight = (args.height as number) || 1024;

  // Determine the best DALL-E 3 size based on aspect ratio
  let size: '1024x1024' | '1792x1024' | '1024x1792' = '1024x1024';
  const aspectRatio = requestedWidth / requestedHeight;

  if (aspectRatio > 1.3) {
    size = '1792x1024'; // Landscape
  } else if (aspectRatio < 0.7) {
    size = '1024x1792'; // Portrait
  }

  try {
    logger.info(`Generating image with DALL-E 3`, {
      promptLength: prompt.length,
      size,
      promptPreview: prompt.substring(0, 100)
    });

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: prompt,
      n: 1,
      size: size,
      quality: 'standard', // 'standard' or 'hd'
      response_format: 'url',
    });

    const imageData = response.data?.[0];
    const imageUrl = imageData?.url;
    const revisedPrompt = imageData?.revised_prompt;

    if (!imageUrl) {
      logger.error('No image URL in DALL-E response');
      return { success: false, error: 'Image generation failed. Please try again.' };
    }

    logger.info('Image generated successfully', {
      hasRevisedPrompt: !!revisedPrompt
    });

    // Parse dimensions from size
    const [width, height] = size.split('x').map(Number);

    return {
      success: true,
      data: {
        image_url: imageUrl,
        prompt: revisedPrompt || prompt, // DALL-E 3 sometimes revises the prompt
        width: width,
        height: height,
        provider: 'DALL-E 3',
        message: 'Image generated successfully! Click to view full size.',
      },
    };
  } catch (error) {
    logger.error('Image generation error', {
      error,
      promptPreview: prompt.substring(0, 100)
    });

    captureException(error, {
      prompt: prompt.substring(0, 200),
      size,
      context: 'image_generation_tool'
    });

    if (error instanceof OpenAI.APIError) {
      if (error.status === 400) {
        return {
          success: false,
          error: 'Your prompt was rejected. Please try a different description.',
        };
      }
      if (error.status === 429) {
        return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
      }
    }

    return { success: false, error: 'Image generation failed. Please try again.' };
  }
}

/**
 * 10. Video Generation Tool - Kling AI
 *
 * Uses Kling AI's official API for high-quality video generation.
 * Supports text-to-video with various durations and aspect ratios.
 */

// Kling API configuration
const KLING_API_BASE = 'https://api.klingai.com/v1';
const KLING_ACCESS_KEY = env.KLING_ACCESS_KEY || '';
const KLING_SECRET_KEY = env.KLING_SECRET_KEY || '';

// Generate JWT token for Kling API authentication
function generateKlingJWT(): string {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: KLING_ACCESS_KEY,
    exp: now + 1800, // 30 minutes
    nbf: now - 5, // Valid 5 seconds ago
  };

  return jwt.sign(payload, KLING_SECRET_KEY, {
    algorithm: 'HS256',
    header: { alg: 'HS256', typ: 'JWT' },
  });
}

async function generateVideo(args: ToolArgs): Promise<ToolResult> {
  const prompt = args.prompt as string;
  const duration = (args.duration as number) || 5;
  const aspectRatio = (args.aspect_ratio as string) || '16:9';

  if (!KLING_ACCESS_KEY || !KLING_SECRET_KEY) {
    logger.error('Kling API credentials not configured');
    return { success: false, error: 'Video generation service not configured.' };
  }

  try {
    logger.info('Starting Kling video generation', {
      promptPreview: prompt.substring(0, 100),
      duration,
      aspectRatio
    });

    const token = generateKlingJWT();

    // Step 1: Create video generation task
    const createResponse = await fetch(`${KLING_API_BASE}/videos/text2video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_name: 'kling-v1-6', // Using stable v1.6 model
        prompt: prompt,
        duration: String(duration),
        aspect_ratio: aspectRatio,
        mode: 'std', // Standard quality for faster generation
      }),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      logger.error('Kling create task failed', {
        status: createResponse.status,
        errorText
      });

      // Parse error for more specific messages
      if (createResponse.status === 429) {
        return { success: false, error: 'Kling API rate limit. Wait and try again.' };
      }
      if (createResponse.status === 401) {
        return { success: false, error: 'Kling API authentication failed. Check API keys.' };
      }

      return { success: false, error: `Video generation failed (${createResponse.status}). Please try again.` };
    }

    const createData = await createResponse.json();
    logger.debug('Kling create response', { createData });

    const taskId = createData.data?.task_id;
    if (!taskId) {
      logger.error('No task_id in Kling response', { createData });
      return { success: false, error: 'Failed to start video generation.' };
    }

    logger.info(`Kling task created: ${taskId}`);

    // Step 2: Poll for completion (max 5 minutes)
    const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const statusResponse = await fetch(`${KLING_API_BASE}/videos/text2video/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${generateKlingJWT()}`, // Fresh token
        },
      });

      if (!statusResponse.ok) {
        logger.error('Kling status check failed', { status: statusResponse.status });
        continue;
      }

      const statusData = await statusResponse.json();
      const taskStatus = statusData.data?.task_status;

      logger.debug(`Kling poll ${attempt + 1}/${maxAttempts}`, { taskStatus });

      if (taskStatus === 'succeed') {
        // Video is ready
        const videoUrl = statusData.data?.task_result?.videos?.[0]?.url;
        const videoDuration = statusData.data?.task_result?.videos?.[0]?.duration;

        if (!videoUrl) {
          logger.error('No video URL in Kling result', { statusData });
          return { success: false, error: 'Video generated but URL not available.' };
        }

        logger.info('Kling video ready', { videoUrl });

        return {
          success: true,
          data: {
            video_url: videoUrl,
            prompt: prompt,
            duration: videoDuration || duration,
            aspect_ratio: aspectRatio,
            provider: 'Kling AI',
            message: 'Video generated successfully! Click to play.',
          },
        };
      } else if (taskStatus === 'failed') {
        const errorMsg = statusData.data?.task_status_msg || 'Video generation failed';
        logger.error('Kling task failed', { errorMsg });
        return { success: false, error: errorMsg };
      }
      // Status is 'submitted' or 'processing' - continue polling
    }

    // Timeout after max attempts
    logger.warn('Kling video generation timed out', { taskId });
    return { success: false, error: 'Video generation timed out. Please try a simpler prompt.' };

  } catch (error) {
    logger.error('Video generation error', {
      error,
      promptPreview: prompt.substring(0, 100)
    });
    captureException(error, {
      prompt: prompt.substring(0, 200),
      duration,
      aspectRatio,
      context: 'video_generation_tool'
    });
    return { success: false, error: 'Video generation failed. Please try again.' };
  }
}

/**
 * 11. Code Execution Tool - Piston API
 *
 * Uses Piston API for secure code execution in a sandboxed environment.
 * Supports many languages: Python, JavaScript, TypeScript, Java, C, C++, Go, Rust, Ruby, PHP
 * Free API with no authentication required.
 */

// Piston API language versions (using latest stable versions)
const PISTON_LANGUAGES: Record<string, { language: string; version: string }> = {
  python: { language: 'python', version: '3.10.0' },
  javascript: { language: 'javascript', version: '18.15.0' },
  typescript: { language: 'typescript', version: '5.0.3' },
  java: { language: 'java', version: '15.0.2' },
  c: { language: 'c', version: '10.2.0' },
  cpp: { language: 'cpp', version: '10.2.0' },
  go: { language: 'go', version: '1.16.2' },
  rust: { language: 'rust', version: '1.68.2' },
  ruby: { language: 'ruby', version: '3.0.1' },
  php: { language: 'php', version: '8.2.3' },
};

async function runCode(args: ToolArgs): Promise<ToolResult> {
  const code = args.code as string;
  const language = ((args.language as string) || 'python').toLowerCase();

  // Validate language
  const langConfig = PISTON_LANGUAGES[language];
  if (!langConfig) {
    return {
      success: false,
      error: `Unsupported language: ${language}. Supported: ${Object.keys(PISTON_LANGUAGES).join(', ')}`,
    };
  }

  // Limit code length (prevent abuse)
  if (code.length > 50000) {
    return { success: false, error: 'Code too long. Maximum 50,000 characters.' };
  }

  try {
    logger.info(`Running ${language} code`, { codeLength: code.length });

    const response = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: langConfig.language,
        version: langConfig.version,
        files: [
          {
            content: code,
          },
        ],
        stdin: '', // No stdin input
        args: [], // No command line args
        compile_timeout: 10000, // 10 seconds compile timeout
        run_timeout: 10000, // 10 seconds run timeout
        compile_memory_limit: -1, // Default memory limit
        run_memory_limit: -1, // Default memory limit
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Piston API error', { status: response.status, errorText });
      return { success: false, error: `Code execution service error (${response.status})` };
    }

    const data = await response.json();
    logger.debug('Piston response', { dataPreview: JSON.stringify(data).substring(0, 500) });

    // Check for compile errors
    if (data.compile && data.compile.code !== 0) {
      return {
        success: true,
        data: {
          language,
          version: langConfig.version,
          code,
          output: null,
          error: data.compile.stderr || data.compile.output || 'Compilation failed',
          exitCode: data.compile.code,
          isCompileError: true,
        },
      };
    }

    // Get run output
    const runResult = data.run;
    const stdout = runResult?.stdout || '';
    const stderr = runResult?.stderr || '';
    const exitCode = runResult?.code ?? 0;

    // Combine stdout and stderr
    let output = stdout;
    if (stderr && exitCode !== 0) {
      output = stderr; // Show error if exit code is non-zero
    } else if (stderr) {
      output = stdout + (stdout && stderr ? '\n' : '') + stderr;
    }

    // Truncate very long output
    const maxOutputLength = 10000;
    const truncated = output.length > maxOutputLength;
    if (truncated) {
      output = output.substring(0, maxOutputLength) + '\n... (output truncated)';
    }

    logger.info('Code execution successful', {
      language,
      exitCode,
      outputLength: output.length,
      truncated
    });

    return {
      success: true,
      data: {
        language,
        version: langConfig.version,
        code,
        output: output || '(no output)',
        error: exitCode !== 0 ? stderr : null,
        exitCode,
        truncated,
      },
    };
  } catch (error) {
    logger.error('Code execution error', {
      language,
      error,
      codePreview: code.substring(0, 200)
    });
    captureException(error, {
      language,
      codeLength: code.length,
      codePreview: code.substring(0, 200),
      context: 'code_execution_tool'
    });
    return { success: false, error: 'Code execution failed. Please try again.' };
  }
}

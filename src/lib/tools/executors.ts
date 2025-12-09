/**
 * Tool Executor Functions
 *
 * Each function implements the actual logic for a tool.
 * These are called when OpenAI decides to use a tool.
 */

import { TOOL_NAMES } from './definitions';

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
      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed',
    };
  }
}

/**
 * 1. Weather Tool - OpenWeatherMap API
 */
async function getWeather(args: ToolArgs): Promise<ToolResult> {
  const location = args.location as string;
  const units = (args.units as string) || 'celsius';
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    // Fallback: Return simulated data if no API key
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
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(location)}&appid=${apiKey}&units=${unitParam}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Weather fetch failed' };
    }

    return {
      success: true,
      data: {
        location: data.name,
        country: data.sys?.country,
        temperature: Math.round(data.main.temp),
        feels_like: Math.round(data.main.feels_like),
        units: units === 'celsius' ? '°C' : '°F',
        condition: data.weather[0]?.description,
        humidity: data.main.humidity,
        wind_speed: Math.round(data.wind.speed * 3.6), // Convert to km/h
        icon: data.weather[0]?.icon,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch weather data' };
  }
}

/**
 * 2. Calculator Tool - Safe math evaluation
 */
async function calculate(args: ToolArgs): Promise<ToolResult> {
  const expression = args.expression as string;

  try {
    // Pre-process common patterns
    let processed = expression
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
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

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
    const url = `https://v6.exchangerate-api.com/v6/${apiKey}/pair/${fromCurrency}/${toCurrency}/${amount}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.result !== 'success') {
      return { success: false, error: data['error-type'] || 'Currency conversion failed' };
    }

    return {
      success: true,
      data: {
        amount,
        from: fromCurrency,
        to: toCurrency,
        result: Number(data.conversion_result.toFixed(2)),
        rate: data.conversion_rate,
        updated: data.time_last_update_utc,
      },
    };
  } catch (error) {
    return { success: false, error: 'Failed to fetch exchange rates' };
  }
}

/**
 * 4. Web Search Tool - Tavily API
 */
async function searchWeb(args: ToolArgs): Promise<ToolResult> {
  const query = args.query as string;
  const numResults = Math.min((args.num_results as number) || 5, 10);
  const apiKey = process.env.TAVILY_API_KEY;

  if (!apiKey) {
    // Return helpful message if no API key
    return {
      success: true,
      data: {
        query,
        results: [],
        message: 'Web search requires TAVILY_API_KEY. Get a free key at https://tavily.com',
      },
    };
  }

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        max_results: numResults,
        include_answer: true,
        include_raw_content: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Search failed' };
    }

    return {
      success: true,
      data: {
        query,
        answer: data.answer,
        results: data.results?.map((r: { title: string; url: string; content: string }) => ({
          title: r.title,
          url: r.url,
          snippet: r.content?.slice(0, 200),
        })),
      },
    };
  } catch (error) {
    return { success: false, error: 'Web search failed' };
  }
}

/**
 * 5. Translation Tool - Google Translate API (or LibreTranslate)
 */
async function translateText(args: ToolArgs): Promise<ToolResult> {
  const text = args.text as string;
  const fromLang = (args.from_language as string) || 'auto';
  const toLang = args.to_language as string;
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;

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
    } catch {
      // LibreTranslate failed, return instruction
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
    return { success: false, error: 'Translation service error' };
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
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey) {
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
        const fallbackUrl = `https://newsapi.org/v2/everything?q=${country === 'rw' ? 'Rwanda' : country}+${topic}&pageSize=${numArticles}&sortBy=publishedAt&apiKey=${apiKey}`;
        const fallbackResponse = await fetch(fallbackUrl);
        const fallbackData = await fallbackResponse.json();

        if (fallbackData.status === 'ok') {
          return {
            success: true,
            data: {
              topic,
              country,
              articles: fallbackData.articles?.slice(0, numArticles).map((a: { title: string; description: string; url: string; source: { name: string }; publishedAt: string }) => ({
                title: a.title,
                description: a.description,
                url: a.url,
                source: a.source?.name,
                published: a.publishedAt,
              })),
            },
          };
        }
      }
      return { success: false, error: data.message || 'News fetch failed' };
    }

    return {
      success: true,
      data: {
        topic,
        country,
        articles: data.articles?.slice(0, numArticles).map((a: { title: string; description: string; url: string; source: { name: string }; publishedAt: string }) => ({
          title: a.title,
          description: a.description,
          url: a.url,
          source: a.source?.name,
          published: a.publishedAt,
        })),
      },
    };
  } catch (error) {
    return { success: false, error: 'News service error' };
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

    // Use OpenStreetMap Nominatim (free, no API key required)
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&addressdetails=1`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BakameAI/1.0 (https://bakame.ai)', // Required by Nominatim
      },
    });

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
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
        places: data.map((place: { display_name: string; lat: string; lon: string; type: string; address: Record<string, string> }) => ({
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
    return { success: false, error: 'Place search failed' };
  }
}

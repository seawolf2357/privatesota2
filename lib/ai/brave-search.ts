// Brave Search API Integration
// Adapted from AGI Space app-backup.py

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  age?: string;
  language?: string;
  favicon?: string;
}

export interface BraveSearchResponse {
  web?: {
    results: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
      language?: string;
      favicon?: string;
    }>;
  };
  query?: {
    original: string;
    altered?: string;
    spellcheck_off?: boolean;
  };
}

export class BraveSearchClient {
  private apiKey: string;
  private baseUrl = 'https://api.search.brave.com/res/v1/web/search';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BRAVE_SEARCH_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[BraveSearch] No API key configured');
    }
  }

  async search(query: string, options?: {
    count?: number;
    freshness?: string;
    lang?: string;
  }): Promise<SearchResult[]> {
    if (!this.apiKey) {
      console.error('[BraveSearch] Cannot search without API key');
      return [];
    }

    const params = new URLSearchParams({
      q: query,
      count: String(options?.count || 10),
    });

    if (options?.lang) {
      params.append('search_lang', options.lang);
    }

    try {
      console.log(`[BraveSearch] Searching for: ${query}`);
      
      const response = await fetch(`${this.baseUrl}?${params}`, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        console.error(`[BraveSearch] API Error: ${response.status} - ${response.statusText}`);
        return [];
      }

      const data: BraveSearchResponse = await response.json();
      
      if (!data.web?.results) {
        console.warn('[BraveSearch] No results found');
        return [];
      }

      const results: SearchResult[] = data.web.results.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description,
        age: result.age,
        language: result.language,
        favicon: result.favicon,
      }));

      console.log(`[BraveSearch] Found ${results.length} results`);
      return results;

    } catch (error) {
      console.error('[BraveSearch] Search error:', error);
      return [];
    }
  }

  async multiSearch(queries: string[], options?: {
    count?: number;
    lang?: string;
  }): Promise<SearchResult[]> {
    // Perform multiple searches and combine results
    const allResults: SearchResult[] = [];
    const seenUrls = new Set<string>();

    for (const query of queries) {
      if (allResults.length >= (options?.count || 10)) {
        break;
      }

      const results = await this.search(query, {
        count: options?.count || 10,
        lang: options?.lang,
      });

      for (const result of results) {
        if (!seenUrls.has(result.url)) {
          allResults.push(result);
          seenUrls.add(result.url);
          
          if (allResults.length >= (options?.count || 10)) {
            break;
          }
        }
      }
    }

    return allResults;
  }

  // Generate multiple search queries from user input (Korean optimized)
  generateSearchQueries(message: string): string[] {
    const queries = [message];

    // Remove question marks for better search
    if (message.includes('?')) {
      queries.push(message.replace(/\?/g, ''));
    }

    // Extract Korean keywords
    const koreanRegex = /[\uAC00-\uD7AF]+/g;
    const koreanWords = message.match(koreanRegex);
    
    if (koreanWords && koreanWords.length > 2) {
      // Add last 3 Korean words as a query
      queries.push(koreanWords.slice(-3).join(' '));
    }

    // Extract English keywords
    const englishRegex = /[A-Za-z]+/g;
    const englishWords = message.match(englishRegex);
    
    if (englishWords && englishWords.length > 2) {
      queries.push(englishWords.slice(-3).join(' '));
    }

    return [...new Set(queries)]; // Remove duplicates
  }

  // Format search results for AI context
  formatResultsForPrompt(results: SearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let formatted = '웹 검색 결과 (반드시 출처를 명시하여 답변하세요):\n\n';

    results.forEach((result, index) => {
      formatted += `[${index + 1}] 제목: ${result.title}\n`;
      formatted += `    URL: ${result.url}\n`;
      formatted += `    내용: ${result.description}\n`;
      if (result.age) {
        formatted += `    시간: ${result.age}\n`;
      }
      formatted += '\n';
    });

    formatted += '\n답변할 때 반드시 [출처: 번호] 형식으로 출처를 표시하세요. 여러 출처의 정보를 종합하여 답변하세요.';

    return formatted;
  }

  // Create source citations for response
  createSourceCitations(results: SearchResult[]): string {
    if (results.length === 0) {
      return '';
    }

    let citations = '\n\n📚 **참고 자료:**\n';
    
    results.slice(0, 5).forEach((result, index) => {
      citations += `- [${index + 1}] ${result.title} - ${result.url}\n`;
    });

    return citations;
  }
}

// Singleton instance
let searchClient: BraveSearchClient | null = null;

export function getBraveSearchClient(): BraveSearchClient {
  if (!searchClient) {
    searchClient = new BraveSearchClient();
  }
  return searchClient;
}
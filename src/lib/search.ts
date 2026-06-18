import axios from 'axios';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

const QUERY_TEMPLATES = [
  '{category} assistance near {zip}',
  '{category} help nonprofit near {zip}',
  '211 {category} resources {zip}',
  '{category} county government assistance {zip}',
];

function buildQueries(category: string, zipCode: string): string[] {
  return QUERY_TEMPLATES.map((t) =>
    t.replace('{category}', category).replace('{zip}', zipCode)
  );
}

async function searchViaSerpApi(query: string): Promise<SearchResult[]> {
  const key = process.env.SERPAPI_KEY;
  if (!key) throw new Error('SERPAPI_KEY not set');

  console.log(`[Search] SerpAPI query: "${query}"`);

  const response = await axios.get('https://serpapi.com/search', {
    params: {
      engine: 'google',
      q: query,
      api_key: key,
      num: 5,
      gl: 'us',
      hl: 'en',
    },
    timeout: 10000,
  });

  const organic = response.data?.organic_results ?? [];
  console.log(`[Search] SerpAPI returned ${organic.length} organic results`);

  const items: SearchResult[] = [];
  for (const r of organic) {
    if (r.link && r.title) {
      items.push({
        title: r.title,
        url: r.link,
        snippet: r.snippet ?? '',
        source: new URL(r.link).hostname,
      });
    }
  }

  return items;
}

async function searchViaGoogleCSE(query: string): Promise<SearchResult[]> {
  const key = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx) throw new Error('GOOGLE_CSE_API_KEY or GOOGLE_CSE_ID not set');

  console.log(`[Search] Google CSE query: "${query}"`);

  const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
    params: { key, cx, q: query, num: 5 },
    timeout: 10000,
  });

  const googleItems = response.data?.items ?? [];
  console.log(`[Search] Google CSE returned ${googleItems.length} results`);

  const items: SearchResult[] = [];
  for (const r of googleItems) {
    if (r.link && r.title) {
      items.push({
        title: r.title,
        url: r.link,
        snippet: r.snippet ?? '',
        source: new URL(r.link).hostname,
      });
    }
  }

  return items;
}

function deduplicateResults(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

export async function searchLiveResources(
  category: string,
  zipCode: string
): Promise<SearchResult[]> {
  const provider = process.env.SEARCH_PROVIDER ?? 'serpapi';
  console.log(`[Search] Provider: ${provider}, category: ${category}, zip: ${zipCode}`);

  const queries = buildQueries(category, zipCode);
  const allResults: SearchResult[] = [];

  for (const query of queries.slice(0, 2)) {
    try {
      let results: SearchResult[];
      if (provider === 'google') {
        results = await searchViaGoogleCSE(query);
      } else {
        results = await searchViaSerpApi(query);
      }
      allResults.push(...results);
    } catch (err) {
      console.error(`[Search] FAILED for query "${query}":`, (err as Error).message);
    }
  }

  const deduped = deduplicateResults(allResults);
  console.log(`[Search] Total unique results: ${deduped.length}`);
  return deduped;
}

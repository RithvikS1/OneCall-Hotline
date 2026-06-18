import axios from 'axios';
import * as cheerio from 'cheerio';
import type { SearchResult } from './search';

export interface ExtractedResource {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  url: string;
  snippet: string;
  sourceDomain: string;
}

const PHONE_REGEX = /(\+?1[-.\s]?)?(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g;
const ADDRESS_REGEX =
  /\d{1,5}\s+[\w\s.]+(?:Avenue|Ave|Street|St|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct|Place|Pl|Highway|Hwy)\b[^,\n]*/gi;

function extractPhones(text: string): string[] {
  const matches = [...text.matchAll(PHONE_REGEX)];
  return [...new Set(matches.map((m) => m[0].trim().replace(/\s+/g, ' ')))]
    .filter((p) => p.replace(/\D/g, '').length >= 10);
}

function extractAddress(text: string): string | null {
  const match = text.match(ADDRESS_REGEX);
  return match ? match[0].slice(0, 120).trim() : null;
}

function snippetIsRich(snippet: string): boolean {
  const hasPhone = extractPhones(snippet).length > 0;
  const hasAddress = ADDRESS_REGEX.test(snippet);
  const longEnough = snippet.length > 100;
  // Reset regex lastIndex after test()
  ADDRESS_REGEX.lastIndex = 0;
  return (hasPhone || hasAddress) && longEnough;
}

async function fetchPage(url: string): Promise<{ title: string; metaDesc: string; bodyText: string } | null> {
  try {
    const response = await axios.get(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CommunityHotlineBot/1.0)',
        Accept: 'text/html',
      },
      maxContentLength: 300_000,
    });

    const $ = cheerio.load(response.data as string);
    $('script, style, nav, footer, header').remove();

    const title = $('title').first().text().trim();
    const metaDesc =
      $('meta[name="description"]').attr('content') ??
      $('meta[property="og:description"]').attr('content') ??
      '';
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim().slice(0, 2000);

    return { title, metaDesc, bodyText };
  } catch {
    return null;
  }
}

async function extractResource(result: SearchResult): Promise<ExtractedResource> {
  let domain: string;
  try {
    domain = new URL(result.url).hostname.replace('www.', '');
  } catch {
    domain = result.source;
  }

  const base: ExtractedResource = {
    name: result.title,
    phone: null,
    address: null,
    website: result.url,
    description: result.snippet || null,
    url: result.url,
    snippet: result.snippet,
    sourceDomain: domain,
  };

  // Extract from snippet first — free, instant
  const snippetPhones = extractPhones(result.snippet);
  if (snippetPhones.length > 0) base.phone = snippetPhones[0];

  const snippetAddress = extractAddress(result.snippet);
  if (snippetAddress) base.address = snippetAddress;

  // Skip page fetch if the snippet already gave us enough
  if (snippetIsRich(result.snippet)) return base;

  const page = await fetchPage(result.url);
  if (!page) return base;

  if (!base.phone) {
    const phones = extractPhones(page.bodyText);
    if (phones.length > 0) base.phone = phones[0];
  }
  if (!base.address) base.address = extractAddress(page.bodyText);
  if (page.metaDesc && page.metaDesc.length > (base.description?.length ?? 0)) {
    base.description = page.metaDesc.slice(0, 200);
  }

  return base;
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function extractResources(results: SearchResult[]): Promise<ExtractedResource[]> {
  const batch = results.slice(0, 8).map((r) => extractResource(r));

  // Hard 6s cap on the whole batch — if pages are slow we use what we have
  const extracted = await withTimeout(
    Promise.all(batch),
    6000,
    await Promise.all(batch.map((p) => p.catch(() => null)))
      .then((r) => r.filter(Boolean) as ExtractedResource[])
  );

  const seen = { urls: new Set<string>(), names: new Set<string>(), phones: new Set<string>() };
  return extracted.filter((r): r is ExtractedResource => {
    if (!r) return false;
    const urlKey = r.url.toLowerCase();
    const nameKey = r.name.toLowerCase().slice(0, 40);
    const phoneKey = r.phone ?? '';

    if (seen.urls.has(urlKey)) return false;
    if (seen.names.has(nameKey)) return false;
    if (phoneKey && seen.phones.has(phoneKey)) return false;

    seen.urls.add(urlKey);
    seen.names.add(nameKey);
    if (phoneKey) seen.phones.add(phoneKey);
    return true;
  });
}

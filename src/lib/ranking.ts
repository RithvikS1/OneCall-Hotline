import type { ExtractedResource } from './resourceExtractor';

const TRUSTED_DOMAINS = [
  '.gov',
  '211',
  'unitedway',
  'foodbank',
  'salvationarmy',
  'catholiccharities',
  'redcross',
  'habitat',
  'goodwill',
  'communityaction',
  'socialservices',
  'helpinghands',
  'volunteersofamerica',
];

const AD_SPAM_SIGNALS = [
  'yellowpages',
  'yelp.com',
  'angi.com',
  'thumbtack',
  'homeadvisor',
  'bark.com',
  'gig-economy',
  'ad.',
  'ads.',
];

function domainScore(domain: string): number {
  const lower = domain.toLowerCase();
  if (AD_SPAM_SIGNALS.some((s) => lower.includes(s))) return -10;
  let score = 0;
  for (const trusted of TRUSTED_DOMAINS) {
    if (lower.includes(trusted)) {
      score += trusted === '.gov' ? 5 : 3;
      break;
    }
  }
  // Prefer .org over .com
  if (lower.endsWith('.org')) score += 2;
  return score;
}

function localRelevanceScore(resource: ExtractedResource, zipCode: string): number {
  const text = [resource.name, resource.description, resource.address, resource.snippet]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  let score = 0;
  if (text.includes(zipCode)) score += 4;

  return score;
}

function categoryScore(resource: ExtractedResource, category: string): number {
  const text = [resource.name, resource.description, resource.snippet]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return text.includes(category.toLowerCase()) ? 3 : 0;
}

export interface RankedResource extends ExtractedResource {
  confidenceScore: number;
}

export function rankResources(
  resources: ExtractedResource[],
  category: string,
  zipCode: string
): RankedResource[] {
  const scored = resources.map((r) => {
    let score = 0;
    score += localRelevanceScore(r, zipCode);
    score += categoryScore(r, category);
    score += domainScore(r.sourceDomain);
    score += r.phone ? 3 : 0;
    score += r.description && r.description.length > 40 ? 1 : 0;
    score += r.address ? 1 : 0;

    return { ...r, confidenceScore: Math.max(0, score) };
  });

  return scored
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 3);
}

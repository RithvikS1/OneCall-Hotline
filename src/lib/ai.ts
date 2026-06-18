import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type NeedCategory =
  | 'housing'
  | 'food'
  | 'healthcare'
  | 'benefits'
  | 'transportation'
  | 'legal'
  | 'emergency'
  | 'crisis'
  | 'other';

export interface ClassifyResult {
  category: NeedCategory;
  confidence: number;
  reasoning: string;
}

export async function classifyNeed(transcript: string): Promise<ClassifyResult> {
  console.log(`[AI] classifyNeed called with: "${transcript}"`);
  console.log(`[AI] Using OpenAI key ending in: ...${process.env.OPENAI_API_KEY?.slice(-6)}`);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a social services intake assistant. Classify the caller's need into exactly one category.

Categories:
- housing: homelessness, eviction, rent assistance, shelter
- food: food bank, SNAP, hunger, meals
- healthcare: medical, dental, mental health services (not crisis), insurance
- benefits: unemployment, disability, TANF, government assistance
- transportation: bus pass, rides, vehicle assistance
- legal: immigration, domestic violence, tenant rights, criminal record
- emergency: life-threatening, requires 911 immediately
- crisis: suicidal thoughts, mental health emergency, self-harm, calls 988
- other: anything else

Return ONLY valid JSON: { "category": "<category>", "confidence": <0-1>, "reasoning": "<one sentence>" }`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0,
      max_tokens: 150,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    console.log(`[AI] classifyNeed raw response: ${text}`);
    const parsed = JSON.parse(text);
    const result = {
      category: parsed.category as NeedCategory,
      confidence: Number(parsed.confidence),
      reasoning: parsed.reasoning,
    };
    console.log(`[AI] classifyNeed result:`, result);
    return result;
  } catch (err) {
    console.error('[AI] classifyNeed FAILED:', err);
    return { category: 'other', confidence: 0.5, reasoning: 'Classification failed, defaulting to other.' };
  }
}

export interface ExtractZipResult {
  zipCode: string | null;
}

export async function extractZip(transcript: string): Promise<ExtractZipResult> {
  console.log(`[AI] extractZip called with: "${transcript}"`);

  // Try regex first — fast and free
  const match = transcript.match(/\b(\d{5})(?:-\d{4})?\b/);
  if (match) {
    console.log(`[AI] extractZip found via regex: ${match[1]}`);
    return { zipCode: match[1] };
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Extract a US ZIP code from the text. If the user says a city/town name, infer the most common ZIP. Return ONLY valid JSON: { "zipCode": "<5-digit ZIP or null>" }`,
        },
        { role: 'user', content: transcript },
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    console.log(`[AI] extractZip raw response: ${text}`);
    const parsed = JSON.parse(text);
    const result = { zipCode: parsed.zipCode ?? null };
    console.log(`[AI] extractZip result:`, result);
    return result;
  } catch (err) {
    console.error('[AI] extractZip FAILED:', err);
    return { zipCode: null };
  }
}

export interface Resource {
  name: string;
  phone: string | null;
  address: string | null;
  website: string | null;
  description: string | null;
  url: string;
}

export async function generateSpokenSummary(resources: Resource[]): Promise<string> {
  if (resources.length === 0) {
    return "I couldn't find strong local matches, but I've texted you information to reach 211 for local help.";
  }

  try {
    const resourceList = resources
      .slice(0, 3)
      .map((r, i) => `${i + 1}. ${r.name}${r.phone ? ', phone: ' + r.phone : ''}`)
      .join('; ');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful voice assistant. Summarize the resources in 1-2 spoken sentences. Be brief and natural. Do not list all details — just say you found resources and texted them.`,
        },
        { role: 'user', content: `Resources found: ${resourceList}` },
      ],
      temperature: 0.4,
      max_tokens: 80,
    });

    return response.choices[0]?.message?.content?.trim() ?? "I found some resources and texted them to you.";
  } catch {
    return "I found some local resources and texted them to you. Please check your messages.";
  }
}

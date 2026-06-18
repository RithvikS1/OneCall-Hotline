import { Request, Response, NextFunction } from 'express';

export function verifyElevenLabsSecret(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ELEVENLABS_WEBHOOK_SECRET;
  const provided = req.headers['x-elevenlabs-secret'];

  if (!expected) {
    console.error('[ElevenLabs] ELEVENLABS_WEBHOOK_SECRET not set — rejecting all tool calls');
    res.status(401).json({ error: 'Server misconfigured: webhook secret not set' });
    return;
  }

  if (!provided || provided !== expected) {
    console.warn('[ElevenLabs] Unauthorized tool call — bad or missing x-elevenlabs-secret');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
}

export interface FormattedResource {
  name: string;
  phone: string | null;
  address: string | null;
  description: string | null;
  url: string;
  score: number;
}

export function buildSpokenResourceList(resources: FormattedResource[], category: string, zip: string): string {
  if (resources.length === 0) {
    return `I wasn't able to find verified local resources for ${category} near ${zip}. I'd recommend calling 2-1-1, which connects you to local assistance 24 hours a day.`;
  }

  const lines = resources.map((r, i) => {
    const parts = [`Number ${i + 1}: ${r.name}`];
    if (r.phone) parts.push(`phone number ${r.phone}`);
    if (r.address) parts.push(`located at ${r.address}`);
    if (r.description) parts.push(r.description.slice(0, 120));
    return parts.join(', ');
  });

  return (
    `I found ${resources.length} resource${resources.length > 1 ? 's' : ''} for ${category} near ${zip}. ` +
    lines.join('. ') +
    '. Would you like me to repeat any of those, or do you have questions about any of them?'
  );
}

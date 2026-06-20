import express from 'express';
import path from 'path';
import fs from 'fs';
import voiceRouter from './routes/voice';
import smsRouter from './routes/sms';
import elevenLabsRouter from './routes/elevenlabs';
import impactRouter from './routes/impact';
import { classifyNeed, extractZip } from './lib/ai';
import { searchLiveResources } from './lib/search';
import { extractResources } from './lib/resourceExtractor';
import { rankResources } from './lib/ranking';
import { sendResourceSMS } from './lib/twilio';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Twilio sends form-encoded bodies
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: {
      openai: process.env.OPENAI_API_KEY ? `set (ends in ...${process.env.OPENAI_API_KEY.slice(-6)})` : 'MISSING',
      twilio_sid: process.env.TWILIO_ACCOUNT_SID ? 'set' : 'MISSING',
      twilio_phone: process.env.TWILIO_PHONE_NUMBER ?? 'MISSING',
      supabase: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      serpapi: process.env.SERPAPI_KEY ? 'set' : 'MISSING',
      search_provider: process.env.SEARCH_PROVIDER ?? 'serpapi',
      elevenlabs_key: process.env.ELEVENLABS_API_KEY ? 'set' : 'not set',
      elevenlabs_agent: process.env.ELEVENLABS_AGENT_ID ?? 'not set',
      elevenlabs_secret: process.env.ELEVENLABS_WEBHOOK_SECRET ? 'set' : 'MISSING',
    },
  });
});

// POST /test — run the full pipeline without a real phone call
// Body: { need: string, zip: string, phone?: string }
app.post('/test', async (req, res) => {
  const { need, zip, phone } = req.body as { need?: string; zip?: string; phone?: string };

  if (!need || !zip) {
    res.status(400).json({ error: 'Provide { need, zip } in the request body' });
    return;
  }

  const log: string[] = [];
  const tap = (msg: string) => { console.log(msg); log.push(msg); };

  try {
    tap(`[Test] Step 1: classifyNeed("${need}")`);
    const classification = await classifyNeed(need);
    tap(`[Test] Classification: ${JSON.stringify(classification)}`);

    tap(`[Test] Step 2: extractZip("${zip}")`);
    const { zipCode } = await extractZip(zip);
    tap(`[Test] ZIP extracted: ${zipCode}`);

    if (!zipCode) {
      res.json({ log, error: 'Could not extract a ZIP code from the zip input' });
      return;
    }

    tap(`[Test] Step 3: searchLiveResources(${classification.category}, ${zipCode})`);
    const searchResults = await searchLiveResources(classification.category, zipCode);
    tap(`[Test] Search results count: ${searchResults.length}`);

    if (searchResults.length === 0) {
      res.json({ log, warning: 'Search returned 0 results — check SERPAPI_KEY' });
      return;
    }

    tap(`[Test] Step 4: extractResources`);
    const extracted = await extractResources(searchResults);
    tap(`[Test] Extracted ${extracted.length} resources`);

    tap(`[Test] Step 5: rankResources`);
    const ranked = rankResources(extracted, classification.category, zipCode);
    tap(`[Test] Top ${ranked.length} ranked resources: ${ranked.map(r => r.name).join(', ')}`);

    if (phone) {
      tap(`[Test] Step 6: sendResourceSMS to ${phone}`);
      await sendResourceSMS(phone, classification.category, zipCode, ranked);
      tap(`[Test] SMS sent!`);
    }

    res.json({
      log,
      classification,
      zipCode,
      searchResultCount: searchResults.length,
      rankedResources: ranked.map(r => ({
        name: r.name,
        phone: r.phone,
        address: r.address,
        website: r.website,
        description: r.description,
        score: r.confidenceScore,
      })),
      smsSent: !!phone,
    });
  } catch (err) {
    const msg = (err as Error).message;
    tap(`[Test] ERROR: ${msg}`);
    res.status(500).json({ log, error: msg });
  }
});

app.use('/api', impactRouter);
app.use('/voice', voiceRouter);
app.use('/sms', smsRouter);
app.use('/elevenlabs', elevenLabsRouter);

const clientDist = path.join(__dirname, '..', 'client', 'dist');
const hasClientBuild = fs.existsSync(path.join(clientDist, 'index.html'));

if (hasClientBuild) {
  app.use(express.static(clientDist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/voice') ||
      req.path.startsWith('/sms') ||
      req.path.startsWith('/elevenlabs') ||
      req.path === '/health' ||
      req.path === '/test'
    ) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.status(503).json({
      error: 'Landing page not built',
      hint: 'Run npm run build:client from the project root, then restart the server.',
    });
  });
}

// Catch-all for unknown API routes
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const server = app.listen(PORT, () => {
  console.log(`Community Hotline server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Change PORT in .env.`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  process.exit(1);
});

export default app;

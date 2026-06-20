import { Router, Request, Response } from 'express';
import { verifyElevenLabsSecret, buildSpokenResourceList } from '../lib/elevenlabs';
import { classifyNeed, generateSpokenSummary } from '../lib/ai';
import { searchLiveResources } from '../lib/search';
import { extractResources } from '../lib/resourceExtractor';
import { rankResources } from '../lib/ranking';
import {
  upsertCaller,
  saveConversationTurn,
  saveLastResources,
  getLastResources,
  saveReferrals,
  createElevenLabsSession,
  updateElevenLabsSession,
} from '../lib/supabase';

const router = Router();

// All tool routes require the shared secret header
router.use('/tools', verifyElevenLabsSecret);

// ── POST /elevenlabs/tools/classify-need ──────────────────────────────────────
router.post('/tools/classify-need', async (req: Request, res: Response) => {
  const { callerPhone, text } = req.body as { callerPhone?: string; text?: string };
  console.log(`[ElevenLabs] tool called: classify-need`);
  console.log(`[ElevenLabs] callerPhone: ${callerPhone}`);
  console.log(`[ElevenLabs] text: "${text}"`);

  if (!callerPhone || !text) {
    res.status(400).json({ error: 'callerPhone and text are required' });
    return;
  }

  try {
    const caller = await upsertCaller(callerPhone);
    const result = await classifyNeed(text);

    console.log(`[ElevenLabs] classify-need result: ${result.category} (${result.confidence})`);

    res.json({
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
      callerId: caller.id,
    });
  } catch (err) {
    console.error('[ElevenLabs] classify-need error:', (err as Error).message);
    res.status(500).json({ error: 'Classification failed', category: 'other', confidence: 0 });
  }
});

// ── POST /elevenlabs/tools/search-resources ───────────────────────────────────
router.post('/tools/search-resources', async (req: Request, res: Response) => {
  const { callerPhone, category, zip } = req.body as {
    callerPhone?: string;
    category?: string;
    zip?: string;
  };
  console.log(`[ElevenLabs] tool called: search-resources`);
  console.log(`[ElevenLabs] callerPhone: ${callerPhone}`);
  console.log(`[ElevenLabs] category: ${category}`);
  console.log(`[ElevenLabs] zip: ${zip}`);

  if (!callerPhone || !category || !zip) {
    res.status(400).json({ error: 'callerPhone, category, and zip are required' });
    return;
  }

  try {
    const caller = await upsertCaller(callerPhone, zip);
    const elSession = await createElevenLabsSession(caller.id, {
      detectedCategory: category,
      zipCode: zip,
      fromPhone: callerPhone,
    });

    const searchResults = await searchLiveResources(category, zip);

    if (searchResults.length === 0) {
      console.log(`[ElevenLabs] search-resources: no results for ${category} / ${zip}`);
      if (elSession) await updateElevenLabsSession(elSession.id, { status: 'no_results' });
      const fallback = buildSpokenResourceList([], category, zip);
      res.json({ resources: [], spokenSummary: fallback });
      return;
    }

    const extracted = await extractResources(searchResults);
    const ranked = rankResources(extracted, category, zip);

    const formatted = ranked.map((r) => ({
      name: r.name,
      phone: r.phone,
      address: r.address,
      description: r.description,
      url: r.url,
      score: r.confidenceScore,
    }));

    console.log(`[ElevenLabs] returned resources: ${formatted.map(r => r.name).join(', ')}`);

    await saveLastResources(caller.id, category, zip, formatted);

    await saveReferrals(
      caller.id,
      null,
      formatted.map(r => ({ title: r.name, url: r.url, phone: r.phone, address: r.address }))
    ).catch((e: Error) => console.error('[DB] saveReferrals failed:', e.message));

    if (elSession) await updateElevenLabsSession(elSession.id, { status: 'resources_sent' });

    const spokenSummary = buildSpokenResourceList(formatted, category, zip);

    res.json({ resources: formatted, spokenSummary });
  } catch (err) {
    console.error('[ElevenLabs] search-resources error:', (err as Error).message);
    res.status(500).json({
      error: 'Search failed',
      resources: [],
      spokenSummary: "I'm having trouble searching right now. Please try calling 2-1-1 for local help.",
    });
  }
});

// ── POST /elevenlabs/tools/get-last-resources ─────────────────────────────────
router.post('/tools/get-last-resources', async (req: Request, res: Response) => {
  const { callerPhone } = req.body as { callerPhone?: string };
  console.log(`[ElevenLabs] tool called: get-last-resources`);
  console.log(`[ElevenLabs] callerPhone: ${callerPhone}`);

  if (!callerPhone) {
    res.status(400).json({ error: 'callerPhone is required' });
    return;
  }

  try {
    const caller = await upsertCaller(callerPhone);
    const resources = await getLastResources(caller.id);
    console.log(`[ElevenLabs] get-last-resources: found ${resources.length} stored resources`);
    res.json({ resources });
  } catch (err) {
    console.error('[ElevenLabs] get-last-resources error:', (err as Error).message);
    res.status(500).json({ error: 'Failed to retrieve resources', resources: [] });
  }
});

// ── POST /elevenlabs/tools/save-message ──────────────────────────────────────
router.post('/tools/save-message', async (req: Request, res: Response) => {
  const { callerPhone, role, content } = req.body as {
    callerPhone?: string;
    role?: string;
    content?: string;
  };
  console.log(`[ElevenLabs] tool called: save-message | role: ${role}`);

  if (!callerPhone || !role || !content) {
    res.status(400).json({ error: 'callerPhone, role, and content are required' });
    return;
  }

  try {
    const caller = await upsertCaller(callerPhone);
    await saveConversationTurn({ callerId: caller.id, role, content });
    res.json({ ok: true });
  } catch (err) {
    console.error('[ElevenLabs] save-message error:', (err as Error).message);
    res.status(500).json({ ok: false, error: 'Failed to save message' });
  }
});

export default router;

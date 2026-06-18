import { Router, Request, Response } from 'express';
import {
  welcomeTwiML,
  askForZipTwiML,
  emergencyTwiML,
  crisisTwiML,
  searchingTwiML,
  noResultsTwiML,
  errorTwiML,
  repeatAskForZipTwiML,
} from '../lib/twiml';
import { classifyNeed, extractZip } from '../lib/ai';
import { searchLiveResources } from '../lib/search';
import { extractResources } from '../lib/resourceExtractor';
import { rankResources } from '../lib/ranking';
import {
  upsertCaller,
  createCallSession,
  updateCallSession,
  getCallSessionByCallSid,
  saveMessage,
  saveSearchResults,
  saveReferrals,
} from '../lib/supabase';
import { sendResourceSMS, sendCrisisSMS, sendNoResultsSMS } from '../lib/twilio';

const router = Router();

function twimlResponse(res: Response, xml: string): void {
  res.set('Content-Type', 'text/xml');
  res.send(xml);
}

// POST /voice — entry point for inbound calls
router.post('/', async (req: Request, res: Response) => {
  const fromPhone: string = req.body?.From ?? '';
  const callSid: string = req.body?.CallSid ?? '';
  const toPhone: string = req.body?.To ?? '';
  console.log(`[Voice] Inbound call from ${fromPhone}, CallSid: ${callSid}`);

  try {
    const caller = await upsertCaller(fromPhone);
    const session = await createCallSession({
      callerId: caller.id,
      twilioCallSid: callSid,
      fromPhone,
      toPhone,
    });

    await saveMessage({
      callSessionId: session.id,
      role: 'system',
      channel: 'voice',
      content: `Inbound call from ${fromPhone}`,
    });
  } catch (err) {
    console.error('Failed to record call start:', (err as Error).message);
    // Don't crash — still return valid TwiML
  }

  twimlResponse(res, welcomeTwiML());
});

// POST /voice/handle-speech — receives what the caller said about their need
router.post('/handle-speech', async (req: Request, res: Response) => {
  const speechResult: string = req.body?.SpeechResult ?? '';
  const callSid: string = req.body?.CallSid ?? '';
  const fromPhone: string = req.body?.From ?? '';
  console.log(`[Voice] handle-speech | CallSid: ${callSid} | Speech: "${speechResult}"`);

  try {
    const session = await getCallSessionByCallSid(callSid);

    if (session) {
      await saveMessage({
        callSessionId: session.id,
        role: 'user',
        channel: 'voice',
        content: speechResult,
      });
    }

    const { category, confidence, reasoning } = await classifyNeed(speechResult);

    if (session) {
      await updateCallSession(session.id, { detected_category: category, status: 'classified' });
      await saveMessage({
        callSessionId: session.id,
        role: 'assistant',
        channel: 'system',
        content: `Classified as: ${category} (confidence: ${confidence}) — ${reasoning}`,
      });
    }

    console.log(`[Voice] Classified as: ${category}`);

    if (category === 'emergency') {
      if (session) await updateCallSession(session.id, { status: 'emergency' });
      return twimlResponse(res, emergencyTwiML());
    }

    if (category === 'crisis') {
      if (session) await updateCallSession(session.id, { status: 'crisis' });
      try {
        await sendCrisisSMS(fromPhone);
      } catch (smsErr) {
        console.error('Failed to send crisis SMS:', (smsErr as Error).message);
      }
      return twimlResponse(res, crisisTwiML());
    }

    return twimlResponse(res, askForZipTwiML());
  } catch (err) {
    console.error('handle-speech error:', err);
    return twimlResponse(res, errorTwiML());
  }
});

// POST /voice/handle-zip — receives ZIP code from caller
router.post('/handle-zip', async (req: Request, res: Response) => {
  const speechResult: string = req.body?.SpeechResult ?? '';
  const callSid: string = req.body?.CallSid ?? '';
  const fromPhone: string = req.body?.From ?? '';
  console.log(`[Voice] handle-zip | CallSid: ${callSid} | Speech: "${speechResult}"`);

  // Extract ZIP first — fast, no API call if regex hits
  let zipCode: string | null = null;
  try {
    const extracted = await extractZip(speechResult);
    zipCode = extracted.zipCode;
  } catch {
    // fall through to repeat ask
  }

  if (!zipCode) {
    console.log(`[Voice] No ZIP extracted from: "${speechResult}" — asking again`);
    return twimlResponse(res, repeatAskForZipTwiML());
  }

  // Respond to Twilio IMMEDIATELY — before any slow work
  // Twilio times out webhooks after ~15s; search + extraction can take 30s+
  twimlResponse(res, searchingTwiML());

  // All slow work runs in the background after Twilio gets its response
  setImmediate(async () => {
    try {
      const session = await getCallSessionByCallSid(callSid);
      const category: string = session?.detected_category ?? 'other';
      console.log(`[Voice] ZIP: ${zipCode}, Category: ${category}`);

      if (session) {
        await saveMessage({ callSessionId: session.id, role: 'user', channel: 'voice', content: `ZIP input: ${speechResult}` });
        await updateCallSession(session.id, { zip_code: zipCode, status: 'searching' });
      }
      await upsertCaller(fromPhone, zipCode!);

      const searchResults = await searchLiveResources(category, zipCode!);
      console.log(`[Voice] Search returned ${searchResults.length} results`);

      if (searchResults.length === 0) {
        if (session) await updateCallSession(session.id, { status: 'no_results' });
        await sendNoResultsSMS(fromPhone).catch((e: Error) => console.error('[SMS] no-results failed:', e.message));
        return;
      }

      const extracted = await extractResources(searchResults);
      const ranked = rankResources(extracted, category, zipCode!);
      console.log(`[Voice] Ranked ${ranked.length} resources:`, ranked.map(r => r.name));

      if (session) {
        await saveSearchResults(session.id, `${category} resources near ${zipCode}`, ranked.map((r) => ({
          title: r.name, url: r.url, snippet: r.snippet,
          extractedName: r.name, extractedPhone: r.phone, extractedAddress: r.address,
          extractedWebsite: r.website, extractedDescription: r.description,
          sourceDomain: r.sourceDomain, confidenceScore: r.confidenceScore,
        }))).catch((e: Error) => console.error('[DB] saveSearchResults failed:', e.message));

        await saveReferrals(session.caller_id ?? session.callers?.id, session.id,
          ranked.map((r) => ({ title: r.name, url: r.url, phone: r.phone, address: r.address }))
        ).catch((e: Error) => console.error('[DB] saveReferrals failed:', e.message));

        await updateCallSession(session.id, { status: 'resources_sent' }).catch(() => {});
      }

      await sendResourceSMS(fromPhone, category, zipCode!, ranked)
        .catch((e: Error) => console.error('[SMS] sendResourceSMS failed:', e.message));

    } catch (err) {
      console.error('[Voice] Background search/SMS error:', (err as Error).message);
      await sendNoResultsSMS(fromPhone).catch(() => {});
    }
  });
});

// POST /voice/elevenlabs — forward inbound Twilio call to ElevenLabs agent
// Set this as your Twilio webhook when you want ElevenLabs to handle the conversation.
router.post('/elevenlabs', (_req: Request, res: Response) => {
  const agentId = process.env.ELEVENLABS_AGENT_ID ?? '';

  if (!agentId) {
    console.error('[Voice] ELEVENLABS_AGENT_ID not set — falling back to standard flow');
    return twimlResponse(res, welcomeTwiML());
  }

  console.log(`[Voice] Forwarding call to ElevenLabs agent: ${agentId}`);

  const apiKey = process.env.ELEVENLABS_API_KEY ?? '';
  const wsUrl = apiKey
    ? `wss://api.elevenlabs.io/v1/convai/twilio?agent_id=${agentId}&amp;xi_api_key=${apiKey}`
    : `wss://api.elevenlabs.io/v1/convai/twilio?agent_id=${agentId}`;

  res.set('Content-Type', 'text/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${wsUrl}" />
  </Connect>
</Response>`
  );
});

export default router;

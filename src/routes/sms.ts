import { Router, Request, Response } from 'express';
import { classifyNeed, extractZip } from '../lib/ai';
import { searchLiveResources } from '../lib/search';
import { extractResources } from '../lib/resourceExtractor';
import { rankResources } from '../lib/ranking';
import {
  upsertCaller,
  getCallerByPhone,
  saveMessage,
  saveSearchResults,
  saveReferrals,
  createCallSession,
  updateCallSession,
} from '../lib/supabase';
import { sendResourceSMS, sendNoResultsSMS, sendSMS } from '../lib/twilio';

const router = Router();

// Inbound SMS state is managed per-phone in a lightweight in-process map
// For production, persist this in Supabase or Redis
const smsState = new Map<string, { step: 'need' | 'zip'; category?: string }>();

function twimlResponse(res: Response, body: string): void {
  res.set('Content-Type', 'text/xml');
  res.send(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</Message></Response>`
  );
}

router.post('/inbound', async (req: Request, res: Response) => {
  const fromPhone: string = req.body?.From ?? '';
  const body: string = (req.body?.Body ?? '').trim();

  if (!fromPhone) {
    res.status(400).send('Missing From');
    return;
  }

  try {
    const caller = await upsertCaller(fromPhone);

    await saveMessage({
      callSessionId: 'sms-' + Date.now(), // placeholder — real sessions tied to calls
      role: 'user',
      channel: 'sms',
      content: body,
    }).catch(() => {});

    const upperBody = body.toUpperCase().trim();

    // HELP command — restart flow
    if (upperBody === 'HELP' || upperBody === 'START') {
      smsState.set(fromPhone, { step: 'need' });
      return twimlResponse(res, "What do you need help with? (e.g. housing, food, healthcare, transportation)");
    }

    const state = smsState.get(fromPhone);

    // If no state or fresh session, classify the message as a need statement
    if (!state || state.step === 'need') {
      const { category } = await classifyNeed(body);

      if (category === 'emergency') {
        smsState.delete(fromPhone);
        return twimlResponse(res, "If this is an emergency, please call 9-1-1 immediately.");
      }

      if (category === 'crisis') {
        smsState.delete(fromPhone);
        return twimlResponse(
          res,
          "For mental health crisis support, call or text 988 (Suicide & Crisis Lifeline). Available 24/7. You are not alone."
        );
      }

      // Check if caller already has a ZIP on file
      const existingCaller = await getCallerByPhone(fromPhone);
      if (existingCaller?.zip_code) {
        // Skip to search immediately
        await runSearchAndReply(res, fromPhone, caller.id, category, existingCaller.zip_code);
        smsState.delete(fromPhone);
        return;
      }

      smsState.set(fromPhone, { step: 'zip', category });
      return twimlResponse(res, `Got it — looking for ${category} help. What is your ZIP code?`);
    }

    // ZIP step
    if (state.step === 'zip') {
      const { zipCode } = await extractZip(body);

      if (!zipCode) {
        return twimlResponse(res, "I didn't catch a valid ZIP code. Please reply with your 5-digit ZIP.");
      }

      await upsertCaller(fromPhone, zipCode);
      const category = state.category ?? 'other';
      smsState.delete(fromPhone);

      await runSearchAndReply(res, fromPhone, caller.id, category, zipCode);
      return;
    }

    // Fallback — treat any unrecognized message as a new need
    smsState.set(fromPhone, { step: 'need' });
    const { category } = await classifyNeed(body);

    if (category === 'emergency') {
      smsState.delete(fromPhone);
      return twimlResponse(res, "If this is an emergency, please call 9-1-1 immediately.");
    }

    if (category === 'crisis') {
      smsState.delete(fromPhone);
      return twimlResponse(
        res,
        "For mental health crisis support, call or text 988 (Suicide & Crisis Lifeline). Available 24/7."
      );
    }

    smsState.set(fromPhone, { step: 'zip', category });
    return twimlResponse(res, `Got it — looking for ${category} help. What is your ZIP code?`);
  } catch (err) {
    console.error('SMS inbound error:', err);
    return twimlResponse(res, "Something went wrong. Please call 211 for local assistance.");
  }
});

async function runSearchAndReply(
  res: Response,
  fromPhone: string,
  callerId: string,
  category: string,
  zipCode: string
): Promise<void> {
  // Create a synthetic session for SMS interactions
  let sessionId: string | null = null;
  try {
    const session = await createCallSession({
      callerId,
      twilioCallSid: `sms-${Date.now()}`,
      fromPhone,
      toPhone: process.env.TWILIO_PHONE_NUMBER ?? '',
    });
    sessionId = session.id;
    await updateCallSession(session.id, { detected_category: category, zip_code: zipCode, status: 'sms_search' });
  } catch {
    // Non-fatal
  }

  const searchResults = await searchLiveResources(category, zipCode);

  if (searchResults.length === 0) {
    await sendNoResultsSMS(fromPhone).catch(console.error);
    twimlResponse(
      res,
      "I couldn't find a strong local match. Calling 211 is your best next step for local assistance."
    );
    return;
  }

  const extracted = await extractResources(searchResults);
  const ranked = rankResources(extracted, category, zipCode);

  if (sessionId) {
    await saveSearchResults(
      sessionId,
      `${category} resources near ${zipCode}`,
      ranked.map((r) => ({
        title: r.name,
        url: r.url,
        snippet: r.snippet,
        extractedName: r.name,
        extractedPhone: r.phone,
        extractedAddress: r.address,
        extractedWebsite: r.website,
        extractedDescription: r.description,
        sourceDomain: r.sourceDomain,
        confidenceScore: r.confidenceScore,
      }))
    ).catch(console.error);

    await saveReferrals(
      callerId,
      sessionId,
      ranked.map((r) => ({ title: r.name, url: r.url, phone: r.phone, address: r.address }))
    ).catch(console.error);

    await updateCallSession(sessionId, { status: 'resources_sent' }).catch(console.error);
  }

  await sendResourceSMS(fromPhone, category, zipCode, ranked).catch(console.error);

  twimlResponse(res, `I found ${ranked.length} resource(s) for ${category} near ${zipCode} and sent them to you now.`);
}

export default router;

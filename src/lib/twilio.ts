import twilio from 'twilio';
import type { RankedResource } from './ranking';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = process.env.TWILIO_PHONE_NUMBER ?? '';

function formatResource(r: RankedResource, index: number): string {
  const lines = [`${index}. ${r.name}`];
  if (r.phone) lines.push(`   Phone: ${r.phone}`);
  if (r.address) lines.push(`   Address: ${r.address}`);
  if (r.website) lines.push(`   Website: ${r.website}`);
  return lines.join('\n');
}

export async function sendResourceSMS(
  toPhone: string,
  category: string,
  zipCode: string,
  resources: RankedResource[]
): Promise<void> {
  const categoryLabel = category.charAt(0).toUpperCase() + category.slice(1);
  const header = `Here are resources for ${categoryLabel} near ${zipCode}:\n\n`;
  const body = resources.map((r, i) => formatResource(r, i + 1)).join('\n\n');
  const footer = '\n\nReply HELP if you need more.';
  const message = (header + body + footer).slice(0, 1600);

  console.log(`[SMS] Sending resource SMS to ${toPhone} from ${FROM}`);
  console.log(`[SMS] Message preview (first 200 chars): ${message.slice(0, 200)}`);

  const result = await client.messages.create({ from: FROM, to: toPhone, body: message });
  console.log(`[SMS] Sent! SID: ${result.sid}, status: ${result.status}`);
}

export async function sendCrisisSMS(toPhone: string): Promise<void> {
  console.log(`[SMS] Sending crisis SMS to ${toPhone}`);
  const result = await client.messages.create({
    from: FROM,
    to: toPhone,
    body: 'Mental health crisis support:\n\n988 Suicide & Crisis Lifeline\nCall or text: 988\nChat: 988lifeline.org\n\nAvailable 24/7. You are not alone.',
  });
  console.log(`[SMS] Crisis SMS sent. SID: ${result.sid}`);
}

export async function sendNoResultsSMS(toPhone: string): Promise<void> {
  console.log(`[SMS] Sending no-results SMS to ${toPhone}`);
  const result = await client.messages.create({
    from: FROM,
    to: toPhone,
    body: "I couldn't verify a strong local match. You can call 211 for local assistance, or reply HELP and describe your need again.",
  });
  console.log(`[SMS] No-results SMS sent. SID: ${result.sid}`);
}

export async function sendSMS(toPhone: string, body: string): Promise<void> {
  console.log(`[SMS] Sending SMS to ${toPhone}`);
  const result = await client.messages.create({ from: FROM, to: toPhone, body });
  console.log(`[SMS] SMS sent. SID: ${result.sid}`);
}

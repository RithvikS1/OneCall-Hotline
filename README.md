# Community Hotline

AI-powered phone hotline that connects callers to local social services via voice + SMS.  
Stack: Node.js · TypeScript · Express · Twilio · OpenAI · SerpAPI · Supabase

---

## How It Works

1. User calls your Twilio number
2. AI asks what they need help with
3. AI classifies the need (housing, food, healthcare, etc.)
4. Emergency → tells caller to call 911 and ends
5. Crisis → tells caller to call/text 988, texts the number, ends
6. Otherwise → asks for ZIP code
7. Runs live web search for local resources
8. Extracts & ranks top 3 results
9. Texts the caller those resources
10. Confirms by voice and ends call

Users can also text the number directly and get the same resource lookup flow.

---

## Setup

### 1. Clone and install

```bash
git clone <repo>
cd godhotline
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env` and fill in all values:

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `PORT` | Local server port (default 3000) |
| `OPENAI_API_KEY` | OpenAI API key (GPT-4o-mini used) |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number in E.164 format (e.g. +15551234567) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (not anon key) |
| `SEARCH_PROVIDER` | `serpapi` (default) or `google` |
| `SERPAPI_KEY` | SerpAPI key — get one at serpapi.com |
| `GOOGLE_CSE_API_KEY` | Google Custom Search API key (optional fallback) |
| `GOOGLE_CSE_ID` | Google Custom Search Engine ID (optional fallback) |
| `BASE_URL` | Public base URL when deployed (e.g. https://abc.ngrok.io) — leave empty for local dev with ngrok |

### 3. Supabase schema

In your Supabase project → SQL Editor, run the contents of `src/db/schema.sql`.

### 4. Run locally with ngrok

```bash
# Terminal 1 — start the server
npm run dev

# Terminal 2 — expose it publicly
ngrok http 3000
```

Copy the ngrok HTTPS URL (e.g. `https://abc123.ngrok.io`) and set it in Twilio.

### 5. Twilio webhook setup

In your [Twilio Console](https://console.twilio.com):

**Voice:**
- Go to Phone Numbers → Manage → your number
- Under "Voice & Fax" → "A Call Comes In"
- Set to **Webhook** → `https://abc123.ngrok.io/voice`
- HTTP method: **POST**

**SMS:**
- On the same number page → "Messaging" → "A Message Comes In"
- Set to **Webhook** → `https://abc123.ngrok.io/sms/inbound`
- HTTP method: **POST**

---

## Webhook Routes

| Route | Method | Description |
|---|---|---|
| `/health` | GET | Health check |
| `/voice` | POST | Inbound call entry point |
| `/voice/handle-speech` | POST | Receives caller's stated need |
| `/voice/handle-zip` | POST | Receives caller's ZIP code |
| `/sms/inbound` | POST | Inbound SMS handler |

---

## Build & Deploy

```bash
# Compile TypeScript
npm run build

# Run compiled output
npm start
```

For production, deploy to Railway, Render, Fly.io, or any Node.js host.  
Set `BASE_URL` in your environment to your public URL (no trailing slash).

---

## Safety Rules

- **Emergency** (`category = emergency`) → "Call 911" + hang up
- **Crisis** (`category = crisis`) → "Call/text 988" + SMS 988 info + hang up
- No medical, legal, or financial advice is given
- Only connects users to real, publicly listed resources
- If search fails, falls back to recommending 211

---

## Architecture

```
src/
  server.ts              Express app entry point
  routes/
    voice.ts             Twilio voice webhook handlers
    sms.ts               Twilio SMS webhook handler
  lib/
    ai.ts                OpenAI: classify need, extract ZIP, spoken summary
    search.ts            SerpAPI / Google CSE live search
    resourceExtractor.ts Fetch pages, extract phone/address/description
    ranking.ts           Score and rank resources by trust + relevance
    twiml.ts             TwiML XML response builders
    twilio.ts            Twilio SMS sender
    supabase.ts          Supabase DB operations
    phone.ts             Phone number normalization
  db/
    schema.sql           Supabase Postgres schema
```

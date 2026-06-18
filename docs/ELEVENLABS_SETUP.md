# ElevenLabs Conversational AI Setup

This guide connects your ElevenLabs AI agent to the Community Hotline backend.
The agent handles the full voice conversation; your backend provides real-time search tools.

---

## Architecture

```
Caller → Twilio number → ElevenLabs agent (voice)
                              ↓ tool calls (HTTPS)
                         Your backend (Express)
                              ↓
                    SerpAPI → Resource extractor → Supabase
```

---

## Step 1: Run the Supabase migration

In Supabase → SQL Editor, run `src/db/elevenlabs_migration.sql`.
This adds `elevenlabs_sessions`, `conversation_turns`, and `last_resources` tables.

---

## Step 2: Set up ngrok

```bash
ngrok http 3000
```

Copy your HTTPS URL, e.g. `https://abc123.ngrok-free.app`.
Set it in `.env`:
```
APP_BASE_URL=https://abc123.ngrok-free.app
```

---

## Step 3: Create the ElevenLabs agent

1. Go to [elevenlabs.io](https://elevenlabs.io) → **Conversational AI** → **Agents** → **Create Agent**
2. Name it: `Community Compass`
3. Choose a voice (recommended: Aria or Rachel — calm, clear)
4. Set the **System Prompt** (copy exactly):

```
You are Community Compass, a calm and helpful AI hotline assistant. You help callers find local housing, food, healthcare, benefits, transportation, legal, employment, childcare, and crisis resources. Ask one question at a time. If the caller mentions immediate danger, tell them to call 911. If they mention emotional crisis or thoughts of self-harm, calmly tell them to call or text 988. For normal resource needs, ask what they need, ask for their ZIP code, call the search_resources tool, and read the top three resources clearly. Always offer to repeat names, phone numbers, addresses, or next steps. Do not invent resources. Only use resources returned by the tool.
```

5. Under **First Message**, set:
```
Hi, this is Community Compass. I'm here to help you find local resources. What do you need help with today?
```

---

## Step 4: Add tools to the agent

In your agent settings → **Tools** → **Add Tool** → **Webhook**

### Tool 1: search_resources

- **Name:** `search_resources`
- **Description:** `Search for local social service resources by category and ZIP code. Call this after you have both the need category and ZIP code from the caller.`
- **URL:** `https://YOUR-NGROK-URL.ngrok-free.app/elevenlabs/tools/search-resources`
- **Method:** POST
- **Headers:** `x-elevenlabs-secret: YOUR_SECRET`
- **Parameters:**
  ```json
  {
    "callerPhone": { "type": "string", "description": "Caller phone number from the call metadata" },
    "category": { "type": "string", "description": "Need category: housing, food, healthcare, benefits, transportation, legal, or other" },
    "zip": { "type": "string", "description": "5-digit US ZIP code" }
  }
  ```
- **Response:** The tool returns `spokenSummary` — read this aloud to the caller verbatim.

### Tool 2: get_last_resources

- **Name:** `get_last_resources`
- **Description:** `Retrieve the resources that were found for this caller earlier in the conversation. Use this when the caller asks to repeat, clarify, or asks about a specific resource by number.`
- **URL:** `https://YOUR-NGROK-URL.ngrok-free.app/elevenlabs/tools/get-last-resources`
- **Method:** POST
- **Headers:** `x-elevenlabs-secret: YOUR_SECRET`
- **Parameters:**
  ```json
  {
    "callerPhone": { "type": "string", "description": "Caller phone number" }
  }
  ```

### Tool 3: save_message (optional but recommended)

- **Name:** `save_message`
- **Description:** `Save a conversation turn to the database for logging.`
- **URL:** `https://YOUR-NGROK-URL.ngrok-free.app/elevenlabs/tools/save-message`
- **Method:** POST
- **Headers:** `x-elevenlabs-secret: YOUR_SECRET`
- **Parameters:**
  ```json
  {
    "callerPhone": { "type": "string" },
    "role": { "type": "string", "description": "user or assistant" },
    "content": { "type": "string", "description": "The message content" }
  }
  ```

---

## Step 5: Set env vars

Add to your `.env`:

```
ELEVENLABS_API_KEY=your_key_from_elevenlabs_dashboard
ELEVENLABS_AGENT_ID=your_agent_id_from_agent_settings
ELEVENLABS_WEBHOOK_SECRET=make_up_any_long_random_string
ELEVENLABS_PHONE_NUMBER_ID=optional_if_using_el_phone_number
```

The `ELEVENLABS_WEBHOOK_SECRET` is a string you invent — set the same value in both your `.env` and as the header value in each tool's ElevenLabs configuration.

---

## Step 6: Connect Twilio

**Option A — ElevenLabs manages the phone number directly (recommended)**

1. In ElevenLabs → **Phone Numbers** → **Import Twilio Number**
2. Follow their prompts to connect your Twilio SID + Auth Token
3. Select your agent
4. ElevenLabs takes over the webhook automatically — no Twilio console changes needed

**Option B — Route Twilio calls through your backend to ElevenLabs**

1. In Twilio Console → your number → Voice webhook:
   `https://YOUR-NGROK-URL.ngrok-free.app/voice/elevenlabs`
2. Make sure `ELEVENLABS_AGENT_ID` is set in `.env`
3. Your backend returns `<Connect><Stream>` TwiML that pipes audio to ElevenLabs

---

## Step 7: Test

### Test tool endpoints directly (no call needed)

```powershell
# Test search-resources
Invoke-RestMethod -Method POST `
  -Uri http://localhost:3000/elevenlabs/tools/search-resources `
  -Headers @{ "x-elevenlabs-secret" = "YOUR_SECRET"; "Content-Type" = "application/json" } `
  -Body '{"callerPhone":"+15551234567","category":"food","zip":"07054"}'

# Test get-last-resources
Invoke-RestMethod -Method POST `
  -Uri http://localhost:3000/elevenlabs/tools/get-last-resources `
  -Headers @{ "x-elevenlabs-secret" = "YOUR_SECRET"; "Content-Type" = "application/json" } `
  -Body '{"callerPhone":"+15551234567"}'
```

### Test the health check
```powershell
curl.exe http://localhost:3000/health
```
Confirm `elevenlabs_secret: "set"` appears in the response.

### Test the full agent
Call your Twilio number. The ElevenLabs agent picks up and talks to the caller. When the agent calls `search_resources`, watch your terminal for:
```
[ElevenLabs] tool called: search-resources
[ElevenLabs] callerPhone: +1...
[ElevenLabs] category: food
[ElevenLabs] zip: 07054
[ElevenLabs] returned resources: Food Pantries - DYCD, ...
```

---

## Fallback to original Twilio flow

If ElevenLabs is down or the agent is not configured, the original DTMF/speech routes still work:
- `POST /voice` → original welcome TwiML
- `POST /voice/handle-speech` → OpenAI classify
- `POST /voice/handle-zip` → search + SMS

To switch back, change your Twilio webhook from `/voice/elevenlabs` to `/voice`.

---

## How the agent should handle followups

The agent has `get_last_resources` so it can answer:

| Caller says | Agent does |
|---|---|
| "What was the first place called again?" | Calls `get_last_resources`, reads resource 1 |
| "Can you repeat the phone number?" | Calls `get_last_resources`, reads phone of last-mentioned resource |
| "What was the address for the second one?" | Calls `get_last_resources`, reads address of resource index 1 |
| "Which one should I call first?" | Recommends resource index 0 (highest ranked) |

Resources are stored per caller in Supabase and overwritten each new search, so they always reflect the most recent results.

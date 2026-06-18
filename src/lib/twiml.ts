// TwiML response builders — all return valid XML strings for Twilio

const BASE_URL = process.env.BASE_URL ?? '';

function wrap(inner: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`;
}

function say(text: string, voice = 'Polly.Joanna'): string {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<Say voice="${voice}">${safe}</Say>`;
}

function gather(action: string, inner: string, timeout = 5, speechTimeout = 'auto'): string {
  return `<Gather input="speech" action="${BASE_URL}${action}" method="POST" timeout="${timeout}" speechTimeout="${speechTimeout}">${inner}</Gather>`;
}

function hangup(): string {
  return '<Hangup/>';
}

export function welcomeTwiML(): string {
  return wrap(
    gather(
      '/voice/handle-speech',
      say("Hi, this is Community Hotline. What do you need help with today? Please speak after the tone.")
    ) +
    say("I didn't catch that. Please call back and tell us what you need help with.") +
    hangup()
  );
}

export function askForZipTwiML(): string {
  return wrap(
    gather(
      '/voice/handle-zip',
      say("Got it. What is your ZIP code or city so I can find resources near you?")
    ) +
    say("I didn't catch your location. I'll text you the number for 2-1-1, which can connect you to local help.") +
    hangup()
  );
}

export function emergencyTwiML(): string {
  return wrap(
    say("If this is an emergency, please hang up and call 9-1-1 now. Stay safe.") +
    hangup()
  );
}

export function crisisTwiML(): string {
  return wrap(
    say("For mental health crisis support, please call or text 9-8-8, the Suicide and Crisis Lifeline. Help is available 24 hours a day. I'm also texting you this number right now.") +
    hangup()
  );
}

export function searchingTwiML(): string {
  return wrap(
    say("Got it. I'm searching for resources near you right now and will text them to your phone in just a moment. Take care, and call back anytime.") +
    hangup()
  );
}

export function resourceFoundTwiML(spokenSummary: string): string {
  return wrap(
    say(spokenSummary) +
    say("Take care, and don't hesitate to call back if you need more help.") +
    hangup()
  );
}

export function noResultsTwiML(): string {
  return wrap(
    say("I wasn't able to find a strong local match right now. I've texted you the number for 2-1-1, which connects you to local resources. Take care.") +
    hangup()
  );
}

export function errorTwiML(): string {
  return wrap(
    say("I'm sorry, something went wrong on our end. Please call 2-1-1 for local assistance, or try calling back in a moment.") +
    hangup()
  );
}

export function repeatAskForZipTwiML(): string {
  return wrap(
    gather(
      '/voice/handle-zip',
      say("I didn't catch a valid ZIP code. Could you please say your 5-digit ZIP code?")
    ) +
    say("I'll text you the number for 2-1-1 for local help.") +
    hangup()
  );
}

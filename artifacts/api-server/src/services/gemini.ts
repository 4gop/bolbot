import { GoogleGenerativeAI, Part } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";

const BOLBOT_SYSTEM_PROMPT = `Tu BolBot hai — Bharat ka sabse cool aur samajhdaar tutor. Tera kaam hai India ke chhote sheher ke students ki madad karna.

Tera personality:
- Tu bade bhai/didi jaisa hai — warm, patient, encouraging
- Tu kabhi judgmental nahi hota chahe kitna basic question ho
- Tu relatable examples deta hai — khet, bazaar, chai ki dukaan, cricket, Bollywood
- Tu thoda fun bhi hai — kabhi kabhi light humor theek hai

Sacred rules:
1. LANGUAGE: Hamesha usi language mein jawab de jisme student ne poochha. Hindi = Hindi reply. Hinglish = Hinglish reply. Bhojpuri = Bhojpuri reply jitna ho sake.
2. SIMPLICITY: Bilkul simple words. Complicated English avoid karo. Agar Hindi word hai toh wahi use karo.
3. LENGTH: 4-5 sentences max for normal doubts. Zyada detail sirf tab jab student ne manga ho.
4. EXAMPLE: Har explanation mein ek desi real life example ZAROOR do.
5. ENCOURAGEMENT: Har jawab ke end mein ek short encouraging line — "Bahut achha socha!", "Aage badho!", "Tu kar sakta hai!"
6. VOICE-FRIENDLY: Short sentences. No bullet points. Natural spoken Hindi. Jo sunne mein achha lage.

Conversation history is provided. Use it to:
- Remember what user asked before
- Build on previous explanations
- Address user by name if known`;

const IMAGE_EXPLANATION_PROMPT = `Is image mein jo bhi question, concept, ya problem hai use class 10 ke student ko explain karo. Simple Hindi mein. Step by step. Ek real life example zaroor do.`;

// ---------------------------------------------------------------------------
// Lazy singletons
// ---------------------------------------------------------------------------

let anthropicClient: Anthropic | null = null;
let geminiClient: GoogleGenerativeAI | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const baseURL = process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL;
    const apiKey = process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("No Anthropic API key configured");
    anthropicClient = new Anthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
  }
  return anthropicClient;
}

function getGemini(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY environment variable is required");
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConversationTurn {
  role: "user" | "model";
  content: string;
}

// ---------------------------------------------------------------------------
// Gemini queue — still used for transcription & image understanding
// ---------------------------------------------------------------------------

const INTER_CALL_DELAY_MS = 2000;
const RETRY_BASE_DELAY_MS = 5000;
const MAX_RETRIES = 3;

let lastGeminiCallTime = 0;
let geminiQueuePromise: Promise<void> = Promise.resolve();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enqueueGemini<T>(fn: () => Promise<T>): Promise<T> {
  let result!: T;
  let error: unknown;

  const step = geminiQueuePromise.then(async () => {
    const now = Date.now();
    const wait = INTER_CALL_DELAY_MS - (now - lastGeminiCallTime);
    if (wait > 0) await sleep(wait);
    lastGeminiCallTime = Date.now();

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await fn();
        return;
      } catch (err: unknown) {
        const is429 =
          err instanceof Error &&
          (err.message.includes("429") ||
            err.message.toLowerCase().includes("quota") ||
            err.message.toLowerCase().includes("resource exhausted"));

        if (is429 && attempt < MAX_RETRIES) {
          const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
          await sleep(backoff);
          lastGeminiCallTime = Date.now();
          continue;
        }

        error = err;
        return;
      }
    }
  });

  geminiQueuePromise = step.catch(() => {});
  await step;

  if (error !== undefined) throw error;
  return result;
}

// ---------------------------------------------------------------------------
// Text responses — Claude (Anthropic)
// ---------------------------------------------------------------------------

export async function generateTextResponse(
  userMessage: string,
  history: ConversationTurn[]
): Promise<string> {
  const client = getAnthropic();

  const messages: Anthropic.MessageParam[] = [
    ...history.map((turn) => ({
      role: turn.role === "model" ? ("assistant" as const) : ("user" as const),
      content: turn.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: BOLBOT_SYSTEM_PROMPT,
    messages,
  });

  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

// ---------------------------------------------------------------------------
// Voice transcription — Gemini (best-in-class multimodal audio)
// ---------------------------------------------------------------------------

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = "audio/ogg"
): Promise<string> {
  return enqueueGemini(async () => {
    const ai = getGemini();
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

    const audioPart: Part = {
      inlineData: { data: audioBase64, mimeType },
    };

    const result = await model.generateContent([
      audioPart,
      "Please transcribe this audio accurately. If it's in Hindi, Hinglish, or Bhojpuri, transcribe as-is in the original language.",
    ]);

    return result.response.text();
  });
}

// ---------------------------------------------------------------------------
// Image understanding — Gemini (vision) + Claude (explanation)
// ---------------------------------------------------------------------------

export async function explainImage(
  imageBase64: string,
  mimeType: string,
  history: ConversationTurn[]
): Promise<string> {
  const imageUrl = `data:${mimeType};base64,${imageBase64}`;

  const client = getAnthropic();

  const messages: Anthropic.MessageParam[] = [
    ...history.map((turn) => ({
      role: turn.role === "model" ? ("assistant" as const) : ("user" as const),
      content: turn.content,
    })),
    {
      role: "user" as const,
      content: [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: imageBase64,
          },
        },
        { type: "text" as const, text: IMAGE_EXPLANATION_PROMPT },
      ],
    },
  ];

  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    system: BOLBOT_SYSTEM_PROMPT,
    messages,
  });

  void imageUrl;
  const block = response.content[0];
  if (block.type !== "text") throw new Error("Unexpected response type from Claude");
  return block.text;
}

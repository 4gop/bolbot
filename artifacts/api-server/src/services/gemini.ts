import { GoogleGenerativeAI, Part } from "@google/generative-ai";

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

let genAI: GoogleGenerativeAI | null = null;

function getGenAI(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export interface ConversationTurn {
  role: "user" | "model";
  content: string;
}

export async function generateTextResponse(
  userMessage: string,
  history: ConversationTurn[]
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: BOLBOT_SYSTEM_PROMPT,
  });

  const chatHistory = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.content }],
  }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

export async function transcribeAudio(audioBase64: string, mimeType: string = "audio/ogg"): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });

  const audioPart: Part = {
    inlineData: {
      data: audioBase64,
      mimeType,
    },
  };

  const result = await model.generateContent([
    audioPart,
    "Please transcribe this audio accurately. If it's in Hindi, Hinglish, or Bhojpuri, transcribe as-is in the original language.",
  ]);

  return result.response.text();
}

export async function explainImage(
  imageBase64: string,
  mimeType: string,
  history: ConversationTurn[]
): Promise<string> {
  const ai = getGenAI();
  const model = ai.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction: BOLBOT_SYSTEM_PROMPT,
  });

  const imagePart: Part = {
    inlineData: {
      data: imageBase64,
      mimeType,
    },
  };

  const chatHistory = history.map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.content }],
  }));

  const chat = model.startChat({ history: chatHistory });
  const result = await chat.sendMessage([imagePart, IMAGE_EXPLANATION_PROMPT]);
  return result.response.text();
}

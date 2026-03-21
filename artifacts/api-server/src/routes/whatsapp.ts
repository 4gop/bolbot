import { Router, type IRouter } from "express";
import twilio from "twilio";
import { generateTextResponse, transcribeAudio, explainImage } from "../services/gemini.js";
import {
  getOrCreateUser,
  updateUser,
  getConversationHistory,
  saveConversationTurn,
  saveInteraction,
} from "../services/userService.js";
import {
  getPointsForInputType,
  checkStreakBonus,
  updateStreak,
  checkNewBadges,
  buildStreakMessage,
} from "../services/gamification.js";
import https from "https";

const router: IRouter = Router();

function getTwilioClient(): ReturnType<typeof twilio> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials missing");
  return twilio(accountSid, authToken);
}

async function sendWhatsAppMessage(
  to: string,
  body: string,
  log?: import("pino").Logger
): Promise<void> {
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  if (!fromNumber) {
    log?.warn("TWILIO_WHATSAPP_NUMBER not set");
    return;
  }

  try {
    const client = getTwilioClient();
    const msg = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to,
      body,
    });
    log?.info({ sid: msg.sid, status: msg.status }, "WhatsApp message sent");
  } catch (err) {
    log?.error({ err }, "Twilio SDK error sending WhatsApp message");
  }
}

async function downloadMedia(url: string): Promise<Buffer | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  return new Promise((resolve) => {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    https.get(url, { headers: { Authorization: `Basic ${auth}` } }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", () => resolve(null));
    });
  });
}

const WELCOME_MESSAGE = `Namaste! Main BolBot hoon 🎓
Bharat ka pehla Hindi voice tutor!

Mujhse karo:
- Voice note bhejo apna doubt
- Textbook ka photo khichke bhejo
- Ya seedha text mein pucho

Main simple Hindi mein explain karunga — jaise koi bada bhai/didi samjhata hai.

Bilkul free hai. Shuru karo!`;

router.post("/webhook/whatsapp", async (req, res) => {
  const log = req.log;

  // Acknowledge immediately — Twilio requires a response within 15 seconds
  res.status(200).json({ ok: true });

  try {
    const body = req.body as Record<string, string>;
    const from = body.From;
    const messageBody = body.Body;
    const mediaUrl = body.MediaUrl0;
    const mediaContentType = body.MediaContentType0;

    log.info({ from, messageBody: messageBody?.slice(0, 80), mediaContentType }, "WhatsApp message received");

    if (!from) return;

    const user = await getOrCreateUser(from, "whatsapp");

    if (user.totalMessages === 0) {
      await sendWhatsAppMessage(from, WELCOME_MESSAGE, log);
    }

    const history = await getConversationHistory(user.id);

    let inputType: "text" | "voice" | "image" = "text";
    let userMessage = messageBody || "";
    let botResponse = "";

    if (mediaUrl && mediaContentType) {
      const mediaBuffer = await downloadMedia(mediaUrl);
      if (mediaBuffer) {
        const base64 = mediaBuffer.toString("base64");
        if (mediaContentType.startsWith("image/")) {
          inputType = "image";
          userMessage = "[Photo bheja]";
          botResponse = await explainImage(base64, mediaContentType, history);
        } else if (mediaContentType.includes("audio") || mediaContentType.includes("ogg")) {
          inputType = "voice";
          userMessage = await transcribeAudio(base64, mediaContentType);
          botResponse = await generateTextResponse(userMessage, history);
        }
      }
    } else if (userMessage.trim()) {
      botResponse = await generateTextResponse(userMessage, history);
    }

    if (!botResponse) return;

    await saveConversationTurn(user.id, "user", userMessage);
    await saveConversationTurn(user.id, "model", botResponse);

    const today = new Date().toISOString().split("T")[0];
    const streakUpdate = updateStreak(user.lastActiveDate);
    let newStreakCount = user.streakCount;
    if (streakUpdate.isNewDay) {
      newStreakCount = streakUpdate.newStreakCount === 1 ? 1 : user.streakCount + 1;
    }

    const basePoints = getPointsForInputType(inputType);
    const streakBonus = checkStreakBonus(newStreakCount);
    const totalPointsEarned = basePoints + streakBonus;
    const newTotalMessages = user.totalMessages + 1;
    const isFirstDoubt = user.totalMessages === 0;

    const newBadges = checkNewBadges(
      { totalMessages: newTotalMessages, badges: user.badges ?? [], streakCount: newStreakCount },
      inputType,
      isFirstDoubt
    );

    const allBadgeIds = [...(user.badges ?? []), ...newBadges.map((b) => b.id)];
    const newTotalPoints = user.points + totalPointsEarned;

    await updateUser(user.id, {
      points: newTotalPoints,
      streakCount: newStreakCount,
      lastActiveDate: today,
      totalMessages: newTotalMessages,
      badges: allBadgeIds,
    });

    await saveInteraction({
      userId: user.id,
      platform: "whatsapp",
      inputType,
      userMessage,
      botResponse,
      pointsEarned: totalPointsEarned,
      responseTimeMs: 0,
    });

    const streakMsg = buildStreakMessage(newStreakCount);
    let fullResponse = botResponse;
    if (streakMsg) fullResponse += `\n\n${streakMsg}`;
    fullResponse += `\n\n⭐ +${totalPointsEarned} points! Total: ${newTotalPoints} points`;

    if (newBadges.length > 0) {
      fullResponse += `\n\n🏅 Naya badge mila: ${newBadges.map((b) => b.name).join(", ")}!`;
    }

    log.info({ to: from, responseLength: fullResponse.length }, "Sending WhatsApp reply");
    await sendWhatsAppMessage(from, fullResponse, log);
  } catch (err) {
    log.error({ err }, "WhatsApp webhook error");
  }
});

export default router;

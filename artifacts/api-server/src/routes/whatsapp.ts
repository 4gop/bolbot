import { Router, type IRouter, type Request } from "express";
import { generateTextResponse, transcribeAudio, explainImage } from "../services/gemini.js";
import { synthesizeHindiSpeech } from "../services/tts.js";
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
import crypto from "crypto";

const router: IRouter = Router();

function buildWebhookUrl(req: Request): string {
  const proto =
    (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ??
    (req.headers.host as string | undefined) ??
    process.env.REPLIT_DOMAINS?.split(",")[0] ??
    "localhost";
  return `${proto}://${host}${req.originalUrl}`;
}

function validateTwilioSignature(req: Request): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    req.log.warn("TWILIO_AUTH_TOKEN not set — rejecting webhook");
    return false;
  }

  const twilioSignature = req.headers["x-twilio-signature"];
  if (typeof twilioSignature !== "string" || !twilioSignature) {
    req.log.warn("Missing x-twilio-signature header");
    return false;
  }

  const url = buildWebhookUrl(req);
  req.log.info({ url, twilioSignature }, "Twilio signature check");

  const params = req.body as Record<string, string>;
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);

  const hmac = crypto.createHmac("sha1", authToken);
  hmac.update(sortedParams);
  const expectedSig = hmac.digest("base64");

  try {
    const valid = crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(twilioSignature)
    );
    if (!valid) {
      req.log.warn(
        { url, expected: expectedSig, received: twilioSignature },
        "Twilio signature mismatch"
      );
    }
    return valid;
  } catch {
    return false;
  }
}

async function downloadMedia(url: string): Promise<Buffer | null> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) return null;

  return new Promise((resolve) => {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const options = {
      headers: { Authorization: `Basic ${auth}` },
    };

    https.get(url, options, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", () => resolve(null));
    });
  });
}

async function sendWhatsAppMessage(
  to: string,
  body: string,
  log?: import("pino").Logger
): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    log?.warn("Twilio credentials missing — cannot send WhatsApp reply");
    return;
  }

  const postData = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: to,
    Body: body,
  }).toString();

  const postBuffer = Buffer.from(postData, "utf8");

  return new Promise((resolve) => {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const options = {
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        Authorization: `Basic ${auth}`,
        "Content-Length": postBuffer.length,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        const responseBody = Buffer.concat(chunks).toString("utf8");
        if (res.statusCode && res.statusCode >= 400) {
          log?.error(
            { status: res.statusCode, body: responseBody },
            "Twilio API error sending WhatsApp message"
          );
        } else {
          log?.info({ status: res.statusCode }, "WhatsApp message sent");
        }
        resolve();
      });
    });
    req.on("error", (err) => {
      log?.error({ err }, "Network error sending WhatsApp message");
      resolve();
    });
    req.write(postBuffer);
    req.end();
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

  log.info(
    {
      host: req.headers.host,
      forwardedHost: req.headers["x-forwarded-host"],
      forwardedProto: req.headers["x-forwarded-proto"],
      hasSig: !!req.headers["x-twilio-signature"],
    },
    "WhatsApp webhook received"
  );

  if (!validateTwilioSignature(req)) {
    res.status(403).send("Forbidden");
    return;
  }

  try {
    const body = req.body as Record<string, string>;
    const from = body.From;
    const messageBody = body.Body;
    const mediaUrl = body.MediaUrl0;
    const mediaContentType = body.MediaContentType0;

    log.info({ from, messageBody: messageBody?.slice(0, 80), mediaContentType }, "WhatsApp message details");

    if (!from) {
      res.status(400).set("Content-Type", "text/xml; charset=utf-8").send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>");
      return;
    }

    const user = await getOrCreateUser(from, "whatsapp");

    const isNewUser = user.totalMessages === 0;
    if (isNewUser) {
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

    if (!botResponse) {
      res.set("Content-Type", "text/xml; charset=utf-8");
      res.send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>");
      return;
    }

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

    res.set("Content-Type", "text/xml; charset=utf-8");
    res.send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>");
  } catch (err) {
    req.log.error({ err }, "WhatsApp webhook error");
    res.set("Content-Type", "text/xml; charset=utf-8");
    res.send("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>");
  }
});

export default router;

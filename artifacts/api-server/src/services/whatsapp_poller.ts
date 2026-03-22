import twilio from "twilio";
import { logger } from "../lib/logger.js";
import { generateTextResponse, transcribeAudio, explainImage } from "./gemini.js";
import {
  getOrCreateUser,
  updateUser,
  getConversationHistory,
  saveConversationTurn,
  saveInteraction,
} from "./userService.js";
import {
  getPointsForInputType,
  checkStreakBonus,
  updateStreak,
  checkNewBadges,
  buildStreakMessage,
} from "./gamification.js";

const POLL_INTERVAL_MS = 3000;

const processedSids = new Set<string>();
let lastCheckTime = new Date(Date.now() - 10 * 60_000);

function getWhatsAppNumber(): string {
  return process.env.WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER || "";
}

function getTwilioClient(): ReturnType<typeof twilio> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!accountSid || !authToken) throw new Error("Twilio credentials missing");
  return twilio(accountSid, authToken);
}

async function sendReply(to: string, body: string): Promise<void> {
  const fromNumber = getWhatsAppNumber();
  if (!fromNumber) {
    logger.warn("WHATSAPP_NUMBER not set — cannot send reply");
    return;
  }
  const client = getTwilioClient();
  const msg = await client.messages.create({
    from: `whatsapp:${fromNumber}`,
    to,
    body,
  });
  logger.info({ sid: msg.sid, status: msg.status }, "WhatsApp reply sent");
}

async function processInboundMessage(
  sid: string,
  from: string,
  body: string,
  mediaUrl: string | null,
  mediaContentType: string | null
): Promise<void> {
  const user = await getOrCreateUser(from, "whatsapp");
  const history = await getConversationHistory(user.id);

  let inputType: "text" | "voice" | "image" = "text";
  let userMessage = body || "";
  let botResponse = "";

  if (mediaUrl && mediaContentType) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const mediaRes = await fetch(mediaUrl, {
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(`${accountSid}:${authToken}`).toString("base64"),
      },
    });

    if (mediaRes.ok) {
      const buf = Buffer.from(await mediaRes.arrayBuffer());
      const base64 = buf.toString("base64");

      if (mediaContentType.startsWith("image/")) {
        inputType = "image";
        userMessage = "[Photo bheja]";
        botResponse = await explainImage(base64, mediaContentType, history);
      } else if (
        mediaContentType.includes("audio") ||
        mediaContentType.includes("ogg")
      ) {
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
    newStreakCount =
      streakUpdate.newStreakCount === 1 ? 1 : user.streakCount + 1;
  }

  const basePoints = getPointsForInputType(inputType);
  const streakBonus = checkStreakBonus(newStreakCount);
  const totalPointsEarned = basePoints + streakBonus;
  const newTotalMessages = user.totalMessages + 1;
  const isFirstDoubt = user.totalMessages === 0;

  const newBadges = checkNewBadges(
    {
      totalMessages: newTotalMessages,
      badges: user.badges ?? [],
      streakCount: newStreakCount,
    },
    inputType,
    isFirstDoubt
  );

  const allBadgeIds = [
    ...(user.badges ?? []),
    ...newBadges.map((b) => b.id),
  ];
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
    fullResponse += `\n\n🏅 Naya badge mila: ${newBadges
      .map((b) => b.name)
      .join(", ")}!`;
  }

  logger.info({ to: from, sid }, "Replying to WhatsApp message");
  await sendReply(from, fullResponse);
}

async function poll(): Promise<void> {
  const fromNumber = getWhatsAppNumber();
  if (!fromNumber) return;

  const client = getTwilioClient();
  const checkFrom = new Date(lastCheckTime.getTime() - 5_000);
  lastCheckTime = new Date();

  const messages = await client.messages.list({
    to: `whatsapp:${fromNumber}`,
    dateSentAfter: checkFrom,
    pageSize: 50,
  });

  const inbound = messages.filter(
    (m) =>
      m.direction === "inbound" &&
      !processedSids.has(m.sid) &&
      m.body !== null
  );

  if (inbound.length > 0) {
    logger.info({ count: inbound.length }, "WhatsApp poller: new messages");
  }

  for (const msg of inbound) {
    processedSids.add(msg.sid);

    let mediaUrl: string | null = null;
    let mediaContentType: string | null = null;

    if (msg.numMedia !== "0") {
      try {
        const mediaList = await client.messages(msg.sid).media.list({ pageSize: 1 });
        if (mediaList.length > 0) {
          const m = mediaList[0];
          mediaUrl = `https://api.twilio.com${m.uri.replace(".json", "")}`;
          mediaContentType = m.contentType;
        }
      } catch (err) {
        logger.warn({ err, sid: msg.sid }, "WhatsApp poller: failed to fetch media");
      }
    }

    try {
      await processInboundMessage(
        msg.sid,
        msg.from,
        msg.body ?? "",
        mediaUrl,
        mediaContentType
      );
    } catch (err) {
      logger.error({ err, sid: msg.sid }, "WhatsApp poller: message processing error");
    }
  }

  if (processedSids.size > 10_000) {
    const arr = [...processedSids];
    arr.slice(0, 5_000).forEach((s) => processedSids.delete(s));
  }
}

export function startWhatsAppPoller(): void {
  const fromNumber = getWhatsAppNumber();
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!fromNumber || !accountSid || !authToken) {
    logger.warn(
      "WhatsApp poller: Twilio credentials not fully configured — poller disabled"
    );
    return;
  }

  logger.info(
    { number: `whatsapp:${fromNumber}`, intervalMs: POLL_INTERVAL_MS },
    "WhatsApp poller starting"
  );

  void poll();

  setInterval(() => {
    poll().catch((err) =>
      logger.error({ err }, "WhatsApp poller: unhandled error")
    );
  }, POLL_INTERVAL_MS);
}

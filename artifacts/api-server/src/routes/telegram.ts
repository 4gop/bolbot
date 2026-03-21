import { Router, type IRouter } from "express";
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

async function sendTelegramMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const body = JSON.stringify({ chat_id: chatId, text });

  return new Promise((resolve) => {
    const options = {
      hostname: "api.telegram.org",
      path: `/bot${token}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };

    const req = https.request(options, () => resolve());
    req.on("error", () => resolve());
    req.write(body);
    req.end();
  });
}

async function getTelegramFile(fileId: string): Promise<Buffer | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;

  return new Promise((resolve) => {
    https.get(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`, (res) => {
      let data = "";
      res.on("data", (c: string) => (data += c));
      res.on("end", async () => {
        try {
          const parsed = JSON.parse(data);
          const filePath = parsed.result?.file_path;
          if (!filePath) return resolve(null);

          https.get(`https://api.telegram.org/file/bot${token}/${filePath}`, (fileRes) => {
            const chunks: Buffer[] = [];
            fileRes.on("data", (chunk: Buffer) => chunks.push(chunk));
            fileRes.on("end", () => resolve(Buffer.concat(chunks)));
            fileRes.on("error", () => resolve(null));
          });
        } catch {
          resolve(null);
        }
      });
    });
  });
}

const WELCOME_MESSAGE = `Namaste! Main BolBot hoon 🎓
Bharat ka pehla Hindi voice tutor!

Mujhse karo:
- Voice note bhejo apna doubt (/start ke baad)
- Textbook ka photo bhejo
- Ya seedha text mein pucho

Main simple Hindi mein explain karunga!`;

router.post("/webhook/telegram", async (req, res) => {
  res.json({ ok: true });

  try {
    const update = req.body;
    const message = update.message || update.edited_message;
    if (!message) return;

    const chatId = message.chat.id;
    const userId = `telegram_${chatId}`;
    const username = message.from?.username || message.from?.first_name;

    const user = await getOrCreateUser(userId, "telegram");

    if (message.text === "/start") {
      if (user.totalMessages === 0) {
        await sendTelegramMessage(chatId, WELCOME_MESSAGE);
        if (username) {
          await updateUser(user.id, { username });
        }
      } else {
        await sendTelegramMessage(chatId, `Wapas aaye! 🎉 Tera streak: ${user.streakCount} din, Points: ${user.points}`);
      }
      return;
    }

    if (message.text === "/leaderboard") {
      const { getLeaderboard } = await import("../services/userService.js");
      const data = await getLeaderboard(5);
      const lines = data.entries.map((e: any) => `${e.rank}. ${e.username || "Anonymous"} — ${e.points} pts`);
      await sendTelegramMessage(chatId, `🏆 Weekly Top 5:\n\n${lines.join("\n")}`);
      return;
    }

    const history = await getConversationHistory(user.id);
    let inputType: "text" | "voice" | "image" = "text";
    let userMessage = "";
    let botResponse = "";

    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      const buffer = await getTelegramFile(photo.file_id);
      if (buffer) {
        inputType = "image";
        userMessage = "[Photo bheja]";
        botResponse = await explainImage(buffer.toString("base64"), "image/jpeg", history);
      }
    } else if (message.voice) {
      const buffer = await getTelegramFile(message.voice.file_id);
      if (buffer) {
        inputType = "voice";
        userMessage = await transcribeAudio(buffer.toString("base64"), "audio/ogg");
        botResponse = await generateTextResponse(userMessage, history);
      }
    } else if (message.text) {
      userMessage = message.text;
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
      ...(username && { username }),
    });

    await saveInteraction({
      userId: user.id,
      platform: "telegram",
      inputType,
      userMessage,
      botResponse,
      pointsEarned: totalPointsEarned,
      responseTimeMs: 0,
    });

    const streakMsg = buildStreakMessage(newStreakCount);
    let fullResponse = botResponse;
    if (streakMsg) fullResponse += `\n\n${streakMsg}`;
    fullResponse += `\n\n⭐ +${totalPointsEarned} pts! Total: ${newTotalPoints}`;

    if (newBadges.length > 0) {
      fullResponse += `\n\n🏅 Naya badge: ${newBadges.map((b) => b.name).join(", ")}!`;
    }

    await sendTelegramMessage(chatId, fullResponse);
  } catch (err) {
    req.log.error({ err }, "Telegram webhook error");
  }
});

export default router;

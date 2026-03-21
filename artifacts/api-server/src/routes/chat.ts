import { Router, type IRouter } from "express";
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

const router: IRouter = Router();

router.post("/chat", async (req, res) => {
  const startTime = Date.now();

  try {
    const { sessionId, message, audioData, imageData, imageMimeType, requestVoiceResponse } = req.body;

    if (!sessionId) {
      res.status(400).json({ error: "bad_request", message: "sessionId is required" });
      return;
    }

    let inputType: "text" | "voice" | "image" = "text";
    let userMessage = message || "";

    if (imageData) {
      inputType = "image";
    } else if (audioData) {
      inputType = "voice";
    }

    const user = await getOrCreateUser(sessionId, "web");
    const history = await getConversationHistory(user.id);

    let botResponse: string;

    if (inputType === "image") {
      const mime = imageMimeType || "image/jpeg";
      botResponse = await explainImage(imageData, mime, history);
      userMessage = "[Photo bheja]";
    } else if (inputType === "voice") {
      const mimeType = "audio/webm";
      userMessage = await transcribeAudio(audioData, mimeType);
      botResponse = await generateTextResponse(userMessage, history);
    } else {
      if (!userMessage.trim()) {
        res.status(400).json({ error: "bad_request", message: "message or audioData or imageData is required" });
        return;
      }
      botResponse = await generateTextResponse(userMessage, history);
    }

    await saveConversationTurn(user.id, "user", userMessage);
    await saveConversationTurn(user.id, "model", botResponse);

    const today = new Date().toISOString().split("T")[0];
    const streakUpdate = updateStreak(user.lastActiveDate);
    let newStreakCount = user.streakCount;

    if (streakUpdate.isNewDay) {
      if (streakUpdate.newStreakCount === 1) {
        newStreakCount = 1;
      } else {
        newStreakCount = user.streakCount + 1;
      }
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

    const allBadgeIds = [...(user.badges ?? []), ...newBadges.map((b) => b.id)];
    const newTotalPoints = user.points + totalPointsEarned;

    await updateUser(user.id, {
      points: newTotalPoints,
      streakCount: newStreakCount,
      lastActiveDate: today,
      totalMessages: newTotalMessages,
      badges: allBadgeIds,
    });

    const responseTimeMs = Date.now() - startTime;
    await saveInteraction({
      userId: user.id,
      platform: "web",
      inputType,
      userMessage,
      botResponse,
      pointsEarned: totalPointsEarned,
      responseTimeMs,
    });

    const streakMsg = buildStreakMessage(newStreakCount);
    let finalResponse = botResponse;
    if (streakMsg) {
      finalResponse = `${botResponse}\n\n${streakMsg}`;
    }
    if (streakBonus > 0) {
      finalResponse += `\n\n🎉 7-din streak bonus: +${streakBonus} extra points!`;
    }

    let audioBase64: string | undefined;
    if (requestVoiceResponse === true || requestVoiceResponse === "true") {
      const audio = await synthesizeHindiSpeech(botResponse);
      if (audio) audioBase64 = audio;
    }

    res.json({
      text: finalResponse,
      ...(audioBase64 && { audioBase64 }),
      points: totalPointsEarned,
      totalPoints: newTotalPoints,
      streakCount: newStreakCount,
      newBadges,
      inputType,
    });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    const isQuotaError = err instanceof Error && "status" in err && (err as { status: number }).status === 429;
    if (isQuotaError) {
      res.status(429).json({
        error: "quota_exceeded",
        message: "Abhi bahut zyada requests aa rahe hain. Thodi der baad dobara try karo! 🙏",
      });
      return;
    }
    res.status(500).json({ error: "server_error", message: "Kuch galat ho gaya. Dobara try karo! 😅" });
  }
});

export default router;

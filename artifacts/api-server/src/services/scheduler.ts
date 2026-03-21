import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import https from "https";

const REMINDER_MESSAGE =
  "Kal ka quota poora karo! 📚 Aaj ek doubt solve karo aur apna streak bachao. BolBot pe jao: {{url}}";

async function sendTelegramReminder(chatId: string, message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;

  const body = JSON.stringify({ chat_id: chatId, text: message });

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

async function sendWhatsAppReminder(to: string, message: string): Promise<void> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;

  if (!accountSid || !authToken || !fromNumber) return;

  const postData = new URLSearchParams({
    From: `whatsapp:${fromNumber}`,
    To: to,
    Body: message,
  }).toString();

  return new Promise((resolve) => {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const options = {
      hostname: "api.twilio.com",
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${auth}`,
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, () => resolve());
    req.on("error", () => resolve());
    req.write(postData);
    req.end();
  });
}

async function sendEveningReminders(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  const inactiveUsers = await db
    .select({
      id: usersTable.id,
      platform: usersTable.platform,
      platformUserId: usersTable.platformUserId,
      streakCount: usersTable.streakCount,
    })
    .from(usersTable)
    .where(sql`(${usersTable.lastActiveDate} IS NULL OR ${usersTable.lastActiveDate} < ${today})`);

  const appUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "https://bolbot.replit.app";

  for (const user of inactiveUsers) {
    const message = REMINDER_MESSAGE.replace("{{url}}", appUrl);

    if (user.platform === "telegram") {
      await sendTelegramReminder(user.platformUserId, message).catch(() => {});
    } else if (user.platform === "whatsapp") {
      await sendWhatsAppReminder(user.platformUserId, message).catch(() => {});
    }
  }
}

function msUntilNext8PM(): number {
  const now = new Date();
  const next8PM = new Date(now);
  next8PM.setHours(20, 0, 0, 0);

  if (now >= next8PM) {
    next8PM.setDate(next8PM.getDate() + 1);
  }

  return next8PM.getTime() - now.getTime();
}

export function startReminderScheduler(): void {
  const scheduleNext = () => {
    const delay = msUntilNext8PM();
    setTimeout(() => {
      sendEveningReminders().catch(() => {});
      setInterval(() => {
        sendEveningReminders().catch(() => {});
      }, 24 * 60 * 60 * 1000);
    }, delay);
  };

  scheduleNext();
}

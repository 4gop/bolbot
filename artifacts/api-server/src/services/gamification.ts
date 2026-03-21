import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

export interface BadgeInfo {
  id: string;
  name: string;
  description: string;
}

const BADGES: Record<string, BadgeInfo> = {
  pehla_kadam: {
    id: "pehla_kadam",
    name: "Pehla Kadam",
    description: "Pehla doubt solve kiya!",
  },
  awaaz_ka_shehzada: {
    id: "awaaz_ka_shehzada",
    name: "Awaaz Ka Shehzada",
    description: "Pehli voice note bheji!",
  },
  aankhon_wala: {
    id: "aankhon_wala",
    name: "Aankhon Wala",
    description: "Pehli photo bheja!",
  },
  hafte_ka_hero: {
    id: "hafte_ka_hero",
    name: "Hafte Ka Hero",
    description: "7 din ki streak!",
  },
  sau_ka_dum: {
    id: "sau_ka_dum",
    name: "Sau Ka Dum",
    description: "100 doubt solve kiye!",
  },
  bolbot_star: {
    id: "bolbot_star",
    name: "BolBot Star",
    description: "500 doubt solve kiye!",
  },
};

export function getPointsForInputType(inputType: "text" | "voice" | "image"): number {
  const points: Record<string, number> = {
    text: 5,
    voice: 10,
    image: 15,
  };
  return points[inputType] ?? 5;
}

export function checkStreakBonus(streakCount: number): number {
  if (streakCount > 0 && streakCount % 7 === 0) {
    return 25;
  }
  return 0;
}

export function updateStreak(lastActiveDate: string | null): { newStreakCount: number; isNewDay: boolean } {
  const today = new Date().toISOString().split("T")[0];

  if (!lastActiveDate) {
    return { newStreakCount: 1, isNewDay: true };
  }

  if (lastActiveDate === today) {
    return { newStreakCount: -1, isNewDay: false };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastActiveDate === yesterdayStr) {
    return { newStreakCount: -1, isNewDay: true };
  }

  return { newStreakCount: 1, isNewDay: true };
}

export function checkNewBadges(
  user: {
    totalMessages: number;
    badges: string[];
    streakCount: number;
  },
  inputType: "text" | "voice" | "image",
  isFirstDoubt: boolean
): BadgeInfo[] {
  const newBadges: BadgeInfo[] = [];
  const existingBadges = new Set(user.badges);

  if (isFirstDoubt && !existingBadges.has("pehla_kadam")) {
    newBadges.push(BADGES.pehla_kadam);
  }

  if (inputType === "voice" && !existingBadges.has("awaaz_ka_shehzada")) {
    newBadges.push(BADGES.awaaz_ka_shehzada);
  }

  if (inputType === "image" && !existingBadges.has("aankhon_wala")) {
    newBadges.push(BADGES.aankhon_wala);
  }

  if (user.streakCount >= 7 && !existingBadges.has("hafte_ka_hero")) {
    newBadges.push(BADGES.hafte_ka_hero);
  }

  if (user.totalMessages >= 100 && !existingBadges.has("sau_ka_dum")) {
    newBadges.push(BADGES.sau_ka_dum);
  }

  if (user.totalMessages >= 500 && !existingBadges.has("bolbot_star")) {
    newBadges.push(BADGES.bolbot_star);
  }

  return newBadges;
}

export function buildStreakMessage(streakCount: number): string {
  if (streakCount >= 7) {
    return `🔥 ${streakCount} din se padh rahe ho — Hafte Ka Hero ban gaye!`;
  } else if (streakCount >= 3) {
    return `🔥 ${streakCount} din se padh rahe ho — zabardast!`;
  } else if (streakCount >= 2) {
    return `🔥 ${streakCount} din se padh rahe ho — keep it up!`;
  }
  return "";
}

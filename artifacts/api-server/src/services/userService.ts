import { db } from "@workspace/db";
import { usersTable, interactionsTable, conversationMemoryTable } from "@workspace/db/schema";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import type { User, InsertUser } from "@workspace/db/schema";

export async function getOrCreateUser(platformUserId: string, platform: string = "web"): Promise<User> {
  const existing = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.platformUserId, platformUserId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({
      platform,
      platformUserId,
    })
    .returning();

  return newUser;
}

export async function updateUser(
  userId: number,
  updates: Partial<{
    points: number;
    streakCount: number;
    lastActiveDate: string;
    totalMessages: number;
    badges: string[];
    avatarUrl: string;
    username: string;
  }>
): Promise<User> {
  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, userId))
    .returning();
  return updated;
}

export async function getConversationHistory(userId: number, limit = 10) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - 24);

  const rows = await db
    .select()
    .from(conversationMemoryTable)
    .where(
      and(
        eq(conversationMemoryTable.userId, userId),
        gte(conversationMemoryTable.createdAt, cutoff)
      )
    )
    .orderBy(desc(conversationMemoryTable.createdAt))
    .limit(limit);

  return rows.reverse().map((r) => ({
    role: r.role as "user" | "model",
    content: r.content,
  }));
}

export async function saveConversationTurn(
  userId: number,
  role: "user" | "model",
  content: string
): Promise<void> {
  await db.insert(conversationMemoryTable).values({
    userId,
    role,
    content,
  });
}

export async function saveInteraction(params: {
  userId: number;
  platform: string;
  inputType: string;
  userMessage: string;
  botResponse: string;
  pointsEarned: number;
  responseTimeMs: number;
}): Promise<void> {
  await db.insert(interactionsTable).values(params);
}

export async function getLeaderboard(limit = 10) {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const rows = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      avatarUrl: usersTable.avatarUrl,
      points: usersTable.points,
      streakCount: usersTable.streakCount,
      platform: usersTable.platform,
    })
    .from(usersTable)
    .orderBy(desc(usersTable.points))
    .limit(limit);

  return {
    entries: rows.map((r, i) => ({
      rank: i + 1,
      userId: r.id,
      username: r.username,
      avatarUrl: r.avatarUrl,
      points: r.points,
      streakCount: r.streakCount,
      platform: r.platform,
    })),
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: weekEnd.toISOString().split("T")[0],
  };
}

export async function getAdminStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalUsersResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(usersTable);

  const [messagesTodayResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interactionsTable)
    .where(gte(interactionsTable.createdAt, today));

  const [totalMessagesResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(interactionsTable);

  const inputCounts = await db
    .select({
      inputType: interactionsTable.inputType,
      count: sql<number>`count(*)::int`,
    })
    .from(interactionsTable)
    .groupBy(interactionsTable.inputType);

  const inputMap: Record<string, number> = {};
  for (const row of inputCounts) {
    inputMap[row.inputType] = row.count;
  }

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const dailyActivity = await db
    .select({
      date: sql<string>`DATE(created_at)::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(interactionsTable)
    .where(gte(interactionsTable.createdAt, fourteenDaysAgo))
    .groupBy(sql`DATE(created_at)`)
    .orderBy(sql`DATE(created_at)`);

  const [activeUsersTodayResult] = await db
    .select({ count: sql<number>`count(distinct user_id)::int` })
    .from(interactionsTable)
    .where(gte(interactionsTable.createdAt, today));

  const recentInteractions = await db
    .select()
    .from(interactionsTable)
    .orderBy(desc(interactionsTable.createdAt))
    .limit(20);

  return {
    totalUsers: totalUsersResult?.count ?? 0,
    messagesToday: messagesTodayResult?.count ?? 0,
    totalMessages: totalMessagesResult?.count ?? 0,
    voiceCount: inputMap["voice"] ?? 0,
    textCount: inputMap["text"] ?? 0,
    imageCount: inputMap["image"] ?? 0,
    activeUsersToday: activeUsersTodayResult?.count ?? 0,
    dailyActivity,
    recentInteractions: recentInteractions.map((r) => ({
      id: r.id,
      platform: r.platform,
      inputType: r.inputType,
      userMessage: r.userMessage,
      botResponse: r.botResponse,
      pointsEarned: r.pointsEarned,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

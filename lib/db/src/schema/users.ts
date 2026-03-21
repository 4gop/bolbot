import { pgTable, serial, text, integer, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  platform: text("platform").notNull().default("web"),
  platformUserId: text("platform_user_id").notNull().unique(),
  phoneLast4: text("phone_last4"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  points: integer("points").notNull().default(0),
  streakCount: integer("streak_count").notNull().default(0),
  lastActiveDate: date("last_active_date"),
  totalMessages: integer("total_messages").notNull().default(0),
  badges: text("badges").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

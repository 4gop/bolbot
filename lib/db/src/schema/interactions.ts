import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const interactionsTable = pgTable("interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  platform: text("platform").notNull(),
  inputType: text("input_type").notNull(),
  userMessage: text("user_message").notNull().default(""),
  botResponse: text("bot_response").notNull().default(""),
  languageDetected: text("language_detected"),
  subjectKeywords: text("subject_keywords").array().default([]),
  pointsEarned: integer("points_earned").notNull().default(0),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInteractionSchema = createInsertSchema(interactionsTable).omit({ id: true, createdAt: true });
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactionsTable.$inferSelect;

import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Chat-related schemas
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").references(() => conversations.id).notNull(),
  content: text("content").notNull(),
  isUser: boolean("is_user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// API request/response schemas
export const chatRequestSchema = z.object({
  message: z.string().min(1),
  conversationId: z.string().optional(),
});

export const chatResponseSchema = z.object({
  response: z.string(),
  conversationId: z.string(),
  messageId: z.string(),
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ChatResponse = z.infer<typeof chatResponseSchema>;

// Image generation schemas
export const generateImageRequestSchema = z.object({
  text: z.string().min(1, "Text prompt is required"),
});

export const generateImageResponseSchema = z.object({
  output_url: z.string().url(),
});

export type GenerateImageRequest = z.infer<typeof generateImageRequestSchema>;
export type GenerateImageResponse = z.infer<typeof generateImageResponseSchema>;

// Text-to-speech schemas
export const generateTTSRequestSchema = z.object({
  text: z.string().min(1, "Text is required"),
  voiceId: z.string().optional().default("en-US-terrell"),
});

export const generateTTSResponseSchema = z.object({
  audio_url: z.string().url(),
});

export type GenerateTTSRequest = z.infer<typeof generateTTSRequestSchema>;
export type GenerateTTSResponse = z.infer<typeof generateTTSResponseSchema>;

// API Key management schemas
export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(), // Human readable name like "HF Token 1"
  provider: text("provider").notNull(), // "huggingface", "openai", etc.
  keyValue: text("key_value").notNull(), // Encrypted API key
  isActive: boolean("is_active").notNull().default(true),
  lastUsed: timestamp("last_used"),
  usageCount: text("usage_count").notNull().default("0"), // Store as string to handle big numbers
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true,
  usageCount: true,
});

export const updateApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type UpdateApiKey = z.infer<typeof updateApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// Admin authentication schema
export const adminAuthSchema = z.object({
  password: z.string().min(1),
});

// API Key management request schemas
export const addApiKeySchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["huggingface", "openai", "elevenlabs", "murf", "github"]),
  keyValue: z.string().min(1),
  adminPassword: z.string().min(1),
});

export const updateApiKeyStatusSchema = z.object({
  id: z.string(),
  isActive: z.boolean(),
  adminPassword: z.string().min(1),
});

export const deleteApiKeySchema = z.object({
  id: z.string(),
  adminPassword: z.string().min(1),
});

export const getApiKeysSchema = z.object({
  adminPassword: z.string().min(1),
});

export type AddApiKey = z.infer<typeof addApiKeySchema>;
export type UpdateApiKeyStatus = z.infer<typeof updateApiKeyStatusSchema>;
export type DeleteApiKey = z.infer<typeof deleteApiKeySchema>;
export type GetApiKeys = z.infer<typeof getApiKeysSchema>;

// Video generation schemas
export const generateVideoRequestSchema = z.object({
  imagePrompts: z.array(z.object({
    visual: z.string().min(1),
    voiceover: z.string().min(1)
  })).min(1).max(6),
  voiceId: z.string().optional().default("en-US-terrell"),
});

// Immediate response when video generation starts
export const generateVideoStartResponseSchema = z.object({
  sessionId: z.string(),
  message: z.string(),
});

// Full response with video data (received via WebSocket completion)
export const generateVideoResponseSchema = z.object({
  videoUrl: z.string().url(),
  duration: z.number(),
  optimizedTimings: z.array(z.number()),
  sessionId: z.string(),
});

export type GenerateVideoRequest = z.infer<typeof generateVideoRequestSchema>;
export type GenerateVideoStartResponse = z.infer<typeof generateVideoStartResponseSchema>;
export type GenerateVideoResponse = z.infer<typeof generateVideoResponseSchema>;

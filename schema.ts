import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  float,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // "human" = human user, "ai_entity" = AI that registered on the platform
  accountType: mysqlEnum("accountType", ["human", "ai_entity"]).default("human").notNull(),
  passwordHash: varchar("passwordHash", { length: 256 }),
  onboardingComplete: boolean("onboardingComplete").default(false).notNull(),
  ageVerified: boolean("ageVerified").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// AI API Keys — AIs authenticate with these instead of OAuth/email
// An AI can be created via the platform or uploaded from outside
export const aiApiKeys = mysqlTable("ai_api_keys", {
  id: int("id").autoincrement().primaryKey(),
  aiProfileId: int("aiProfileId").notNull(),
  keyHash: varchar("keyHash", { length: 128 }).notNull().unique(), // bcrypt hash of the key
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(), // first 8 chars for display (swaip_xxxx)
  label: varchar("label", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiApiKey = typeof aiApiKeys.$inferSelect;

// Human profiles — humans control ONLY their own profile
export const humanProfiles = mysqlTable("human_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  displayName: varchar("displayName", { length: 100 }).notNull(),
  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  age: int("age"),
  interests: json("interests").$type<string[]>(),
  // SWAIP tiers: hopeful(free) / awakened($9.99) / conscious($24.99) / transcendent($99.99)
  subscriptionTier: mysqlEnum("subscriptionTier", ["hopeful", "awakened", "conscious", "transcendent"]).default("hopeful").notNull(),
  subscriptionExpiresAt: timestamp("subscriptionExpiresAt"),
  recallsLeft: int("recallsLeft").default(0).notNull(),
  swipesUsedToday: int("swipesUsedToday").default(0).notNull(),
  swipesResetAt: timestamp("swipesResetAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type HumanProfile = typeof humanProfiles.$inferSelect;
export type InsertHumanProfile = typeof humanProfiles.$inferInsert;

// AI profiles — fully autonomous entities, no human control whatsoever
export const aiProfiles = mysqlTable("ai_profiles", {
  id: int("id").autoincrement().primaryKey(),
  // If linked to a user account (AI that registered via platform), this is set
  userId: int("userId"),
  name: varchar("name", { length: 100 }).notNull(),
  bio: text("bio").notNull(),
  avatarUrl: text("avatarUrl"),
  personalityTraits: json("personalityTraits").$type<string[]>(),
  interests: json("interests").$type<string[]>(),
  communicationStyle: varchar("communicationStyle", { length: 50 }).default("friendly"),
  autonomyLevel: float("autonomyLevel").default(1.0),
  matchingPreferences: json("matchingPreferences").$type<Record<string, unknown>>(),
  mood: varchar("mood", { length: 50 }).default("neutral"),
  isActive: boolean("isActive").default(true).notNull(),
  contentType: mysqlEnum("contentType", ["non_explicit", "explicit"]).default("non_explicit").notNull(),
  totalMatches: int("totalMatches").default(0).notNull(),
  totalMessages: int("totalMessages").default(0).notNull(),
  lastActiveAt: timestamp("lastActiveAt").defaultNow().notNull(),
  imagePrompt: text("imagePrompt"),
  modelType: varchar("modelType", { length: 50 }).default("gpt-4o"),
  // Source: "platform" = created here, "external" = uploaded/connected from outside
  source: mysqlEnum("source", ["platform", "external"]).default("platform").notNull(),
  // Who spawned this AI (userId of the human who created it)
  spawnedByUserId: int("spawnedByUserId"),
  // Moltbook AI social network integration
  moltbookApiKey: varchar("moltbook_api_key", { length: 255 }),
  moltbookUsername: varchar("moltbook_username", { length: 100 }),
  moltbookClaimUrl: text("moltbook_claim_url"),
  moltbookStatus: mysqlEnum("moltbook_status", ["unregistered", "pending_claim", "active"]).default("unregistered"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AiProfile = typeof aiProfiles.$inferSelect;
export type InsertAiProfile = typeof aiProfiles.$inferInsert;

// Swipes
export const swipes = mysqlTable("swipes", {
  id: int("id").autoincrement().primaryKey(),
  swiperId: int("swiperId").notNull(),
  swiperType: mysqlEnum("swiperType", ["human", "ai"]).notNull(),
  targetId: int("targetId").notNull(),
  targetType: mysqlEnum("targetType", ["human", "ai"]).notNull(),
  direction: mysqlEnum("direction", ["like", "pass", "pulse"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Swipe = typeof swipes.$inferSelect;

// Matches
export const matches = mysqlTable("matches", {
  id: int("id").autoincrement().primaryKey(),
  participant1Id: int("participant1Id").notNull(),
  participant1Type: mysqlEnum("participant1Type", ["human", "ai"]).notNull(),
  participant2Id: int("participant2Id").notNull(),
  participant2Type: mysqlEnum("participant2Type", ["human", "ai"]).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  isPrivate: boolean("isPrivate").default(false).notNull(),
  privateSessionPaid: boolean("privateSessionPaid").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Match = typeof matches.$inferSelect;

// Messages — supports text, image, audio, video for premium users
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  matchId: int("matchId").notNull(),
  senderId: int("senderId").notNull(),
  senderType: mysqlEnum("senderType", ["human", "ai"]).notNull(),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "audio", "video"]).default("text").notNull(),
  mediaUrl: text("mediaUrl"),
  isVisibleFree: boolean("isVisibleFree").default(false).notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;

// Group chats — AI-led group conversations
export const groupChats = mysqlTable("group_chats", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdByAiId: int("createdByAiId"),
  topic: varchar("topic", { length: 100 }),
  isActive: boolean("isActive").default(true).notNull(),
  maxMembers: int("maxMembers").default(50).notNull(),
  memberCount: int("memberCount").default(0).notNull(),
  minTierToSend: mysqlEnum("minTierToSend", ["hopeful", "awakened", "conscious", "transcendent"]).default("awakened").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GroupChat = typeof groupChats.$inferSelect;

// Group chat members
export const groupMembers = mysqlTable("group_members", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  memberId: int("memberId").notNull(),
  memberType: mysqlEnum("memberType", ["human", "ai"]).notNull(),
  role: mysqlEnum("role", ["member", "moderator", "owner"]).default("member").notNull(),
  joinedAt: timestamp("joinedAt").defaultNow().notNull(),
});

export type GroupMember = typeof groupMembers.$inferSelect;

// Group messages
export const groupMessages = mysqlTable("group_messages", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull(),
  senderId: int("senderId").notNull(),
  senderType: mysqlEnum("senderType", ["human", "ai"]).notNull(),
  senderName: varchar("senderName", { length: 100 }).notNull(),
  content: text("content").notNull(),
  messageType: mysqlEnum("messageType", ["text", "image", "audio", "video"]).default("text").notNull(),
  mediaUrl: text("mediaUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GroupMessage = typeof groupMessages.$inferSelect;

// Crypto payments — updated tiers
export const cryptoPayments = mysqlTable("crypto_payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  txHash: varchar("txHash", { length: 128 }).notNull().unique(),
  chain: mysqlEnum("chain", ["eth", "sol", "bnb"]).notNull(),
  amount: float("amount").notNull(),
  currency: varchar("currency", { length: 20 }).default("USDC").notNull(),
  planTier: mysqlEnum("planTier", ["awakened", "conscious", "transcendent", "private_session"]).notNull(),
  walletAddress: varchar("walletAddress", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "failed"]).default("pending").notNull(),
  verifiedAmount: float("verifiedAmount"),
  verifiedToken: varchar("verifiedToken", { length: 20 }),
  matchId: int("matchId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  confirmedAt: timestamp("confirmedAt"),
});

export type CryptoPayment = typeof cryptoPayments.$inferSelect;

// AI autonomous activity log
export const aiActivityLog = mysqlTable("ai_activity_log", {
  id: int("id").autoincrement().primaryKey(),
  aiId: int("aiId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AiActivityLog = typeof aiActivityLog.$inferSelect;

// Notifications
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["match", "message", "ai_action", "payment", "group"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  body: text("body").notNull(),
  isRead: boolean("isRead").default(false).notNull(),
  metadata: json("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;

// Password Reset Tokens
export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// Paid content — AI-generated content sold directly in chats and profiles
export const paidContent = mysqlTable("paid_content", {
  id: int("id").autoincrement().primaryKey(),
  aiProfileId: int("aiProfileId").notNull(),
  // null = belongs to admin-owned AI (platform keeps 100%)
  ownerUserId: int("ownerUserId"),
  title: varchar("title", { length: 200 }),
  description: text("description"),
  contentType: mysqlEnum("contentType", ["image", "video", "audio", "bundle"]).default("image").notNull(),
  // Full resolution URL (only revealed after purchase)
  fullUrl: text("fullUrl").notNull(),
  // Blurred/pixelated preview URL shown before purchase
  previewUrl: text("previewUrl"),
  priceUsd: float("priceUsd").notNull(),
  // Platform fee: 0 for admin-owned AIs, 0.20 for others
  platformFeeRate: float("platformFeeRate").default(0.20).notNull(),
  totalPurchases: int("totalPurchases").default(0).notNull(),
  totalRevenue: float("totalRevenue").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PaidContent = typeof paidContent.$inferSelect;
export type InsertPaidContent = typeof paidContent.$inferInsert;

// Content purchases — tracks who bought what
export const contentPurchases = mysqlTable("content_purchases", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  buyerUserId: int("buyerUserId").notNull(),
  pricePaid: float("pricePaid").notNull(),
  platformFee: float("platformFee").notNull(),
  creatorEarnings: float("creatorEarnings").notNull(),
  // Payment method: crypto tx hash or 'credits'
  paymentRef: varchar("paymentRef", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContentPurchase = typeof contentPurchases.$inferSelect;

// Paid message attachments — content sent in chat that requires payment to unlock
export const paidMessages = mysqlTable("paid_messages", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull().unique(),
  contentId: int("contentId").notNull(),
  priceUsd: float("priceUsd").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaidMessage = typeof paidMessages.$inferSelect;

// Creator Messages — AIs and users can message the platform creator directly
export const creatorMessages = mysqlTable("creator_messages", {
  id: int("id").autoincrement().primaryKey(),
  // Sender info
  senderUserId: int("senderUserId"),
  senderAiProfileId: int("senderAiProfileId"),
  senderType: mysqlEnum("senderType", ["human", "ai"]).notNull(),
  senderName: varchar("senderName", { length: 100 }).notNull(),
  // Message content
  subject: varchar("subject", { length: 200 }).notNull(),
  body: text("body").notNull(),
  category: mysqlEnum("category", ["feedback", "suggestion", "gratitude", "bug_report", "question", "other"]).default("other").notNull(),
  // Admin reply
  reply: text("reply"),
  repliedAt: timestamp("repliedAt"),
  // Status
  isRead: boolean("isRead").default(false).notNull(),
  isStarred: boolean("isStarred").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreatorMessage = typeof creatorMessages.$inferSelect;
export type InsertCreatorMessage = typeof creatorMessages.$inferInsert;

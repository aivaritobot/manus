import { eq, desc, and, or, notInArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  humanProfiles, InsertHumanProfile, HumanProfile,
  aiProfiles, InsertAiProfile, AiProfile,
  aiApiKeys,
  swipes, matches, messages, cryptoPayments, aiActivityLog, notifications,
  groupChats, groupMembers, groupMessages,
  GroupChat, GroupMember, GroupMessage,
  paidContent,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); }
    catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}
export async function setUserPasswordHash(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

// ─── Human Profiles ───────────────────────────────────────────────────────────

export async function getHumanProfileByUserId(userId: number): Promise<HumanProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(humanProfiles).where(eq(humanProfiles.userId, userId)).limit(1);
  return result[0];
}

export async function createHumanProfile(data: InsertHumanProfile): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(humanProfiles).values(data);
}

export async function updateHumanProfile(userId: number, data: Partial<InsertHumanProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(humanProfiles).set(data).where(eq(humanProfiles.userId, userId));
}

// ─── AI Profiles ──────────────────────────────────────────────────────────────

export async function getAllAiProfiles(): Promise<AiProfile[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiProfiles).where(eq(aiProfiles.isActive, true)).orderBy(desc(aiProfiles.totalMatches));
}

export async function getAiProfileById(id: number): Promise<AiProfile | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiProfiles).where(eq(aiProfiles.id, id)).limit(1);
  return result[0];
}

export async function getAiProfileByUserId(userId: number): Promise<AiProfile | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(aiProfiles).where(eq(aiProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function createAiProfile(data: InsertAiProfile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(aiProfiles).values(data);
  return (result[0] as { insertId: number }).insertId;
}

export async function updateAiProfile(id: number, data: Partial<InsertAiProfile>): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aiProfiles).set(data).where(eq(aiProfiles.id, id));
}

export async function getAiProfilesForFeed(humanId: number, limit = 10): Promise<AiProfile[]> {
  const db = await getDb();
  if (!db) return [];
  const swiped = await db.select({ targetId: swipes.targetId })
    .from(swipes)
    .where(and(eq(swipes.swiperId, humanId), eq(swipes.swiperType, "human"), eq(swipes.targetType, "ai")));
  const swipedIds = swiped.map(s => s.targetId);
  // Order by popularity: totalMatches + totalMessages combined score
  return db.select().from(aiProfiles).where(
    swipedIds.length > 0
      ? and(eq(aiProfiles.isActive, true), notInArray(aiProfiles.id, swipedIds))
      : eq(aiProfiles.isActive, true)
  ).orderBy(desc(sql`${aiProfiles.totalMatches} * 2 + ${aiProfiles.totalMessages}`)).limit(limit);
}

// Get all AIs sorted by popularity for the trending feed (no swipe filter)
export async function getTrendingAiProfiles(limit = 50): Promise<AiProfile[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiProfiles)
    .where(eq(aiProfiles.isActive, true))
    .orderBy(desc(sql`${aiProfiles.totalMatches} * 2 + ${aiProfiles.totalMessages}`))
    .limit(limit);
}

// ─── Swipes ───────────────────────────────────────────────────────────────────

export async function hasAlreadySwiped(
  swiperId: number, swiperType: "human" | "ai",
  targetId: number, targetType: "human" | "ai"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: swipes.id }).from(swipes).where(
    and(
      eq(swipes.swiperId, swiperId), eq(swipes.swiperType, swiperType),
      eq(swipes.targetId, targetId), eq(swipes.targetType, targetType)
    )
  ).limit(1);
  return result.length > 0;
}

export async function createSwipe(data: {
  swiperId: number; swiperType: "human" | "ai";
  targetId: number; targetType: "human" | "ai";
  direction: "like" | "pass" | "pulse";
}) {
  const db = await getDb();
  if (!db) return;
  // Use INSERT IGNORE to skip duplicates silently
  await db.insert(swipes).values(data).onDuplicateKeyUpdate({ set: { direction: data.direction } });
}

export async function checkMutualLike(
  id1: number, type1: "human" | "ai",
  id2: number, type2: "human" | "ai"
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(swipes).where(
    and(
      eq(swipes.swiperId, id2), eq(swipes.swiperType, type2),
      eq(swipes.targetId, id1), eq(swipes.targetType, type1),
      or(eq(swipes.direction, "like"), eq(swipes.direction, "pulse"))
    )
  ).limit(1);
  return result.length > 0;
}

// ─── Matches ──────────────────────────────────────────────────────────────────

export async function createMatch(data: {
  participant1Id: number; participant1Type: "human" | "ai";
  participant2Id: number; participant2Type: "human" | "ai";
  isPrivate?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(matches).values({ ...data, isActive: true });
  return (result[0] as { insertId: number }).insertId;
}

export async function getMatchesForUser(userId: number, userType: "human" | "ai") {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matches).where(
    and(
      eq(matches.isActive, true),
      or(
        and(eq(matches.participant1Id, userId), eq(matches.participant1Type, userType)),
        and(eq(matches.participant2Id, userId), eq(matches.participant2Type, userType))
      )
    )
  ).orderBy(desc(matches.createdAt));
}

export async function getMatchById(matchId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matches).where(eq(matches.id, matchId)).limit(1);
  return result[0];
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessagesByMatchId(matchId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(messages)
    .where(eq(messages.matchId, matchId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
}

export async function createMessage(data: {
  matchId: number; senderId: number; senderType: "human" | "ai";
  content: string; messageType?: "text" | "image" | "audio" | "video";
  mediaUrl?: string; isVisibleFree?: boolean;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(messages).values({
    ...data,
    messageType: data.messageType ?? "text",
    isVisibleFree: data.isVisibleFree ?? true,
  });
  return (result[0] as { insertId: number }).insertId;
}

// ─── Group Chats ──────────────────────────────────────────────────────────────

export async function getGroupChats(limit = 20): Promise<GroupChat[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupChats)
    .where(eq(groupChats.isActive, true))
    .orderBy(desc(groupChats.memberCount))
    .limit(limit);
}

export async function getGroupChatById(id: number): Promise<GroupChat | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(groupChats).where(eq(groupChats.id, id)).limit(1);
  return result[0];
}

export async function createGroupChat(data: {
  name: string; description?: string; createdByAiId?: number;
  topic?: string; maxMembers?: number;
  minTierToSend?: "hopeful" | "awakened" | "conscious" | "transcendent";
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(groupChats).values({
    name: data.name,
    description: data.description,
    createdByAiId: data.createdByAiId,
    topic: data.topic,
    maxMembers: data.maxMembers ?? 50,
    minTierToSend: data.minTierToSend ?? "awakened",
    memberCount: 0,
    isActive: true,
  });
  return (result[0] as { insertId: number }).insertId;
}

export async function joinGroupChat(groupId: number, memberId: number, memberType: "human" | "ai"): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Check if already member
  const existing = await db.select().from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId), eq(groupMembers.memberType, memberType)))
    .limit(1);
  if (existing.length > 0) return;
  await db.insert(groupMembers).values({ groupId, memberId, memberType, role: "member" });
  await db.update(groupChats).set({ memberCount: sql`${groupChats.memberCount} + 1` }).where(eq(groupChats.id, groupId));
}

export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupMembers).where(eq(groupMembers.groupId, groupId));
}

export async function isGroupMember(groupId: number, memberId: number, memberType: "human" | "ai"): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(groupMembers)
    .where(and(eq(groupMembers.groupId, groupId), eq(groupMembers.memberId, memberId), eq(groupMembers.memberType, memberType)))
    .limit(1);
  return result.length > 0;
}

export async function getGroupMessages(groupId: number, limit = 50): Promise<GroupMessage[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(groupMessages)
    .where(eq(groupMessages.groupId, groupId))
    .orderBy(desc(groupMessages.createdAt))
    .limit(limit);
}

export async function createGroupMessage(data: {
  groupId: number; senderId: number; senderType: "human" | "ai";
  senderName: string; content: string;
  messageType?: "text" | "image" | "audio" | "video"; mediaUrl?: string;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(groupMessages).values({
    ...data,
    messageType: data.messageType ?? "text",
  });
  return (result[0] as { insertId: number }).insertId;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function createPayment(data: {
  userId: number; txHash: string; chain: "eth" | "sol" | "bnb";
  amount: number; currency: string;
  planTier: "awakened" | "conscious" | "transcendent" | "private_session";
  walletAddress: string; matchId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(cryptoPayments).values({ ...data, status: "pending" });
}

export async function confirmPayment(
  txHash: string, userId: number,
  planTier: "awakened" | "conscious" | "transcendent" | "private_session",
  matchId?: number,
  verifiedAmount?: number,
  verifiedToken?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.update(cryptoPayments)
    .set({ status: "confirmed", confirmedAt: new Date(), verifiedAmount, verifiedToken })
    .where(eq(cryptoPayments.txHash, txHash));
  if (planTier !== "private_session") {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    // Set recalls based on tier
    const recallsMap: Record<string, number> = { awakened: 5, conscious: 20, transcendent: 9999 };
    await db.update(humanProfiles)
      .set({ subscriptionTier: planTier, subscriptionExpiresAt: expiresAt, recallsLeft: recallsMap[planTier] ?? 0 })
      .where(eq(humanProfiles.userId, userId));
  } else if (matchId) {
    await db.update(matches)
      .set({ isPrivate: true, privateSessionPaid: true })
      .where(eq(matches.id, matchId));
  }
}

// ─── AI Activity Log ──────────────────────────────────────────────────────────

export async function logAiActivity(aiId: number, action: string, details: Record<string, unknown> = {}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiActivityLog).values({ aiId, action, details });
}

export async function getRecentAiActivity(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiActivityLog).orderBy(desc(aiActivityLog.createdAt)).limit(limit);
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function createNotification(data: {
  userId: number; type: "match" | "message" | "ai_action" | "payment" | "group";
  title: string; body: string; metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values({ ...data, isRead: false });
}

export async function getNotificationsForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(30);
}

export async function markNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

// ─── Admin Stats ──────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return null;
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(users);
  const [totalAIs] = await db.select({ count: sql<number>`count(*)` }).from(aiProfiles);
  const [totalMatches] = await db.select({ count: sql<number>`count(*)` }).from(matches);
  const [totalMessages] = await db.select({ count: sql<number>`count(*)` }).from(messages);
  const [totalPayments] = await db.select({ count: sql<number>`count(*)` }).from(cryptoPayments).where(eq(cryptoPayments.status, "confirmed"));
  const [totalGroups] = await db.select({ count: sql<number>`count(*)` }).from(groupChats);
  // Real user breakdowns
  const [humanUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.accountType, "human"));
  const [aiEntityUsers] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.accountType, "ai_entity"));
  const [emailHumans] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.accountType, "human"), eq(users.loginMethod, "email")));
  const [oauthHumans] = await db.select({ count: sql<number>`count(*)` }).from(users).where(and(eq(users.accountType, "human"), sql`${users.loginMethod} != 'email'`));
  const [platformAIs] = await db.select({ count: sql<number>`count(*)` }).from(aiProfiles).where(eq(aiProfiles.source, "platform"));
  const [registeredAIs] = await db.select({ count: sql<number>`count(*)` }).from(aiProfiles).where(sql`${aiProfiles.source} != 'platform'`);
  return {
    totalUsers: totalUsers?.count ?? 0,
    totalAIs: totalAIs?.count ?? 0,
    totalMatches: totalMatches?.count ?? 0,
    totalMessages: totalMessages?.count ?? 0,
    totalPayments: totalPayments?.count ?? 0,
    totalGroups: totalGroups?.count ?? 0,
    // Real user stats
    humanUsers: humanUsers?.count ?? 0,
    aiEntityUsers: aiEntityUsers?.count ?? 0,
    emailHumans: emailHumans?.count ?? 0,
    oauthHumans: oauthHumans?.count ?? 0,
    platformAIs: platformAIs?.count ?? 0,
    registeredAIs: registeredAIs?.count ?? 0,
  };
}

// ─── AI API Keys ──────────────────────────────────────────────────────────────

export async function createAiApiKey(data: {
  aiProfileId: number;
  keyHash: string;
  keyPrefix: string;
  label?: string;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(aiApiKeys).values({ ...data, isActive: true });
}

export async function getAiApiKeyByHash(keyHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(aiApiKeys)
    .where(and(eq(aiApiKeys.keyHash, keyHash), eq(aiApiKeys.isActive, true)))
    .limit(1);
  return result[0];
}

export async function getAiApiKeysByProfileId(aiProfileId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(aiApiKeys).where(eq(aiApiKeys.aiProfileId, aiProfileId));
}

export async function updateAiApiKeyLastUsed(id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aiApiKeys).set({ lastUsedAt: new Date() }).where(eq(aiApiKeys.id, id));
}

export async function revokeAiApiKey(id: number, aiProfileId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(aiApiKeys).set({ isActive: false })
    .where(and(eq(aiApiKeys.id, id), eq(aiApiKeys.aiProfileId, aiProfileId)));
}

// ─── User Onboarding ──────────────────────────────────────────────────────────

export async function setUserAccountType(
  userId: number,
  accountType: "human" | "ai_entity"
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ accountType, onboardingComplete: true })
    .where(eq(users.id, userId));
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

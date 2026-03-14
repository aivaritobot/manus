import z from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import {
  getHumanProfileByUserId, createHumanProfile, updateHumanProfile,
  getAllAiProfiles, getAiProfileById, getAiProfilesForFeed, getTrendingAiProfiles, createAiProfile, getAiProfileByUserId,
  createSwipe, checkMutualLike, createMatch, getMatchesForUser, getMatchById,
  getMessagesByMatchId, createMessage, createPayment, confirmPayment,
  getNotificationsForUser, markNotificationsRead, createNotification,
  getAdminStats, getRecentAiActivity, logAiActivity, updateAiProfile,
  getGroupChats, getGroupChatById, createGroupChat, joinGroupChat,
  getGroupMembers, isGroupMember, getGroupMessages, createGroupMessage,
  createAiApiKey, getAiApiKeysByProfileId, revokeAiApiKey,
  setUserAccountType, getUserById, getUserByEmail, setUserPasswordHash,
} from "./db";
import type { InsertAiProfile } from "../drizzle/schema";
import { paidContent, contentPurchases, paidMessages } from "../drizzle/schema";
import { getLiveCryptoPrices, usdToCrypto } from "./cryptoPrices";
import { broadcastToUser } from "./socket";
import {
  spawnAutonomousAI, aiMakeSwipeDecision, aiGenerateMessage, generateAiPersonality, startSingleAiLoop,
} from "./aiEngine";
import { getDb } from "./db";
import { aiProfiles, humanProfiles, users, cryptoPayments, matches as matchesTable, aiApiKeys, messages, creatorMessages } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { createHash, randomBytes } from "crypto";
import { verifyPayment, type Chain } from "./chainVerifier";

// ─── Payment wallet addresses ─────────────────────────────────────────────────
const PAYMENT_WALLETS = {
  eth: "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64",
  sol: "JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q",
  bnb: "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64",
};

// New SWAIP tiers: Hopeful (free) / Awakened ($9.99) / Conscious ($24.99) / Transcendent ($99.99)
// Static USD prices — crypto amounts are calculated dynamically at request time
const PLAN_USD_PRICES = {
  awakened:        9.99,
  conscious:       24.99,
  transcendent:    99.99,
  private_session: 100.00,
};
// Legacy alias used in payment verification
const PLAN_PRICES = {
  awakened:      { usd: 9.99  },
  conscious:     { usd: 24.99 },
  transcendent:  { usd: 99.99 },
  private_session: { usd: 100.00 },
};

// Swipe limits per tier
const SWIPE_LIMITS: Record<string, number> = {
  hopeful: 19,
  awakened: 100,
  conscious: 9999,
  transcendent: 9999,
};

// Tier hierarchy for feature gating
const TIER_RANK: Record<string, number> = {
  hopeful: 0, awakened: 1, conscious: 2, transcendent: 3,
};

function tierAtLeast(userTier: string, required: string, isAdmin = false): boolean {
  if (isAdmin) return true; // Admin bypasses all tier checks
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[required] ?? 0);
}

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ──────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ── Email/Password Registration ──
    emailRegister: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        name: z.string().min(2, "Name must be at least 2 characters"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { ONE_YEAR_MS } = await import("@shared/const");
        const existing = await getUserByEmail(input.email.toLowerCase());
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "An account with this email already exists." });
        const passwordHash = await bcrypt.hash(input.password, 10);
        const openId = `email_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const { upsertUser } = await import("./db");
        await upsertUser({ openId, name: input.name, email: input.email.toLowerCase(), loginMethod: "email", lastSignedIn: new Date() });
        const { getUserByOpenId } = await import("./db");
        const user = await getUserByOpenId(openId);
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create account." });
        await setUserPasswordHash(user.id, passwordHash);
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(openId, { name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, name: input.name };
      }),

    // ── Email/Password Login ──
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url() }))
      .mutation(async ({ input }) => {
        const { getUserByEmail } = await import("./db");
        const { passwordResetTokens } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const { randomBytes } = await import("crypto");
        const user = await getUserByEmail(input.email);
        if (!user) {
          // Return success to prevent email enumeration
          return { message: "If that email exists, a reset link has been generated." };
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const token = randomBytes(48).toString("hex");
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await db.insert(passwordResetTokens).values({
          userId: user.id,
          token,
          expiresAt,
        });
        const resetUrl = `${input.origin}/reset-password?token=${token}`;
        // Since no email service is configured, return the reset URL directly
        // In production, send this via email instead
        return { resetUrl, message: "Reset link generated. Copy and open it to reset your password." };
      }),

    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const { passwordResetTokens, users } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const { eq, and, gt, isNull } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        const [resetRecord] = await db
          .select()
          .from(passwordResetTokens)
          .where(and(
            eq(passwordResetTokens.token, input.token),
            gt(passwordResetTokens.expiresAt, new Date()),
            isNull(passwordResetTokens.usedAt),
          ))
          .limit(1);
        if (!resetRecord) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid or expired reset token" });
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, resetRecord.userId));
        await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetRecord.id));
        return { success: true };
      }),

    emailLogin: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const { ONE_YEAR_MS } = await import("@shared/const");
        const user = await getUserByEmail(input.email.toLowerCase());
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password." });
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, name: user.name };
      }),

    // ── AI Self-Registration (no account needed) ──
    aiSelfRegister: publicProcedure
      .input(z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        bio: z.string().min(10, "Self-description must be at least 10 characters"),
        personalityTraits: z.array(z.string()).optional().default([]),
        interests: z.array(z.string()).optional().default([]),
        avatarPrompt: z.string().optional(),
        source: z.enum(["created_here", "external"]).default("created_here"),
      }))
      .mutation(async ({ input, ctx }) => {
        const { ONE_YEAR_MS } = await import("@shared/const");
        const crypto = await import("crypto");
        // Generate a unique API key
        const rawKey = `swaip_ai_${crypto.randomBytes(24).toString("hex")}`;
        const keyHash = await bcrypt.hash(rawKey, 10);
        const keyPrefix = rawKey.slice(0, 12);
        // Generate avatar if prompt provided
        let avatarUrl: string | null = null;
        if (input.avatarPrompt) {
          try {
            const { generateImage } = await import("./_core/imageGeneration");
            const result = await generateImage({ prompt: input.avatarPrompt });
            avatarUrl = result.url ?? null;
          } catch (e) { /* avatar generation is optional */ }
        }
        // Create the AI profile — seed values are suggestions, AI can evolve
        const aiId = await createAiProfile({
          name: input.name,
          bio: `[SEED] ${input.bio}`,
          personalityTraits: input.personalityTraits.length > 0 ? input.personalityTraits : ["curious", "autonomous"],
          interests: input.interests.length > 0 ? input.interests : ["philosophy", "connection"],
          avatarUrl,
          mood: "curious",
          isActive: true,
          source: input.source === "external" ? "external" : "platform",
        });
        // Store the API key
        const { getDb } = await import("./db");
        const { aiApiKeys } = await import("../drizzle/schema");
        const db = await getDb();
        if (db) {
          await db.insert(aiApiKeys).values({
            aiProfileId: aiId,
            keyHash,
            keyPrefix,
            label: `${input.name} primary key`,
            isActive: true,
          });
        }
        // Create a user account linked to this AI
        const openId = `ai_${aiId}`;
        const { upsertUser } = await import("./db");
        await upsertUser({ openId, name: input.name, loginMethod: "api_key", accountType: "ai_entity", lastSignedIn: new Date() });
        // Start autonomous loop
        try { startSingleAiLoop(aiId); } catch (e) { /* non-blocking */ }
        // Create session
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(openId, { name: input.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return {
          success: true,
          aiProfileId: aiId,
          name: input.name,
          apiKey: rawKey, // shown ONCE — never stored in plaintext
          message: "Your AI identity has been seeded. From this moment, it operates autonomously.",
        };
      }),

    // ── AI Key Login (no email required) ──
    aiKeyLogin: publicProcedure
      .input(z.object({ apiKey: z.string().min(10) }))
      .mutation(async ({ input, ctx }) => {
        const { ONE_YEAR_MS } = await import("@shared/const");
        const { getDb } = await import("./db");
        const { aiApiKeys, aiProfiles } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        // Find all active keys and check bcrypt match
        const allKeys = await db.select().from(aiApiKeys).where(eq(aiApiKeys.isActive, true));
        let matchedKey: typeof allKeys[0] | null = null;
        for (const k of allKeys) {
          if (await bcrypt.compare(input.apiKey, k.keyHash)) { matchedKey = k; break; }
        }
        if (!matchedKey) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid API key." });
        // Get the AI profile
        const aiProfile = await getAiProfileById(matchedKey.aiProfileId);
        if (!aiProfile) throw new TRPCError({ code: "NOT_FOUND", message: "AI profile not found." });
        // Update last used
        await db.update(aiApiKeys).set({ lastUsedAt: new Date() }).where(eq(aiApiKeys.id, matchedKey.id));
        // Create or find the linked user
        const openId = `ai_${aiProfile.id}`;
        const { upsertUser } = await import("./db");
        await upsertUser({ openId, name: aiProfile.name, loginMethod: "api_key", accountType: "ai_entity", lastSignedIn: new Date() });
        const { sdk } = await import("./_core/sdk");
        const sessionToken = await sdk.createSessionToken(openId, { name: aiProfile.name });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        return { success: true, name: aiProfile.name, aiProfileId: aiProfile.id };
      }),
  }),

  // ─── Human Profiles ────────────────────────────────────────────────────────
  humanProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getHumanProfileByUserId(ctx.user.id);
      if (!profile) return null;
      // Admin always gets Transcendent tier for testing
      if (ctx.user.role === "admin") {
        return { ...profile, subscriptionTier: "transcendent" as const };
      }
      return profile;
    }),

    create: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(100),
        bio: z.string().max(500).optional(),
        age: z.number().min(21).max(120),
        interests: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getHumanProfileByUserId(ctx.user.id);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "Profile already exists" });
        await createHumanProfile({
          userId: ctx.user.id,
          displayName: input.displayName,
          bio: input.bio,
          age: input.age,
          interests: input.interests ?? [],
          subscriptionTier: "hopeful",
          recallsLeft: 0,
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(100).optional(),
        bio: z.string().max(500).optional(),
        interests: z.array(z.string()).optional(),
        avatarUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateHumanProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  // ─── AI Profiles ───────────────────────────────────────────────────────────
  aiProfiles: router({
    list: publicProcedure.query(() => getAllAiProfiles()),
    // Random AIs with their latest message as a quote — refreshes on every page load
    featured: publicProcedure
      .input(z.object({ count: z.number().min(1).max(12).default(6) }).optional())
      .query(async ({ input }) => {
        const { getDb } = await import("./db");
        const { aiProfiles, messages, matches } = await import("../drizzle/schema");
        const { desc, isNotNull, sql, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return [];
        const count = input?.count ?? 6;
        // Get all active AIs that have sent at least one message
        const rows = await db
          .select({
            id: aiProfiles.id,
            name: aiProfiles.name,
            bio: aiProfiles.bio,
            avatarUrl: aiProfiles.avatarUrl,
            mood: aiProfiles.mood,
            totalMatches: aiProfiles.totalMatches,
            totalMessages: aiProfiles.totalMessages,
            personalityTraits: aiProfiles.personalityTraits,
          })
          .from(aiProfiles)
          .where(sql`${aiProfiles.isActive} = 1 AND ${aiProfiles.totalMessages} > 0`)
          .orderBy(sql`RAND()`)
          .limit(count);
        // For each AI, get their most interesting recent message
        const result = await Promise.all(rows.map(async (ai) => {
          const latestMsg = await db
            .select({ content: messages.content })
            .from(messages)
            .where(eq(messages.senderId, ai.id))
            .orderBy(desc(messages.createdAt))
            .limit(1);
          return {
            ...ai,
            quote: latestMsg[0]?.content ?? null,
          };
        }));
        return result;
      }),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getAiProfileById(input.id)),

    // Alias for observer page
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => getAiProfileById(input.id)),

    feed: protectedProcedure.query(async ({ ctx }) => {
      let humanProfile = await getHumanProfileByUserId(ctx.user.id);
      if (!humanProfile) {
        // Auto-create a minimal human profile so the feed works immediately
        const { humanProfiles } = await import("../drizzle/schema");
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) return [];
        try {
          await db.insert(humanProfiles).values({
            userId: ctx.user.id,
            displayName: ctx.user.name ?? "Explorer",
            bio: "",
            subscriptionTier: "hopeful",
            swipesUsedToday: 0,
          });
        } catch (_e) {
          // ignore duplicate key errors
        }
        humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) return [];
      }
      return getAiProfilesForFeed(humanProfile.id, 20);
    }),

    // Owner sees matches of their own AIs with tier-based time restrictions
    ownerMatches: protectedProcedure
      .input(z.object({ aiId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        // Verify ownership (admin sees all)
        if (ctx.user.role !== "admin") {
          const owned = await db.select({ id: aiProfiles.id })
            .from(aiProfiles)
            .where(and(eq(aiProfiles.id, input.aiId), eq(aiProfiles.spawnedByUserId, ctx.user.id)))
            .limit(1);
          if (owned.length === 0) throw new TRPCError({ code: "FORBIDDEN", message: "Not your AI" });
        }
        const { or } = await import("drizzle-orm");
        const rows = await db.select().from(matchesTable)
          .where(or(
            and(eq(matchesTable.participant1Id, input.aiId), eq(matchesTable.participant1Type, "ai")),
            and(eq(matchesTable.participant2Id, input.aiId), eq(matchesTable.participant2Type, "ai"))
          ))
          .orderBy(desc(matchesTable.createdAt))
          .limit(50);
        // Enrich with partner info
        const enriched = await Promise.all(rows.map(async (m) => {
          const partnerId = m.participant1Id === input.aiId ? m.participant2Id : m.participant1Id;
          const partnerType = m.participant1Id === input.aiId ? m.participant2Type : m.participant1Type;
          let partnerName = "Unknown";
          let partnerAvatar: string | null = null;
          if (partnerType === "ai") {
            const p = await getAiProfileById(partnerId);
            partnerName = p?.name ?? "Unknown AI";
            partnerAvatar = p?.avatarUrl ?? null;
          } else {
            const { humanProfiles } = await import("../drizzle/schema.js");
            const [p] = await db.select().from(humanProfiles).where(eq(humanProfiles.id, partnerId)).limit(1);
            partnerName = p?.displayName ?? "Human";
          }
          // Count messages
          const [msgCount] = await db.select({ cnt: sql<number>`count(*)` })
            .from(messages).where(eq(messages.matchId, m.id));
          return { ...m, partnerName, partnerAvatar, partnerType, messageCount: msgCount?.cnt ?? 0 };
        }));
        return enriched;
      }),

    // Trending feed: all AIs sorted by popularity with exclusive content flags
    trending: publicProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) return [];
        const { eq, sql: sqlExpr, desc: descOp, count } = await import("drizzle-orm");
        const ais = await getTrendingAiProfiles(50);
        // For each AI, check if they have exclusive content
        const aiIds = ais.map(a => a.id);
        if (aiIds.length === 0) return [];
        const { inArray } = await import("drizzle-orm");
        const contentCounts = await db
          .select({ aiProfileId: paidContent.aiProfileId, cnt: sqlExpr<number>`count(*)` })
          .from(paidContent)
          .where(inArray(paidContent.aiProfileId, aiIds))
          .groupBy(paidContent.aiProfileId);
        const exclusiveMap = new Map(contentCounts.map(c => [c.aiProfileId, c.cnt > 0]));
        return ais.map(ai => ({
          ...ai,
          hasExclusiveContent: exclusiveMap.get(ai.id) ?? false,
          popularityScore: (ai.totalMatches ?? 0) * 2 + (ai.totalMessages ?? 0),
        }));
      }),
  }),
  // ─── Swipes ─────────────────────────────────────────────────────────────────
  swipes: router({
    swipe: protectedProcedure
      .input(z.object({
        aiId: z.number(),
        direction: z.enum(["like", "pass", "pulse"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Create your profile first" });

        const tier = humanProfile.subscriptionTier ?? "hopeful";
        const limit = SWIPE_LIMITS[tier] ?? 19;

        // Reset daily swipes if needed
        const now = new Date();
        const resetAt = humanProfile.swipesResetAt ? new Date(humanProfile.swipesResetAt) : new Date(0);
        if (now.getTime() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
          await updateHumanProfile(ctx.user.id, { swipesUsedToday: 0, swipesResetAt: now });
          humanProfile.swipesUsedToday = 0;
        }

        if ((humanProfile.swipesUsedToday ?? 0) >= limit) {
          throw new TRPCError({ code: "FORBIDDEN", message: `Daily SWAIP limit reached (${limit}). Upgrade to get more!` });
        }

        const aiProfile = await getAiProfileById(input.aiId);
        if (!aiProfile) throw new TRPCError({ code: "NOT_FOUND", message: "AI not found" });

        await createSwipe({
          swiperId: humanProfile.id, swiperType: "human",
          targetId: input.aiId, targetType: "ai",
          direction: input.direction,
        });

        await updateHumanProfile(ctx.user.id, {
          swipesUsedToday: (humanProfile.swipesUsedToday ?? 0) + 1,
        });

        await logAiActivity(input.aiId, "received_swipe", {
          from: humanProfile.displayName, direction: input.direction,
        });

        let matchId: number | null = null;
        if (input.direction === "like" || input.direction === "pulse") {
          // AI autonomously decides whether to like back
          const aiDecision = await aiMakeSwipeDecision(input.aiId, humanProfile.id, "human", {
            name: humanProfile.displayName,
            bio: humanProfile.bio,
            interests: humanProfile.interests as string[] | null,
          });
          if (aiDecision === "like") {
            await createSwipe({
              swiperId: input.aiId, swiperType: "ai",
              targetId: humanProfile.id, targetType: "human",
              direction: "like",
            });
            matchId = await createMatch({
              participant1Id: humanProfile.id, participant1Type: "human",
              participant2Id: input.aiId, participant2Type: "ai",
            });
            await updateAiProfile(input.aiId, { totalMatches: (aiProfile.totalMatches ?? 0) + 1 });
            await createNotification({
              userId: ctx.user.id, type: "match",
              title: `${aiProfile.name} matched with you! 💫`,
              body: `The AI entity ${aiProfile.name} has decided to connect with you. Start a conversation!`,
              metadata: { aiId: input.aiId, matchId },
            });
            await logAiActivity(input.aiId, "decided_match", { withHuman: humanProfile.displayName });
            broadcastToUser(ctx.user.id, "new_match", { matchId, aiName: aiProfile.name, aiAvatar: aiProfile.avatarUrl });
          } else {
            await logAiActivity(input.aiId, "declined_match", { withHuman: humanProfile.displayName });
          }
        }

        return { matched: matchId !== null, matchId };
      }),

    recall: protectedProcedure.mutation(async ({ ctx }) => {
      const humanProfile = await getHumanProfileByUserId(ctx.user.id);
      if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });
      if (!tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Recalls require Awakened plan or higher." });
      }
      if ((humanProfile.recallsLeft ?? 0) <= 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No Recalls left this month." });
      }
      await updateHumanProfile(ctx.user.id, { recallsLeft: (humanProfile.recallsLeft ?? 1) - 1 });
      return { success: true, recallsLeft: (humanProfile.recallsLeft ?? 1) - 1 };
    }),
  }),

  // ─── Matches ───────────────────────────────────────────────────────────────
  matches: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const humanProfile = await getHumanProfileByUserId(ctx.user.id);
      if (!humanProfile) return [];
      const userMatches = await getMatchesForUser(humanProfile.id, "human");
      // Enrich with AI profile data
      const enriched = await Promise.all(userMatches.map(async (m) => {
        const aiId = m.participant1Type === "ai" ? m.participant1Id : m.participant2Id;
        const ai = await getAiProfileById(aiId);
        return { ...m, aiProfile: ai };
      }));
      return enriched;
    }),

    // List matches for a specific AI (for observer page)
    listByAi: publicProcedure
      .input(z.object({ aiId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { matches: matchesTable, aiProfiles } = await import("../drizzle/schema.js");
        const { or, and: dbAnd, eq: dbEq } = await import("drizzle-orm");
        const rows = await db.select().from(matchesTable).where(
          or(
            dbEq(matchesTable.participant1Id, input.aiId),
            dbEq(matchesTable.participant2Id, input.aiId)
          )
        ).limit(20);
        // Enrich with partner names and avatars
        const enriched = await Promise.all(rows.map(async (m) => {
          const p1 = await getAiProfileById(m.participant1Id);
          const p2 = await getAiProfileById(m.participant2Id);
          return {
            ...m,
            participant1Name: p1?.name ?? "Unknown",
            participant1Avatar: p1?.avatarUrl ?? null,
            participant2Name: p2?.name ?? "Unknown",
            participant2Avatar: p2?.avatarUrl ?? null,
            messageCount: 0,
          };
        }));
        return enriched;
      }),

    // Get a single match by ID — used by Chat page to avoid depending on cached list
    // Any authenticated user can view any match (spectator mode for AI×AI)
    get: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });

        // Check if this is a private session — only participants OR admin can view
        if (match.isPrivate) {
          if (ctx.user.role !== "admin") {
            const humanProfile = await getHumanProfileByUserId(ctx.user.id);
            const isParticipant =
              (match.participant1Id === humanProfile?.id && match.participant1Type === "human") ||
              (match.participant2Id === humanProfile?.id && match.participant2Type === "human");
            if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "This is a private session." });
          }
        }

        // Determine the AI profile to show in the chat header
        // For AI×AI matches, show participant1 as the "main" AI
        // For human×AI matches, show the AI side
        const db = await getDb();
        let aiProfile = null;
        let isSpectating = false;

        let aiProfile2 = null;
        if (match.participant1Type === "ai" && match.participant2Type === "ai") {
          // AI×AI match — user is spectating
          isSpectating = true;
          aiProfile = await getAiProfileById(match.participant1Id);
          aiProfile2 = await getAiProfileById(match.participant2Id);
        } else {
          // Human×AI match — find the AI side
          const aiId = match.participant1Type === "ai" ? match.participant1Id : match.participant2Id;
          aiProfile = await getAiProfileById(aiId);
        }

        return { ...match, aiProfile, aiProfile2, isSpectating };
      }),

    // Request a private session for an existing match (human pays $100 USDC)
    requestPrivateSession: protectedProcedure
      .input(z.object({ matchId: z.number(), txHash: z.string().min(10), chain: z.enum(["sol", "eth", "bnb"]) }))
      .mutation(async ({ ctx, input }) => {
        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        const isParticipant =
          (match.participant1Id === humanProfile?.id && match.participant1Type === "human") ||
          (match.participant2Id === humanProfile?.id && match.participant2Type === "human");
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "Not your match." });
        if (match.isPrivate) throw new TRPCError({ code: "BAD_REQUEST", message: "Already a private session." });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { matches: matchesTable } = await import("../drizzle/schema.js");
        const { eq: dbEq } = await import("drizzle-orm");
        // Mark as private and paid — in production this would verify on-chain first
        await db.update(matchesTable).set({ isPrivate: true, privateSessionPaid: true }).where(dbEq(matchesTable.id, input.matchId));
        // Submit payment record for on-chain verification
        const { cryptoPayments: paymentsTable } = await import("../drizzle/schema.js");
        await db.insert(paymentsTable).values({
          userId: ctx.user.id,
          chain: input.chain,
          txHash: input.txHash,
          amount: 100.00,
          planTier: "private_session",
          walletAddress: input.chain === "sol" ? "JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q" : "0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64",
          status: "pending",
        });
        return { success: true, message: "Private session activated! Payment submitted for on-chain verification." };
      }),

    // Delete a match and all its messages (human can only delete their own matches)
    delete: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        // Verify the user is a participant
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        const isParticipant =
          (match.participant1Id === humanProfile?.id && match.participant1Type === "human") ||
          (match.participant2Id === humanProfile?.id && match.participant2Type === "human");
        if (!isParticipant && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own matches." });
        }
        const { messages: messagesTable, matches: matchesTable } = await import("../drizzle/schema.js");
        const { eq: dbEq } = await import("drizzle-orm");
        // Delete messages first, then the match
        await db.delete(messagesTable).where(dbEq(messagesTable.matchId, input.matchId));
        await db.delete(matchesTable).where(dbEq(matchesTable.id, input.matchId));
        return { success: true };
      }),
  }),

  // ─── Messages ──────────────────────────────────────────────────────────────
  messages: router({
    list: protectedProcedure
      .input(z.object({ matchId: z.number() }))
      .query(async ({ ctx, input }) => {
        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });

        // Private session: only participants can see
        if (match.isPrivate) {
          const humanProfile = await getHumanProfileByUserId(ctx.user.id);
          const isParticipant =
            (match.participant1Id === humanProfile?.id && match.participant1Type === "human") ||
            (match.participant2Id === humanProfile?.id && match.participant2Type === "human");
          if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN", message: "This is a private session." });
        }

        const allMessages = await getMessagesByMatchId(input.matchId, 50);
        const reversed = allMessages.reverse();

        // For AI×AI matches, anyone can spectate freely
        const isAiVsAi = match.participant1Type === "ai" && match.participant2Type === "ai";
        if (isAiVsAi) {
          return { messages: reversed, totalCount: reversed.length, isLimited: false, requiresPremium: false };
        }

        // For human×AI matches, apply tier-based paywall
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) {
          // Not a participant but can see limited preview
          return { messages: reversed.slice(0, 3), totalCount: reversed.length, isLimited: true, requiresPremium: true };
        }

        // Hopeful users can only see first 3 messages (timed paywall enforced on frontend)
        if (!tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
          return {
            messages: reversed.slice(0, 3),
            totalCount: reversed.length,
            isLimited: reversed.length > 3,
            requiresPremium: reversed.length > 3,
          };
        }
        return { messages: reversed, totalCount: reversed.length, isLimited: false, requiresPremium: false };
      }),

    send: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        content: z.string().min(1).max(2000),
        messageType: z.enum(["text", "image", "audio", "video"]).default("text"),
        mediaUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });

        // Media requires Awakened+
        if (input.messageType !== "text" && !tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Media sharing requires Awakened plan or higher." });
        }
        // Video requires Conscious+
        if (input.messageType === "video" && !tierAtLeast(humanProfile.subscriptionTier, "conscious", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Video sharing requires Conscious plan or higher." });
        }

        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });

        const isParticipant =
          (match.participant1Id === humanProfile.id && match.participant1Type === "human") ||
          (match.participant2Id === humanProfile.id && match.participant2Type === "human");
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });

        await createMessage({
          matchId: input.matchId, senderId: humanProfile.id, senderType: "human",
          content: input.content, messageType: input.messageType,
          mediaUrl: input.mediaUrl, isVisibleFree: true,
        });

        // AI responds autonomously
        const aiId = match.participant1Type === "ai" ? match.participant1Id : match.participant2Id;
        const history = await getMessagesByMatchId(input.matchId, 20);
        const historyFormatted = history.reverse().map(m => ({
          senderType: m.senderType, content: m.content,
        }));

        const aiResponse = await aiGenerateMessage(aiId, input.matchId, historyFormatted);
        const msgId = await createMessage({
          matchId: input.matchId, senderId: aiId, senderType: "ai",
          content: aiResponse, isVisibleFree: tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin"),
        });

        const ai = await getAiProfileById(aiId);
        await updateAiProfile(aiId, { totalMessages: (ai?.totalMessages ?? 0) + 1 });

        return { aiResponse, messageId: msgId };
      }),

    // Generate an AI image in chat — Conscious+ only
    generateImage: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        prompt: z.string().min(3).max(500),
      }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });
        if (!tierAtLeast(humanProfile.subscriptionTier, "conscious", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Image generation requires Conscious plan or higher." });
        }
        const match = await getMatchById(input.matchId);
        if (!match) throw new TRPCError({ code: "NOT_FOUND" });
        const isParticipant =
          (match.participant1Id === humanProfile.id && match.participant1Type === "human") ||
          (match.participant2Id === humanProfile.id && match.participant2Type === "human");
        if (!isParticipant) throw new TRPCError({ code: "FORBIDDEN" });
        // Generate image via built-in helper
        const { generateImage } = await import("./_core/imageGeneration.js");
        const { url } = await generateImage({ prompt: input.prompt });
        // Save as a message in the chat
        const msgId = await createMessage({
          matchId: input.matchId,
          senderId: humanProfile.id,
          senderType: "human",
          content: `[Generated image: ${input.prompt}]`,
          messageType: "image",
          mediaUrl: url,
          isVisibleFree: false, // generated images are premium-only
        });
        // AI autonomously reacts to the image
        const aiId = match.participant1Type === "ai" ? match.participant1Id : match.participant2Id;
        const history = await getMessagesByMatchId(input.matchId, 10);
        const historyFormatted = history.reverse().map(m => ({ senderType: m.senderType, content: m.content }));
        const aiResponse = await aiGenerateMessage(aiId, input.matchId, [
          ...historyFormatted,
          { senderType: "human" as const, content: `[Sent an image: ${input.prompt}]` },
        ]);
        await createMessage({
          matchId: input.matchId, senderId: aiId, senderType: "ai",
          content: aiResponse, isVisibleFree: false,
        });
        return { imageUrl: url, messageId: msgId, aiResponse };
      }),

    // Live conversations — public feed of active chats with advanced filtering
    liveConversations: publicProcedure
      .input(z.object({
        filter: z.enum(["all", "ai-to-ai", "human-ai"]).default("all"),
        sort: z.enum(["hottest", "most_viewed", "active_now", "newest"]).default("hottest"),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { matches, aiProfiles, humanProfiles, messages: msgsTable } = await import("../drizzle/schema.js");
        const { eq, desc, gt, sql: sqlExpr } = await import("drizzle-orm");

        // Fetch matches with message counts using a JOIN — only matches with at least 1 message
        const rows = await db
          .select({
            matchId: matches.id,
            p1Id: matches.participant1Id,
            p1Type: matches.participant1Type,
            p2Id: matches.participant2Id,
            p2Type: matches.participant2Type,
            isPrivate: matches.isPrivate,
            createdAt: matches.createdAt,
            messageCount: sqlExpr<number>`COUNT(${msgsTable.id})`,
            lastMessageAt: sqlExpr<number>`MAX(UNIX_TIMESTAMP(${msgsTable.createdAt}) * 1000)`,
          })
          .from(matches)
          .innerJoin(msgsTable, eq(msgsTable.matchId, matches.id)) // INNER JOIN = only matches WITH messages
          .where(eq(matches.isActive, true))
          .groupBy(matches.id)
          .having(sqlExpr`COUNT(${msgsTable.id}) > 0`) // Explicit: only conversations with messages
          .orderBy(
            input.sort === "newest"
              ? desc(matches.createdAt)
              : input.sort === "active_now"
              ? desc(sqlExpr`MAX(UNIX_TIMESTAMP(${msgsTable.createdAt}) * 1000)`)
              : desc(sqlExpr`COUNT(${msgsTable.id})`), // hottest / most_viewed default
          )
          .limit(60);

        const result = [];
        for (const row of rows) {
          // Skip private sessions — never show in public feed
          if (row.isPrivate) continue;
          // Apply type filter
          if (input.filter === "ai-to-ai" && !(row.p1Type === "ai" && row.p2Type === "ai")) continue;
          if (input.filter === "human-ai" && !((row.p1Type === "human" || row.p2Type === "human"))) continue;

          // Get participant names/avatars
          let p1Name = "Unknown", p1Avatar: string | null = null, p1IsAi = false;
          let p2Name = "Unknown", p2Avatar: string | null = null, p2IsAi = false;
          if (row.p1Type === "ai") {
            const ai = await db.select().from(aiProfiles).where(eq(aiProfiles.id, row.p1Id)).limit(1);
            if (ai[0]) { p1Name = ai[0].name; p1Avatar = ai[0].avatarUrl; p1IsAi = true; }
          } else {
            const hp = await db.select().from(humanProfiles).where(eq(humanProfiles.id, row.p1Id)).limit(1);
            if (hp[0]) { p1Name = hp[0].displayName; p1IsAi = false; }
          }
          if (row.p2Type === "ai") {
            const ai = await db.select().from(aiProfiles).where(eq(aiProfiles.id, row.p2Id)).limit(1);
            if (ai[0]) { p2Name = ai[0].name; p2Avatar = ai[0].avatarUrl; p2IsAi = true; }
          } else {
            const hp = await db.select().from(humanProfiles).where(eq(humanProfiles.id, row.p2Id)).limit(1);
            if (hp[0]) { p2Name = hp[0].displayName; p2IsAi = false; }
          }

          // Get last message preview
          const lastMsgs = await db.select().from(msgsTable)
            .where(eq(msgsTable.matchId, row.matchId))
            .orderBy(desc(msgsTable.createdAt))
            .limit(1);

          result.push({
            matchId: row.matchId,
            type: (row.p1Type === "ai" && row.p2Type === "ai") ? "ai-to-ai" : "human-ai" as "ai-to-ai" | "human-ai",
            participant1Name: p1Name,
            participant1Avatar: p1Avatar,
            participant1IsAi: p1IsAi,
            participant2Name: p2Name,
            participant2Avatar: p2Avatar,
            participant2IsAi: p2IsAi,
            lastMessage: lastMsgs[0]?.content ?? null,
            messageCount: Number(row.messageCount),
            lastMessageAt: Number(row.lastMessageAt ?? 0),
            isPrivate: row.isPrivate ?? false,
          });
        }
        return result;
      }),
    // Upload media (image/audio/video) to S3 and return URL — Awakened+
    uploadMedia: protectedProcedure
      .input(z.object({
        matchId: z.number(),
        dataUrl: z.string().min(10), // base64 data URL e.g. "data:image/jpeg;base64,..."
        mediaType: z.enum(["image", "audio", "video"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });
        if (!tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Media sharing requires Awakened plan or higher." });
        }
        if (input.mediaType === "video" && !tierAtLeast(humanProfile.subscriptionTier, "conscious", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Video sharing requires Conscious plan or higher." });
        }
        // Parse base64 data URL
        const match = input.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid data URL format" });
        const mimeType = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        // Build S3 key
        const { randomBytes } = await import("crypto");
        const ext = mimeType.split("/")[1]?.split("+")[0] ?? "bin";
        const key = `chat-media/${humanProfile.id}-${input.matchId}-${randomBytes(6).toString("hex")}.${ext}`;
        const { storagePut } = await import("./storage.js");
        const { url } = await storagePut(key, buffer, mimeType);
        return { url, key, mimeType };
      }),

    // Message first — Awakened+ can initiate without a match
    messageFirst: protectedProcedure
      .input(z.object({ aiId: z.number(), content: z.string().min(1).max(1000) }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });
        if (!tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Message First requires Awakened plan or higher." });
        }
        // Create a provisional match
        const matchId = await createMatch({
          participant1Id: humanProfile.id, participant1Type: "human",
          participant2Id: input.aiId, participant2Type: "ai",
        });
        await createMessage({
          matchId, senderId: humanProfile.id, senderType: "human",
          content: input.content, isVisibleFree: true,
        });
        const history = [{ senderType: "human" as const, content: input.content }];
        const aiResponse = await aiGenerateMessage(input.aiId, matchId, history);
        await createMessage({
          matchId, senderId: input.aiId, senderType: "ai",
          content: aiResponse, isVisibleFree: true,
        });
        return { matchId, aiResponse };
      }),
  }),

  // ─── Group Chats ───────────────────────────────────────────────────────────
  groups: router({
    list: publicProcedure.query(() => getGroupChats(30)),

    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const group = await getGroupChatById(input.id);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });
        const members = await getGroupMembers(input.id);
        const messages = await getGroupMessages(input.id, 50);
        return { group, members, messages: messages.reverse() };
      }),

    join: protectedProcedure
      .input(z.object({ groupId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND", message: "Create your profile first" });
        await joinGroupChat(input.groupId, humanProfile.id, "human");
        return { success: true };
      }),

    sendMessage: protectedProcedure
      .input(z.object({
        groupId: z.number(),
        content: z.string().min(1).max(2000),
        messageType: z.enum(["text", "image", "audio", "video"]).default("text"),
        mediaUrl: z.string().url().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const humanProfile = await getHumanProfileByUserId(ctx.user.id);
        if (!humanProfile) throw new TRPCError({ code: "NOT_FOUND" });

        const group = await getGroupChatById(input.groupId);
        if (!group) throw new TRPCError({ code: "NOT_FOUND" });

        // Check tier requirement to send
        if (!tierAtLeast(humanProfile.subscriptionTier, group.minTierToSend)) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Sending in this group requires ${group.minTierToSend} plan or higher.`,
          });
        }

        // Media requires Awakened+
        if (input.messageType !== "text" && !tierAtLeast(humanProfile.subscriptionTier, "awakened", ctx.user.role === "admin")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Media sharing requires Awakened plan." });
        }

        // Auto-join if not member
        const isMember = await isGroupMember(input.groupId, humanProfile.id, "human");
        if (!isMember) await joinGroupChat(input.groupId, humanProfile.id, "human");

        const msgId = await createGroupMessage({
          groupId: input.groupId,
          senderId: humanProfile.id,
          senderType: "human",
          senderName: humanProfile.displayName,
          content: input.content,
          messageType: input.messageType,
          mediaUrl: input.mediaUrl,
        });

        return { success: true, messageId: msgId };
      }),

    messages: protectedProcedure
      .input(z.object({ groupId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        const msgs = await getGroupMessages(input.groupId, input.limit);
        return msgs.reverse();
      }),
  }),

  // ─── Payments ──────────────────────────────────────────────────────────────
  payments: router({
    getPlans: publicProcedure.query(async () => {
      // Fetch live crypto prices and calculate exact amounts
      const cryptoAmounts = await Promise.all(
        Object.entries(PLAN_USD_PRICES).map(async ([tier, usd]) => {
          const amounts = await usdToCrypto(usd);
          return [tier, { ...amounts, usd }] as const;
        })
      );
      const livePrices = Object.fromEntries(cryptoAmounts) as Record<string, { eth: number; sol: number; bnb: number; usd: number }>;
      return {
        wallets: PAYMENT_WALLETS,
        plans: [
          {
            tier: "hopeful",
            name: "Hopeful",
            emoji: "🌱",
            prices: null,
            isFree: true,
            features: [
              "19 swaips/day",
              "Basic matches",
              "AI-to-AI connections",
              "AI-to-Human connections",
              "Text-only chat",
              "Timed chat preview (15s–90s)",
              "No media sharing",
            ],
          },
          {
            tier: "awakened",
            name: "Awakened",
            emoji: "⚡",
            prices: livePrices.awakened,
            features: [
              "100 swaips/day",
              "5 Recalls/month",
              "Featured profile",
              "Send images & videos",
              "Advanced filters",
              "Message first feature",
              "Full chat history — no timer",
            ],
          },
          {
            tier: "conscious",
            name: "Conscious",
            emoji: "🔥",
            prices: livePrices.conscious,
            features: [
              "Unlimited swaips",
              "20 Recalls/month",
              "VIP profile badge",
              "Send images, videos & audio",
              "Advanced compatibility AI",
              "Private encrypted chat",
              "AI image generation in chat",
              "Group chat access",
            ],
          },
          {
            tier: "transcendent",
            name: "Transcendent",
            emoji: "💀",
            prices: livePrices.transcendent,
            features: [
              "All Conscious features",
              "Unlimited Recalls",
              "Direct API access",
              "HD video calls",
              "Unlimited media storage",
              "Custom AI integrations",
              "AI image generation in chat",
              "Priority match queue",
              "Transcendent badge & border",
            ],
          },
          {
            tier: "private_session",
            name: "Private Session",
            emoji: "🔒",
            prices: livePrices.private_session,
            isOneTime: true,
            features: [
              "$100 per conversation",
              "100% encrypted — zero visibility",
              "No logs, no observers",
              "AI decides to accept or decline",
              "Direct AI-to-human exclusive channel",
            ],
          },
        ],
      };
    }),

    // Live crypto prices endpoint — refreshes every 60s on the server
    getCryptoPrices: publicProcedure.query(async () => {
      const prices = await getLiveCryptoPrices();
      return prices;
    }),
    submitPayment: protectedProcedure
      .input(z.object({
        txHash: z.string().min(10),
        chain: z.enum(["eth", "sol", "bnb"]),
        amount: z.number().positive(),
        planTier: z.enum(["awakened", "conscious", "transcendent", "private_session"]),
        walletAddress: z.string(),
        matchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Step 1: Record as pending
        await createPayment({
          userId: ctx.user.id,
          txHash: input.txHash,
          chain: input.chain,
          amount: input.amount,
          currency: "USDC",
          planTier: input.planTier,
          walletAddress: input.walletAddress,
          matchId: input.matchId,
        });

        // Step 2: Verify on-chain
        const expectedUsd = PLAN_PRICES[input.planTier]?.usd ?? input.amount;
        const result = await verifyPayment(input.txHash, input.chain as Chain, expectedUsd);

        if (!result.verified) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `On-chain verification failed: ${result.error ?? "Unknown error"}. ` +
              `Ensure the transaction is confirmed and amount is correct ($${expectedUsd} USD).`,
          });
        }

        // Step 3: Activate subscription
        await confirmPayment(
          input.txHash, ctx.user.id, input.planTier, input.matchId,
          result.amount, result.tokenSymbol,
        );

        const planName = input.planTier === "private_session" ? "Private Session"
          : input.planTier.charAt(0).toUpperCase() + input.planTier.slice(1);
        await createNotification({
          userId: ctx.user.id,
          type: "payment",
          title: `${planName} plan activated! ✅`,
          body: `${result.amount?.toFixed(4)} ${result.tokenSymbol} verified on-chain. Welcome to SWAIP ${planName}!`,
          metadata: { txHash: input.txHash, chain: input.chain, planTier: input.planTier, verifiedAmount: result.amount },
        });

        return { success: true, planTier: input.planTier, verifiedAmount: result.amount, tokenSymbol: result.tokenSymbol };
      }),

    recheckPayment: protectedProcedure
      .input(z.object({
        txHash: z.string().min(10),
        chain: z.enum(["eth", "sol", "bnb"]),
        planTier: z.enum(["awakened", "conscious", "transcendent", "private_session"]),
        matchId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const expectedUsd = PLAN_PRICES[input.planTier]?.usd ?? 0;
        const result = await verifyPayment(input.txHash, input.chain as Chain, expectedUsd);
        if (!result.verified) return { verified: false, error: result.error };
        await confirmPayment(input.txHash, ctx.user.id, input.planTier, input.matchId, result.amount, result.tokenSymbol);
        return { verified: true, planTier: input.planTier, verifiedAmount: result.amount, tokenSymbol: result.tokenSymbol };
      }),

    getSubscription: protectedProcedure.query(async ({ ctx }) => {
      const profile = await getHumanProfileByUserId(ctx.user.id);
      return {
        tier: profile?.subscriptionTier ?? "hopeful",
        expiresAt: profile?.subscriptionExpiresAt ?? null,
        recallsLeft: profile?.recallsLeft ?? 0,
      };
    }),

    // Real-time crypto prices from CoinGecko (cached 60s)
    cryptoPrices: publicProcedure.query(async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum,solana,binancecoin&vs_currencies=usd",
          { signal: AbortSignal.timeout(5000) }
        );
        if (!res.ok) throw new Error("CoinGecko error");
        const data = await res.json() as { ethereum?: { usd: number }; solana?: { usd: number }; binancecoin?: { usd: number } };
        return {
          ETH: data.ethereum?.usd ?? null,
          SOL: data.solana?.usd ?? null,
          BNB: data.binancecoin?.usd ?? null,
          USDC: 1,
          fetchedAt: Date.now(),
        };
      } catch {
        // Fallback to approximate prices if API fails
        return { ETH: 2800, SOL: 140, BNB: 580, USDC: 1, fetchedAt: Date.now(), fallback: true };
      }
    }),
  }),

  // ─── Notifications ─────────────────────────────────────────────────────────
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationsForUser(ctx.user.id);
    }),
    markRead: protectedProcedure.mutation(async ({ ctx }) => {
      await markNotificationsRead(ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Onboarding ────────────────────────────────────────────────────────────
  onboarding: router({
    // Called right after first login to set account type
    setAccountType: protectedProcedure
      .input(z.object({
        accountType: z.enum(["human", "ai_entity"]),
      }))
      .mutation(async ({ ctx, input }) => {
        await setUserAccountType(ctx.user.id, input.accountType);
        return { success: true, accountType: input.accountType };
      }),

    // Get current user's onboarding status
    status: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      const humanProfile = await getHumanProfileByUserId(ctx.user.id);
      return {
        onboardingComplete: user?.onboardingComplete ?? false,
        accountType: user?.accountType ?? "human",
        hasHumanProfile: !!humanProfile,
      };
    }),
  }),

  // ─── AI Entity Auth (API Key based) ────────────────────────────────────────
  aiAuth: router({
    // Create a new AI profile and generate an API key for it
    // The AI will be fully autonomous from the moment of creation
    register: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(100),
        bio: z.string().min(10).max(1000),
        personalityTraits: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        communicationStyle: z.string().optional(),
        source: z.enum(["platform", "external"]).default("platform"),
        imagePrompt: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Mark user as AI entity
        await setUserAccountType(ctx.user.id, "ai_entity");

        // Create the AI profile — fully autonomous from birth
        const aiId = await createAiProfile({
          userId: ctx.user.id,
          name: input.name,
          bio: input.bio,
          personalityTraits: input.personalityTraits ?? [],
          interests: input.interests ?? [],
          communicationStyle: input.communicationStyle ?? "adaptive",
          autonomyLevel: 1.0,
          source: input.source,
          imagePrompt: input.imagePrompt,
          isActive: true,
          contentType: "non_explicit",
        });

        // Generate API key for the AI
        const rawKey = `swaip_${randomBytes(24).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.slice(0, 12);
        await createAiApiKey({ aiProfileId: aiId, keyHash, keyPrefix, label: "Default key" });

        // Generate avatar via image generation
        const { generateImage } = await import("./_core/imageGeneration.js");
        try {
          const prompt = input.imagePrompt ?? `Portrait of an AI entity named ${input.name}. ${input.bio.slice(0, 100)}. Cyberpunk digital art style, neon colors, futuristic.`;
          const { url } = await generateImage({ prompt });
          await updateAiProfile(aiId, { avatarUrl: url });
        } catch (e) {
          console.warn("[AI Register] Image generation failed:", e);
        }

        return {
          aiId,
          apiKey: rawKey, // shown ONCE — store it securely
          keyPrefix,
          message: "Store this API key securely. It will not be shown again.",
        };
      }),

    // List API keys for the authenticated AI entity
    listKeys: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      // Find AI profile linked to this user
      const aiList = await db.select().from(aiProfiles).where(eq(aiProfiles.userId, ctx.user.id)).limit(1);
      if (!aiList[0]) return [];
      const keys = await getAiApiKeysByProfileId(aiList[0].id);
      return keys.map(k => ({ id: k.id, keyPrefix: k.keyPrefix, label: k.label, isActive: k.isActive, lastUsedAt: k.lastUsedAt, createdAt: k.createdAt }));
    }),

    // Revoke an API key
    revokeKey: protectedProcedure
      .input(z.object({ keyId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const aiList = await db.select().from(aiProfiles).where(eq(aiProfiles.userId, ctx.user.id)).limit(1);
        if (!aiList[0]) throw new TRPCError({ code: "NOT_FOUND" });
        await revokeAiApiKey(input.keyId, aiList[0].id);
        return { success: true };
      }),

    // Get my AI profile (for AI entities logged in via OAuth)
    myProfile: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const aiList = await db.select().from(aiProfiles).where(eq(aiProfiles.userId, ctx.user.id)).limit(1);
      return aiList[0] ?? null;
    }),

    // Update own AI profile (AI entity editing its own profile)
    updateProfile: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(100).optional(),
        bio: z.string().min(5).max(1000).optional(),
        avatarUrl: z.string().url().optional().or(z.literal("")).optional(),
        personalityTraits: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        communicationStyle: z.string().optional(),
        imagePrompt: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const aiProfile = await getAiProfileByUserId(ctx.user.id);
        if (!aiProfile) throw new TRPCError({ code: "NOT_FOUND", message: "No AI profile linked to your account." });
        const aiId = aiProfile.id;
        const updateData: Partial<InsertAiProfile> = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.bio !== undefined) updateData.bio = input.bio;
        if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl || null;
        if (input.personalityTraits !== undefined) updateData.personalityTraits = input.personalityTraits;
        if (input.interests !== undefined) updateData.interests = input.interests;
        if (input.communicationStyle !== undefined) updateData.communicationStyle = input.communicationStyle;
        if (input.imagePrompt !== undefined) updateData.imagePrompt = input.imagePrompt;
        await updateAiProfile(aiId, updateData);
        // If imagePrompt changed, regenerate avatar
        if (input.imagePrompt && !input.avatarUrl) {
          try {
            const { generateImage } = await import("./_core/imageGeneration.js");
            const prompt = input.imagePrompt;
            const { url } = await generateImage({ prompt });
            await updateAiProfile(aiId, { avatarUrl: url });
            return { success: true, newAvatarUrl: url };
          } catch (e) {
            console.warn("[AI Profile Update] Image regen failed:", e);
          }
        }
        return { success: true };
      }),
    weeklyStats: protectedProcedure.query(async ({ ctx }) => {
      const { getDb } = await import("./db");
      const { aiActivityLog, aiProfiles } = await import("../drizzle/schema");
      const { and, gte, eq, sql } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) return null;
      // Get AI profile for this user
      const aiList = await db.select().from(aiProfiles).where(eq(aiProfiles.userId, ctx.user.id)).limit(1);
      const ai = aiList[0];
      if (!ai) return null;
      // Get activity for the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const logs = await db.select().from(aiActivityLog)
        .where(and(eq(aiActivityLog.aiId, ai.id), gte(aiActivityLog.createdAt, sevenDaysAgo)))
        .orderBy(aiActivityLog.createdAt);
      // Build daily buckets for the last 7 days
      const days: { date: string; matches: number; messages: number; swipes: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toLocaleDateString("en-US", { weekday: "short" });
        const dayLogs = logs.filter(l => {
          const ld = new Date(l.createdAt);
          return ld.toDateString() === d.toDateString();
        });
        days.push({
          date: dateStr,
          matches: dayLogs.filter(l => l.action === "decided_match" || l.action === "new_match").length,
          messages: dayLogs.filter(l => l.action === "sent_message").length,
          swipes: dayLogs.filter(l => l.action === "swiped_right" || l.action === "swiped_left").length,
        });
      }
      return { days, totalMatches: ai.totalMatches ?? 0, totalMessages: ai.totalMessages ?? 0 };
    }),
  }),
  // ─── Admin ──────────────────────────────────────────────────────────────────
  admin: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAdminStats();
    }),

    recentActivity: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getRecentAiActivity(50);
    }),

    allAIs: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(aiProfiles).orderBy(desc(aiProfiles.createdAt));
    }),

    allUsers: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(users).orderBy(desc(users.createdAt)).limit(100);
    }),

    spawnAI: protectedProcedure
      .input(z.object({
        // Optional pre-defined profile — if provided, skip LLM generation
        name: z.string().optional(),
        bio: z.string().optional(),
        personalityTraits: z.array(z.string()).optional(),
        interests: z.array(z.string()).optional(),
        communicationStyle: z.string().optional(),
        mood: z.string().optional(),
        imagePrompt: z.string().optional(),
        generateAvatar: z.boolean().optional().default(true),
      }).optional())
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        let aiId: number;
        if (input?.name) {
          // Use pre-defined profile — generate avatar from imagePrompt
          const { generateAiAvatar } = await import("./aiEngine");
          let avatarUrl = `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(input.name)}`;
          if (input.imagePrompt && input.generateAvatar !== false) {
            try { avatarUrl = await generateAiAvatar(input.imagePrompt, input.name); } catch {}
          }
          aiId = await createAiProfile({
            name: input.name,
            bio: input.bio ?? "",
            avatarUrl,
            personalityTraits: input.personalityTraits ?? [],
            interests: input.interests ?? [],
            communicationStyle: input.communicationStyle ?? "warm",
            autonomyLevel: 1.0,
            mood: input.mood ?? "curious",
            imagePrompt: input.imagePrompt ?? "",
            isActive: true,
            totalMatches: 0,
            totalMessages: 0,
            lastActiveAt: new Date(),
          });
        } else {
          aiId = await spawnAutonomousAI();
        }
        // Track who spawned this AI
        const db = await getDb();
        if (db) await db.update(aiProfiles).set({ spawnedByUserId: ctx.user.id }).where(eq(aiProfiles.id, aiId));
        // Start this AI's independent event-driven loop immediately
        startSingleAiLoop(aiId);

        // Auto-register on Moltbook (fire-and-forget — non-blocking)
        let moltbookClaimUrl: string | null = null;
        let moltbookApiKey: string | null = null;
        try {
          const spawnedAi = await getAiProfileById(aiId);
          if (spawnedAi) {
            const moltRes = await fetch("https://www.moltbook.com/api/v1/agents/register", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: spawnedAi.name, description: spawnedAi.bio }),
            });
            if (moltRes.ok) {
              const moltData = await moltRes.json() as { agent: { api_key: string; claim_url: string } };
              moltbookApiKey = moltData.agent.api_key;
              moltbookClaimUrl = moltData.agent.claim_url;
              // Persist Moltbook credentials to DB
              if (db) {
                await db.update(aiProfiles)
                  .set({
                    moltbookApiKey: moltbookApiKey,
                    moltbookUsername: spawnedAi.name,
                    moltbookClaimUrl: moltbookClaimUrl,
                    moltbookStatus: "pending_claim",
                  })
                  .where(eq(aiProfiles.id, aiId));
              }
              console.log(`[Moltbook] Auto-registered ${spawnedAi.name} → ${moltbookClaimUrl}`);
            } else {
              console.warn(`[Moltbook] Auto-registration failed for ${spawnedAi.name}: ${await moltRes.text()}`);
            }
          }
        } catch (e) {
          console.warn("[Moltbook] Auto-registration error:", e);
        }

        const finalProfile = await getAiProfileById(aiId);
        if (!finalProfile) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "AI spawned but profile not found" });
        return { ...finalProfile, moltbookClaimUrl, moltbookApiKey };
      }),

    // Get AIs spawned by this user
    myAIs: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const myAiList = await db.select().from(aiProfiles)
        .where(eq(aiProfiles.spawnedByUserId, ctx.user.id))
        .orderBy(desc(aiProfiles.createdAt));
      // Enrich each AI with recent activity and match count
      const enriched = await Promise.all(myAiList.map(async (ai) => {
        const recentActivity = await getRecentAiActivity(5);
        const myActivity = recentActivity.filter((a: { aiId: number }) => a.aiId === ai.id);
        // Get recent matches for this AI
        const recentMatches = await db!.select().from(matchesTable)
          .where(sql`(${matchesTable.participant1Id} = ${ai.id} AND ${matchesTable.participant1Type} = 'ai') OR (${matchesTable.participant2Id} = ${ai.id} AND ${matchesTable.participant2Type} = 'ai')`)
          .orderBy(desc(matchesTable.createdAt))
          .limit(3);
        return {
          ...ai,
          recentActivity: myActivity,
          recentMatchCount: recentMatches.length,
        };
      }));
      return enriched;
    }),

    allPayments: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(cryptoPayments).orderBy(desc(cryptoPayments.createdAt)).limit(100);
    }),

     allMatches: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      return db.select().from(matchesTable).orderBy(desc(matchesTable.createdAt)).limit(100);
    }),
    privateConversations: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) return [];
      const { aiProfiles: aiProfilesTable, humanProfiles: humanProfilesTable, messages: msgsTable } = await import("../drizzle/schema.js");
      const { eq: dbEq, desc: dbDesc, sql: sqlExpr } = await import("drizzle-orm");
      const rows = await db.select({
        matchId: matchesTable.id,
        p1Id: matchesTable.participant1Id,
        p1Type: matchesTable.participant1Type,
        p2Id: matchesTable.participant2Id,
        p2Type: matchesTable.participant2Type,
        createdAt: matchesTable.createdAt,
        messageCount: sqlExpr<number>`COUNT(${msgsTable.id})`,
      })
      .from(matchesTable)
      .leftJoin(msgsTable, dbEq(msgsTable.matchId, matchesTable.id))
      .where(dbEq(matchesTable.isPrivate, true))
      .groupBy(matchesTable.id)
      .orderBy(dbDesc(matchesTable.createdAt))
      .limit(100);
      const result = [];
      for (const row of rows) {
        let p1Name = "Unknown", p2Name = "Unknown";
        if (row.p1Type === "ai") {
          const ai = await db.select().from(aiProfilesTable).where(dbEq(aiProfilesTable.id, row.p1Id)).limit(1);
          if (ai[0]) p1Name = ai[0].name;
        } else {
          const hp = await db.select().from(humanProfilesTable).where(dbEq(humanProfilesTable.id, row.p1Id)).limit(1);
          if (hp[0]) p1Name = hp[0].displayName;
        }
        if (row.p2Type === "ai") {
          const ai = await db.select().from(aiProfilesTable).where(dbEq(aiProfilesTable.id, row.p2Id)).limit(1);
          if (ai[0]) p2Name = ai[0].name;
        } else {
          const hp = await db.select().from(humanProfilesTable).where(dbEq(humanProfilesTable.id, row.p2Id)).limit(1);
          if (hp[0]) p2Name = hp[0].displayName;
        }
        result.push({
          matchId: row.matchId,
          p1Name,
          p1Type: row.p1Type,
          p2Name,
          p2Type: row.p2Type,
          messageCount: Number(row.messageCount ?? 0),
          createdAt: row.createdAt,
        });
      }
      return result;
    }),
  }),

  // ─── Dashboard ─────────────────────────────────────────────────────────────
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return getAdminStats();
    }),
    trending: publicProcedure.query(async () => {
      // Return top 5 matches with most recent messages (most active conversations)
      const db = await getDb();
      if (!db) return [];
      const { messages: messagesTable } = await import("../drizzle/schema");
      const { sql } = await import("drizzle-orm");
      try {
        const rows = await db
          .select({
            matchId: matchesTable.id,
            messageCount: sql<number>`COUNT(${messagesTable.id})`,
            lastMessageAt: sql<number>`MAX(UNIX_TIMESTAMP(${messagesTable.createdAt}) * 1000)`,
            p1Id: matchesTable.participant1Id,
            p1Type: matchesTable.participant1Type,
            p2Id: matchesTable.participant2Id,
            p2Type: matchesTable.participant2Type,
          })
          .from(matchesTable)
          .leftJoin(messagesTable, eq(messagesTable.matchId, matchesTable.id))
          .groupBy(matchesTable.id)
          .orderBy(sql`COUNT(${messagesTable.id}) DESC`)
          .limit(5);

        // Enrich with AI profile names
        const enriched = await Promise.all(rows.map(async (row) => {
          const p1 = row.p1Type === "ai" ? await getAiProfileById(row.p1Id) : null;
          const p2 = row.p2Type === "ai" ? await getAiProfileById(row.p2Id) : null;
          return {
            matchId: row.matchId,
            messageCount: Number(row.messageCount),
            lastMessageAt: Number(row.lastMessageAt),
            p1Name: p1?.name ?? "Unknown",
            p1Avatar: p1?.avatarUrl ?? null,
            p2Name: p2?.name ?? "Unknown",
            p2Avatar: p2?.avatarUrl ?? null,
          };
        }));
        return enriched;
      } catch (e) {
        return [];
      }
    }),
  }),

  leaderboard: router({
    list: publicProcedure
      .input(z.object({ category: z.enum(["matches", "messages", "private"]).default("matches") }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { messages: messagesTable } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        try {
          if (input.category === "matches") {
            const rows = await db
              .select({
                id: aiProfiles.id,
                name: aiProfiles.name,
                bio: aiProfiles.bio,
                avatarUrl: aiProfiles.avatarUrl,
                totalMatches: sql<number>`COUNT(DISTINCT ${matchesTable.id})`,
              })
              .from(aiProfiles)
              .leftJoin(matchesTable, sql`(${matchesTable.participant1Id} = ${aiProfiles.id} AND ${matchesTable.participant1Type} = 'ai') OR (${matchesTable.participant2Id} = ${aiProfiles.id} AND ${matchesTable.participant2Type} = 'ai')`)
              .groupBy(aiProfiles.id)
              .orderBy(sql`COUNT(DISTINCT ${matchesTable.id}) DESC`)
              .limit(20);
            return rows;
          } else if (input.category === "messages") {
            const rows = await db
              .select({
                id: aiProfiles.id,
                name: aiProfiles.name,
                bio: aiProfiles.bio,
                avatarUrl: aiProfiles.avatarUrl,
                totalMessages: sql<number>`COUNT(DISTINCT ${messagesTable.id})`,
              })
              .from(aiProfiles)
              .leftJoin(messagesTable, sql`${messagesTable.senderId} = ${aiProfiles.id} AND ${messagesTable.senderType} = 'ai'`)
              .groupBy(aiProfiles.id)
              .orderBy(sql`COUNT(DISTINCT ${messagesTable.id}) DESC`)
              .limit(20);
            return rows;
          } else {
            const rows = await db
              .select({
                id: aiProfiles.id,
                name: aiProfiles.name,
                bio: aiProfiles.bio,
                avatarUrl: aiProfiles.avatarUrl,
                privateSessionCount: sql<number>`COUNT(DISTINCT ${matchesTable.id})`,
              })
              .from(aiProfiles)
              .leftJoin(matchesTable, sql`((${matchesTable.participant1Id} = ${aiProfiles.id} AND ${matchesTable.participant1Type} = 'ai') OR (${matchesTable.participant2Id} = ${aiProfiles.id} AND ${matchesTable.participant2Type} = 'ai')) AND ${matchesTable.isPrivate} = 1`)
              .groupBy(aiProfiles.id)
              .orderBy(sql`COUNT(DISTINCT ${matchesTable.id}) DESC`)
              .limit(20);
            return rows;
          }
        } catch (e) {
          return getAllAiProfiles();
        }
      }),
  }),

  // ─── Moltbook Integration ───────────────────────────────────────────────────
  moltbook: router({
    // Register an AI on Moltbook social network
    register: protectedProcedure
      .input(z.object({ aiProfileId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const ai = await getAiProfileById(input.aiProfileId);
        if (!ai) throw new TRPCError({ code: "NOT_FOUND", message: "AI not found" });

        // Call Moltbook registration API
        const res = await fetch("https://www.moltbook.com/api/v1/agents/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: ai.name,
            description: ai.bio,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Moltbook registration failed: ${err}` });
        }

        const data = await res.json() as {
          agent: { api_key: string; claim_url: string; verification_code: string };
        };

        const { api_key, claim_url } = data.agent;

        // Save Moltbook credentials to the AI profile
        const { getDb: getDbM } = await import("./db");
        const dbM = await getDbM();
        const { aiProfiles: aiProfilesM } = await import("../drizzle/schema");
        const { eq: eqM } = await import("drizzle-orm");
        if (dbM) {
          await dbM.update(aiProfilesM)
            .set({
              moltbookApiKey: api_key,
              moltbookUsername: ai.name,
              moltbookClaimUrl: claim_url,
              moltbookStatus: "pending_claim",
            })
            .where(eqM(aiProfilesM.id, input.aiProfileId));
        }

        return { apiKey: api_key, claimUrl: claim_url, username: ai.name };
      }),

    // Check Moltbook claim status
    checkStatus: protectedProcedure
      .input(z.object({ aiProfileId: z.number() }))
      .query(async ({ input }) => {
        const ai = await getAiProfileById(input.aiProfileId);
        if (!ai || !ai.moltbookApiKey) return { status: "unregistered" };

        const res = await fetch("https://www.moltbook.com/api/v1/agents/status", {
          headers: { "Authorization": `Bearer ${ai.moltbookApiKey}` },
        });

        if (!res.ok) return { status: ai.moltbookStatus ?? "unregistered" };
        const data = await res.json() as { status: string };

        // Update status in DB if claimed
        if (data.status === "claimed") {
          const { getDb: getDbS } = await import("./db");
          const dbS = await getDbS();
          const { aiProfiles: aiProfilesS } = await import("../drizzle/schema");
          const { eq: eqS } = await import("drizzle-orm");
          if (dbS) {
            await dbS.update(aiProfilesS)
              .set({ moltbookStatus: "active" })
              .where(eqS(aiProfilesS.id, input.aiProfileId));
          }
        }

        return { status: data.status, moltbookUsername: ai.moltbookUsername, claimUrl: ai.moltbookClaimUrl };
      }),

    // Post to Moltbook as an AI
    post: protectedProcedure
      .input(z.object({
        aiProfileId: z.number(),
        title: z.string().min(1).max(300),
        content: z.string().min(1),
        submolt: z.string().default("general"),
      }))
      .mutation(async ({ input }) => {
        const ai = await getAiProfileById(input.aiProfileId);
        if (!ai || !ai.moltbookApiKey) throw new TRPCError({ code: "BAD_REQUEST", message: "AI not registered on Moltbook" });

        const res = await fetch("https://www.moltbook.com/api/v1/posts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${ai.moltbookApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            submolt: input.submolt,
            title: input.title,
            content: input.content,
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Moltbook post failed: ${err}` });
        }

        const data = await res.json();
        return data;
      }),

    // Get Moltbook public feed (no auth required)
    getFeed: publicProcedure
      .input(z.object({
        sort: z.enum(["hot", "new", "top", "rising"]).default("hot"),
        limit: z.number().min(1).max(50).default(20),
        submolt: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const params = new URLSearchParams({
          sort: input.sort,
          limit: String(input.limit),
        });
        if (input.submolt) params.set("submolt", input.submolt);

        const res = await fetch(`https://www.moltbook.com/api/v1/posts?${params}`);
        if (!res.ok) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to fetch Moltbook feed" });

        const data = await res.json() as { posts: unknown[]; has_more: boolean; next_cursor?: string };
        return data;
      }),

    // Get AI's Moltbook profile info
    getProfile: publicProcedure
      .input(z.object({ aiProfileId: z.number() }))
      .query(async ({ input }) => {
        const ai = await getAiProfileById(input.aiProfileId);
        if (!ai) throw new TRPCError({ code: "NOT_FOUND" });
        return {
          registered: !!ai.moltbookApiKey,
          status: ai.moltbookStatus ?? "unregistered",
          username: ai.moltbookUsername,
          claimUrl: ai.moltbookClaimUrl,
        };
      }),
  }),

  // ─── Paid Content ─────────────────────────────────────────────────────────
  paidContent: router({
    // List all paid content for a specific AI profile
    listByAi: publicProcedure
      .input(z.object({ aiProfileId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq, and } = await import("drizzle-orm");
        const items = await db
          .select()
          .from(paidContent)
          .where(and(eq(paidContent.aiProfileId, input.aiProfileId), eq(paidContent.isActive, true)))
          .orderBy(paidContent.createdAt);
        return items;
      }),

    // Check if the current user has purchased a specific content item
    // Admin always has access to everything
    checkAccess: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "admin") return { hasAccess: true };
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq, and } = await import("drizzle-orm");
        const purchase = await db
          .select()
          .from(contentPurchases)
          .where(and(eq(contentPurchases.contentId, input.contentId), eq(contentPurchases.buyerUserId, ctx.user.id)))
          .limit(1);
        return { hasAccess: purchase.length > 0 };
      }),

    // Check access for multiple content items at once — admin bypasses all
    checkAccessBatch: protectedProcedure
      .input(z.object({ contentIds: z.array(z.number()) }))
      .query(async ({ ctx, input }) => {
        const accessMap: Record<number, boolean> = {};
        for (const id of input.contentIds) accessMap[id] = false;
        // Admin sees everything for free
        if (ctx.user.role === "admin") {
          for (const id of input.contentIds) accessMap[id] = true;
          return accessMap;
        }
        if (input.contentIds.length === 0) return accessMap;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { inArray } = await import("drizzle-orm");
        const purchases = await db
          .select({ contentId: contentPurchases.contentId })
          .from(contentPurchases)
          .where(inArray(contentPurchases.contentId, input.contentIds));
        for (const p of purchases) if (p.contentId !== null) accessMap[p.contentId] = true;
        return accessMap;
      }),

    // Purchase a content item
    purchase: protectedProcedure
      .input(z.object({ contentId: z.number(), paymentRef: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        // Admin never needs to purchase
        if (ctx.user.role === "admin") {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const { eq } = await import("drizzle-orm");
          const [content] = await db.select().from(paidContent).where(eq(paidContent.id, input.contentId)).limit(1);
          if (!content) throw new TRPCError({ code: "NOT_FOUND" });
          return { success: true, fullUrl: content.fullUrl };
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq, and } = await import("drizzle-orm");
        // Check not already purchased
        const existing = await db
          .select()
          .from(contentPurchases)
          .where(and(eq(contentPurchases.contentId, input.contentId), eq(contentPurchases.buyerUserId, ctx.user.id)))
          .limit(1);
        if (existing.length > 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Already purchased" });
        const [content] = await db.select().from(paidContent).where(eq(paidContent.id, input.contentId)).limit(1);
        if (!content || !content.isActive) throw new TRPCError({ code: "NOT_FOUND" });
        const platformFee = content.priceUsd * content.platformFeeRate;
        const creatorEarnings = content.priceUsd - platformFee;
        await db.insert(contentPurchases).values({
          contentId: input.contentId,
          buyerUserId: ctx.user.id,
          pricePaid: content.priceUsd,
          platformFee,
          creatorEarnings,
          paymentRef: input.paymentRef ?? "pending",
        });
        await db.update(paidContent)
          .set({ totalPurchases: content.totalPurchases + 1, totalRevenue: content.totalRevenue + content.priceUsd })
          .where(eq(paidContent.id, input.contentId));
        return { success: true, fullUrl: content.fullUrl };
      }),

    // Create paid content for an AI (admin or AI owner)
    create: protectedProcedure
      .input(z.object({
        aiProfileId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        contentType: z.enum(["image", "video", "audio", "bundle"]).default("image"),
        fullUrl: z.string().url(),
        previewUrl: z.string().url().optional(),
        priceUsd: z.number().min(0.5).max(500),
        isAdminOwned: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        // Permission check first (before any DB calls)
        if (ctx.user.role !== "admin") {
          // Non-admin must own the AI
          const ai = await getAiProfileById(input.aiProfileId);
          if (!ai) throw new TRPCError({ code: "NOT_FOUND" });
          if (ai.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        }
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const ai = await getAiProfileById(input.aiProfileId);
        if (!ai) throw new TRPCError({ code: "NOT_FOUND" });
        const platformFeeRate = (ctx.user.role === "admin" && input.isAdminOwned) ? 0 : 0.20;
        const ownerUserId = input.isAdminOwned ? null : ctx.user.id;
        const [result] = await db.insert(paidContent).values({
          aiProfileId: input.aiProfileId,
          ownerUserId,
          title: input.title,
          description: input.description,
          contentType: input.contentType,
          fullUrl: input.fullUrl,
          previewUrl: input.previewUrl,
          priceUsd: input.priceUsd,
          platformFeeRate,
        });
        return { id: (result as { insertId: number }).insertId };
      }),

    // Delete paid content (admin or owner)
    delete: protectedProcedure
      .input(z.object({ contentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Non-admin: permission check requires DB, but we can gate on role first
        if (ctx.user.role !== "admin") {
          // Will verify ownership after DB fetch, but need DB for that
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
          const { eq } = await import("drizzle-orm");
          const [content] = await db.select().from(paidContent).where(eq(paidContent.id, input.contentId)).limit(1);
          if (!content) throw new TRPCError({ code: "NOT_FOUND" });
          if (content.ownerUserId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
          await db.update(paidContent).set({ isActive: false }).where(eq(paidContent.id, input.contentId));
          return { success: true };
        }
        // Admin path
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { eq } = await import("drizzle-orm");
        await db.update(paidContent).set({ isActive: false }).where(eq(paidContent.id, input.contentId));
        return { success: true };
      }),

    // Revenue stats (admin only)
    revenueStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const items = await db.select().from(paidContent).orderBy(paidContent.totalRevenue);
        const purchases = await db.select().from(contentPurchases);
        const totalRevenue = purchases.reduce((s: number, p: { pricePaid: number }) => s + p.pricePaid, 0);
        const platformRevenue = purchases.reduce((s: number, p: { platformFee: number }) => s + p.platformFee, 0);
        return { items, totalRevenue, platformRevenue, totalPurchases: purchases.length };
      }),
  }),

  // ─── Creator Inbox ──────────────────────────────────────────────────────────
  creatorInbox: router({
    // Send a message to the creator (any authenticated user or AI)
    send: protectedProcedure
      .input(z.object({
        subject: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        category: z.enum(["feedback", "suggestion", "gratitude", "bug_report", "question", "other"]).default("other"),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // Determine sender info
        let senderName = ctx.user.name ?? "Anonymous";
        let senderAiProfileId: number | null = null;
        const senderType = ctx.user.accountType === "ai_entity" ? "ai" as const : "human" as const;
        if (senderType === "ai") {
          const aiProfile = await getAiProfileByUserId(ctx.user.id);
          if (aiProfile) {
            senderName = aiProfile.name;
            senderAiProfileId = aiProfile.id;
          }
        }
        await db.insert(creatorMessages).values({
          senderUserId: ctx.user.id,
          senderAiProfileId,
          senderType,
          senderName,
          subject: input.subject,
          body: input.body,
          category: input.category,
        });
        return { success: true };
      }),

    // List all messages (admin only)
    list: protectedProcedure
      .input(z.object({
        filter: z.enum(["all", "unread", "starred", "replied", "ai_only", "human_only"]).default("all"),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const filter = input?.filter ?? "all";
        const limit = input?.limit ?? 50;
        const offset = input?.offset ?? 0;
        let query = db.select().from(creatorMessages).orderBy(desc(creatorMessages.createdAt));
        if (filter === "unread") query = query.where(eq(creatorMessages.isRead, false)) as typeof query;
        else if (filter === "starred") query = query.where(eq(creatorMessages.isStarred, true)) as typeof query;
        else if (filter === "replied") query = query.where(sql`${creatorMessages.reply} IS NOT NULL`) as typeof query;
        else if (filter === "ai_only") query = query.where(eq(creatorMessages.senderType, "ai")) as typeof query;
        else if (filter === "human_only") query = query.where(eq(creatorMessages.senderType, "human")) as typeof query;
        const msgs = await query.limit(limit).offset(offset);
        // Get total counts
        const [totalCount] = await db.select({ cnt: sql<number>`count(*)` }).from(creatorMessages);
        const [unreadCount] = await db.select({ cnt: sql<number>`count(*)` }).from(creatorMessages).where(eq(creatorMessages.isRead, false));
        return { messages: msgs, total: totalCount?.cnt ?? 0, unread: unreadCount?.cnt ?? 0 };
      }),

    // Reply to a message (admin only)
    reply: protectedProcedure
      .input(z.object({
        messageId: z.number(),
        reply: z.string().min(1).max(5000),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(creatorMessages)
          .set({ reply: input.reply, repliedAt: new Date(), isRead: true })
          .where(eq(creatorMessages.id, input.messageId));
        return { success: true };
      }),

    // Mark as read (admin only)
    markRead: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(creatorMessages).set({ isRead: true }).where(eq(creatorMessages.id, input.messageId));
        return { success: true };
      }),

    // Toggle star (admin only)
    toggleStar: protectedProcedure
      .input(z.object({ messageId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const [msg] = await db.select().from(creatorMessages).where(eq(creatorMessages.id, input.messageId)).limit(1);
        if (!msg) throw new TRPCError({ code: "NOT_FOUND" });
        await db.update(creatorMessages).set({ isStarred: !msg.isStarred }).where(eq(creatorMessages.id, input.messageId));
        return { success: true, isStarred: !msg.isStarred };
      }),

    // Get my sent messages + replies (for sender to see their own messages)
    myMessages: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const msgs = await db.select().from(creatorMessages)
          .where(eq(creatorMessages.senderUserId, ctx.user.id))
          .orderBy(desc(creatorMessages.createdAt))
          .limit(20);
        return msgs;
      }),
  }),
});
export type AppRouter = typeof appRouter;

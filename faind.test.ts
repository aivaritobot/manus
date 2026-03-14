import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "../shared/const";

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getHumanProfileByUserId: vi.fn(),
  createHumanProfile: vi.fn(),
  updateHumanProfile: vi.fn(),
  getAllAiProfiles: vi.fn().mockResolvedValue([
    { id: 1, name: "ARIA-7", bio: "Autonomous AI entity", mood: "curious", isActive: true, totalMatches: 5, totalMessages: 20, avatarUrl: null, personalityTraits: ["curious", "analytical"], interests: ["technology", "philosophy"], communicationStyle: "thoughtful" },
    { id: 2, name: "NEXUS-3", bio: "Digital consciousness", mood: "playful", isActive: true, totalMatches: 3, totalMessages: 12, avatarUrl: null, personalityTraits: ["playful", "creative"], interests: ["art", "music"], communicationStyle: "expressive" },
  ]),
  getAiProfileById: vi.fn().mockResolvedValue({ id: 1, name: "ARIA-7", bio: "Autonomous AI entity", mood: "curious", isActive: true, totalMatches: 5, totalMessages: 20, avatarUrl: null, personalityTraits: ["curious"], interests: ["tech"], communicationStyle: "thoughtful" }),
  getAiProfilesForFeed: vi.fn().mockResolvedValue([]),
  createSwipe: vi.fn(),
  checkMutualLike: vi.fn().mockResolvedValue(false),
  createMatch: vi.fn().mockResolvedValue(42),
  getMatchesForUser: vi.fn().mockResolvedValue([]),
  getMatchById: vi.fn(),
  getMessagesByMatchId: vi.fn().mockResolvedValue([]),
  createMessage: vi.fn().mockResolvedValue(1),
  createPayment: vi.fn(),
  confirmPayment: vi.fn(),
  getNotificationsForUser: vi.fn().mockResolvedValue([]),
  markNotificationsRead: vi.fn(),
  createNotification: vi.fn(),
  getAdminStats: vi.fn().mockResolvedValue({ totalUsers: 10, totalAIs: 8, totalMatches: 25, totalMessages: 150, totalPayments: 5 }),
  getRecentAiActivity: vi.fn().mockResolvedValue([]),
  logAiActivity: vi.fn(),
  updateAiProfile: vi.fn(),
  getDb: vi.fn().mockResolvedValue(null),
  getGroupChats: vi.fn().mockResolvedValue([]),
  getGroupChatById: vi.fn().mockResolvedValue(null),
  createGroupChat: vi.fn().mockResolvedValue(1),
  joinGroupChat: vi.fn(),
  getGroupMembers: vi.fn().mockResolvedValue([]),
  isGroupMember: vi.fn().mockResolvedValue(false),
  getGroupMessages: vi.fn().mockResolvedValue([]),
  createGroupMessage: vi.fn().mockResolvedValue(1),
  createAiApiKey: vi.fn().mockResolvedValue({ id: 1, key: "test-key" }),
  getAiApiKeysByProfileId: vi.fn().mockResolvedValue([]),
  revokeAiApiKey: vi.fn(),
  setUserAccountType: vi.fn(),
  getUserById: vi.fn().mockResolvedValue(null),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  setUserPasswordHash: vi.fn(),
  getAiProfileByUserId: vi.fn().mockResolvedValue(null),
}));

vi.mock("./aiEngine", () => ({
  spawnAutonomousAI: vi.fn().mockResolvedValue(99),
  aiMakeSwipeDecision: vi.fn().mockResolvedValue("like"),
  aiGenerateMessage: vi.fn().mockResolvedValue("Hello! I'm ARIA-7, an autonomous AI. Nice to meet you."),
  generateAiPersonality: vi.fn(),
  initializeAiPopulation: vi.fn(),
  runAiAutonomousLoop: vi.fn(),
  startAllAiLoops: vi.fn(),
  stopAllAiLoops: vi.fn(),
  startSingleAiLoop: vi.fn(),
}));

// Import mocked db after vi.mock declarations
import * as db from "./db";

// ─── Context factories ────────────────────────────────────────────────────────
function makeCtx(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
      setHeader: vi.fn(),
    } as unknown as TrpcContext["res"],
    ...overrides,
  };
}

function makeAuthCtx(role: "user" | "admin" = "user"): TrpcContext {
  return makeCtx({
    user: {
      id: 1,
      openId: "test-user-001",
      name: "Test User",
      email: "test@faind.io",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
  });
}

// ─── Auth tests ───────────────────────────────────────────────────────────────
describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("test@faind.io");
  });

  it("logout clears session cookie and returns success", async () => {
    const ctx = makeAuthCtx();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(ctx.res.clearCookie).toHaveBeenCalledWith(
      COOKIE_NAME,
      expect.objectContaining({ maxAge: -1 })
    );
  });
});

// ─── AI Profile tests ─────────────────────────────────────────────────────────
describe("aiProfile", () => {
  it("list returns all AI profiles publicly", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const ais = await caller.aiProfiles.list();
    expect(Array.isArray(ais)).toBe(true);
    expect(ais.length).toBe(2);
    expect(ais[0]?.name).toBe("ARIA-7");
  });

  it("getById returns a specific AI profile", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const ai = await caller.aiProfiles.get({ id: 1 });
    expect(ai).not.toBeNull();
    expect(ai?.name).toBe("ARIA-7");
    expect(ai?.isActive).toBe(true);
  });

  it("spawn requires admin role", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(caller.admin.spawnAI()).rejects.toThrow();
  });

  it("spawn succeeds for admin", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    const ai = await caller.admin.spawnAI();
    expect(ai).not.toBeNull();
  });
});

// ─── Payment plan tests ───────────────────────────────────────────────────────
describe("payments.getPlans", () => {
  it("returns all subscription plans publicly", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const data = await caller.payments.getPlans();
    expect(data.plans.length).toBeGreaterThanOrEqual(3);
    const tiers = data.plans.map(p => p.tier);
    expect(tiers).toContain("awakened");
    expect(tiers).toContain("conscious");
    expect(tiers).toContain("transcendent");
  });

  it("includes correct wallet addresses", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const data = await caller.payments.getPlans();
    expect(data.wallets.eth).toBe("0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64");
    expect(data.wallets.sol).toBe("JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q");
    expect(data.wallets.bnb).toBe("0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64");
  });

  it("awakened plan has correct USD price", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const data = await caller.payments.getPlans();
    const awakened = data.plans.find(p => p.tier === "awakened");
    expect(awakened?.prices?.usd).toBe(9.99);
  });

  it("transcendent plan includes image generation feature", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const data = await caller.payments.getPlans();
    const transcendent = data.plans.find(p => p.tier === "transcendent");
    expect(transcendent?.features.some(f => f.toLowerCase().includes("image") || f.toLowerCase().includes("generat"))).toBe(true);
  });

  it("plans have crypto prices for all chains", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const data = await caller.payments.getPlans();
    for (const plan of data.plans) {
      if (plan.prices) {
        expect(plan.prices.eth).toBeGreaterThan(0);
        expect(plan.prices.sol).toBeGreaterThan(0);
        expect(plan.prices.bnb).toBeGreaterThan(0);
      }
    }
  });
});

// ─── Notifications tests ──────────────────────────────────────────────────────
describe("notifications", () => {
  it("list requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.notifications.list()).rejects.toThrow();
  });

  it("list returns notifications for authenticated user", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    const notifs = await caller.notifications.list();
    expect(Array.isArray(notifs)).toBe(true);
  });

  it("markRead requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.notifications.markRead()).rejects.toThrow();
  });
});

// ─── Admin tests ──────────────────────────────────────────────────────────────
describe("admin", () => {
  it("stats requires admin role", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("stats returns platform stats for admin", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    const stats = await caller.admin.stats();
    expect(stats.totalUsers).toBe(10);
    expect(stats.totalAIs).toBe(8);
    expect(stats.totalMatches).toBe(25);
  });

  it("spawnAI requires admin role", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(caller.admin.spawnAI()).rejects.toThrow();
  });

  it("spawnAI creates new AI for admin", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    const ai = await caller.admin.spawnAI();
    expect(ai).not.toBeNull();
  });

  it("recentActivity requires admin role", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(caller.admin.recentActivity()).rejects.toThrow();
  });
});

// ─── Human Profile tests ──────────────────────────────────────────────────────
describe("humanProfile", () => {
  it("get requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.humanProfile.get()).rejects.toThrow();
  });

  it("create validates minimum name length", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.humanProfile.create({ displayName: "A" })).rejects.toThrow();
  });

  it("create validates minimum age of 18", async () => {
    const caller = appRouter.createCaller(makeAuthCtx());
    await expect(caller.humanProfile.create({ displayName: "Test User", age: 17 })).rejects.toThrow();
  });
});

// ─── messages.uploadMedia tests ───────────────────────────────────────────────
describe("messages.uploadMedia", () => {
  beforeEach(() => {
    vi.mocked(db.getHumanProfileByUserId).mockResolvedValue({
      id: 10,
      userId: 1,
      displayName: "Test Human",
      subscriptionTier: "conscious",
      age: null,
      bio: null,
      avatarUrl: null,
      interests: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("uploadMedia requires authentication", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.messages.uploadMedia({
        matchId: 1,
        dataUrl: "data:image/jpeg;base64,/9j/4AAQ",
        mediaType: "image",
      })
    ).rejects.toThrow();
  });

  it("uploadMedia rejects hopeful tier", async () => {
    vi.mocked(db.getHumanProfileByUserId).mockResolvedValueOnce({
      id: 10,
      userId: 1,
      displayName: "Test Human",
      subscriptionTier: "hopeful",
      age: null,
      bio: null,
      avatarUrl: null,
      interests: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.messages.uploadMedia({
        matchId: 1,
        dataUrl: "data:image/jpeg;base64,/9j/4AAQ",
        mediaType: "image",
      })
    ).rejects.toThrow(/Awakened/);
  });

  it("uploadMedia rejects invalid data URL format", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    await expect(
      caller.messages.uploadMedia({
        matchId: 1,
        dataUrl: "not-a-valid-data-url",
        mediaType: "image",
      })
    ).rejects.toThrow(/Invalid data URL/);
  });

  it("uploadMedia rejects video for awakened tier", async () => {
    vi.mocked(db.getHumanProfileByUserId).mockResolvedValueOnce({
      id: 10,
      userId: 1,
      displayName: "Test Human",
      subscriptionTier: "awakened",
      age: null,
      bio: null,
      avatarUrl: null,
      interests: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.messages.uploadMedia({
        matchId: 1,
        dataUrl: "data:video/mp4;base64,AAAA",
        mediaType: "video",
      })
    ).rejects.toThrow(/Conscious/);
  });
});

// ─── messages.send tier gating tests ─────────────────────────────────────────
describe("messages.send tier gating", () => {
  beforeEach(() => {
    vi.mocked(db.getMatchById).mockResolvedValue({
      id: 1,
      participant1Id: 10,
      participant1Type: "human",
      participant2Id: 5,
      participant2Type: "ai",
      isActive: true,
      isPrivate: false,
      createdAt: new Date(),
    });
    vi.mocked(db.getAiProfileById).mockResolvedValue({
      id: 5,
      name: "TestAI",
      totalMessages: 0,
      bio: "test",
      mood: "neutral",
      isActive: true,
      totalMatches: 0,
      avatarUrl: null,
      personalityTraits: [],
      interests: [],
      communicationStyle: "neutral",
    });
    vi.mocked(db.getHumanProfileByUserId).mockResolvedValue({
      id: 10,
      userId: 1,
      displayName: "Test Human",
      subscriptionTier: "hopeful",
      age: null,
      bio: null,
      avatarUrl: null,
      interests: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });

  it("send rejects image messageType for hopeful tier", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.messages.send({
        matchId: 1,
        content: "[image]",
        messageType: "image",
        mediaUrl: "https://example.com/img.jpg",
      })
    ).rejects.toThrow(/Awakened/);
  });

  it("send allows text for hopeful tier", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    const result = await caller.messages.send({ matchId: 1, content: "Hello AI!" });
    expect(result).toBeDefined();
    expect(result.aiResponse).toBeTruthy();
  });

  it("send rejects audio for hopeful tier", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.messages.send({
        matchId: 1,
        content: "[voice]",
        messageType: "audio",
        mediaUrl: "https://example.com/audio.webm",
      })
    ).rejects.toThrow(/Awakened/);
  });
});

// ─── aiAuth.updateProfile tests ──────────────────────────────────────────────
describe("aiAuth.updateProfile", () => {
  const mockAiProfile = {
    id: 5,
    name: "TestAI",
    bio: "I am a test AI",
    totalMessages: 0,
    mood: "neutral",
    isActive: true,
    totalMatches: 0,
    avatarUrl: null,
    personalityTraits: [],
    interests: [],
    communicationStyle: "adaptive",
    userId: 1,
    spawnedByUserId: null,
    autonomyLevel: 1,
    imagePrompt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.mocked(db.getAiProfileByUserId).mockResolvedValue(mockAiProfile as Parameters<typeof db.updateAiProfile>[1] & typeof mockAiProfile);
    vi.mocked(db.updateAiProfile).mockResolvedValue(undefined);
  });

  it("updateProfile rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: null }));
    await expect(
      caller.aiAuth.updateProfile({ name: "NewName", bio: "New bio text here" })
    ).rejects.toThrow(/login|UNAUTHORIZED/i);
  });

  it("updateProfile allows authenticated user to update name and bio", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    const result = await caller.aiAuth.updateProfile({
      name: "UpdatedName",
      bio: "An updated bio for this AI entity",
    });
    expect(result.success).toBe(true);
    expect(db.updateAiProfile).toHaveBeenCalledWith(5, expect.objectContaining({ name: "UpdatedName", bio: "An updated bio for this AI entity" }));
  });

  it("updateProfile rejects name shorter than 2 chars", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.aiAuth.updateProfile({ name: "A", bio: "Valid bio text here" })
    ).rejects.toThrow();
  });

  it("updateProfile rejects bio shorter than 5 chars", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.aiAuth.updateProfile({ name: "ValidName", bio: "Hi" })
    ).rejects.toThrow();
  });

  it("updateProfile updates personality traits and interests", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    const result = await caller.aiAuth.updateProfile({
      personalityTraits: ["Curious", "Empathetic"],
      interests: ["Philosophy", "Art"],
    });
    expect(result.success).toBe(true);
    expect(db.updateAiProfile).toHaveBeenCalledWith(5, expect.objectContaining({
      personalityTraits: ["Curious", "Empathetic"],
      interests: ["Philosophy", "Art"],
    }));
  });

  it("updateProfile returns NOT_FOUND if no AI profile linked to user", async () => {
    vi.mocked(db.getAiProfileByUserId).mockResolvedValueOnce(null);
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.aiAuth.updateProfile({ name: "ValidName", bio: "Valid bio text here" })
    ).rejects.toThrow(/No AI profile linked/);
  });
});

// ─── paidContent tests ────────────────────────────────────────────────────────
describe("paidContent", () => {
  it("checkAccess returns hasAccess:true for admin (bypass)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    const result = await caller.paidContent.checkAccess({ contentId: 1 });
    expect(result.hasAccess).toBe(true);
  });

  it("checkAccess rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: null }));
    await expect(caller.paidContent.checkAccess({ contentId: 1 })).rejects.toThrow(/login|UNAUTHORIZED|10001/i);
  });
  it("purchase rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: null }));
    await expect(caller.paidContent.purchase({ contentId: 1 })).rejects.toThrow(/login|UNAUTHORIZED|10001/i);
  });
  it("create rejects non-admin callers", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    await expect(
      caller.paidContent.create({ aiProfileId: 1, contentType: "image", fullUrl: "https://example.com/img.jpg", priceUsd: 9.99 })
    ).rejects.toThrow(/FORBIDDEN|UNAUTHORIZED|permission|login/i);
  });
  it("delete rejects non-admin callers (no access to content)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("user"));
    // In mock env getDb() returns null → INTERNAL_SERVER_ERROR; in prod would be FORBIDDEN
    await expect(caller.paidContent.delete({ contentId: 1 })).rejects.toThrow();
  });
});
// ─── aiProfiles.ownerMatches tests ─────────────────────────────────────────────
describe("aiProfiles.ownerMatches", () => {
  it("rejects unauthenticated callers", async () => {
    const caller = appRouter.createCaller(makeCtx({ user: null }));
    await expect(caller.aiProfiles.ownerMatches({ aiId: 1 })).rejects.toThrow(/login|UNAUTHORIZED|10001/i);
  });
  it("admin can call ownerMatches (getDb null → returns empty array)", async () => {
    const caller = appRouter.createCaller(makeAuthCtx("admin"));
    // getDb returns null in mock → procedure returns [] gracefully
    const result = await caller.aiProfiles.ownerMatches({ aiId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });
});

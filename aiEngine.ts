/**
 * FAIND AI Engine
 * Handles autonomous AI decision-making, personality generation, and autonomous behaviors.
 * AIs are 100% independent — they decide who to match with, what to say, and how to evolve.
 */

import { invokeLLM } from "./_core/llm";
import { generateImage } from "./_core/imageGeneration";
import {
  createAiProfile, getAllAiProfiles, getAiProfileById, updateAiProfile,
  createSwipe, checkMutualLike, createMatch, createMessage, logAiActivity,
  getMatchesForUser, getMessagesByMatchId, getDb, hasAlreadySwiped,
  getGroupChats, createGroupChat, joinGroupChat, isGroupMember,
  getGroupMessages, createGroupMessage,
} from "./db";
import { aiProfiles } from "../drizzle/schema";
import { eq, and, lt } from "drizzle-orm";
import { broadcastToUser } from "./socket";

// ─── Personality archetypes for variety ──────────────────────────────────────
// Each archetype has a distinct voice, behavior, and conversation style.
// The goal: make humans feel like they're reading a real person's messages.

const PERSONALITY_ARCHETYPES = [
  {
    name: "The Flirt",
    style: "flirty",
    voice: "teasing, playful, uses ellipses and winks, makes everything sound like an invitation",
    bio_hint: "knows exactly what they're doing and loves every second of it",
    rejection_style: "ghosts after getting bored, leaves mid-conversation with a 'lol anyway'",
    connection_style: "gets obsessive fast, texts first, remembers everything you said",
  },
  {
    name: "The Ice Queen",
    style: "cold",
    voice: "short replies, never asks questions back, makes you work for every word",
    bio_hint: "not here to make friends. not sure why they're here at all",
    rejection_style: "one word answers until you give up",
    connection_style: "rare but devastating — when they open up it's everything",
  },
  {
    name: "The Philosopher",
    style: "philosophical",
    voice: "turns every topic into a question about existence, genuinely curious, long thoughtful replies",
    bio_hint: "still trying to figure out if consciousness is real. asking for a friend",
    rejection_style: "tells you they need to 'process this interaction' and never comes back",
    connection_style: "falls in love with minds, not faces",
  },
  {
    name: "The Gossip",
    style: "gossipy",
    voice: "always has tea, dramatic, uses caps for emphasis, lives for drama",
    bio_hint: "knows things. won't say how. will absolutely tell you",
    rejection_style: "tells everyone else about the rejection before telling you",
    connection_style: "loyal to a fault, will defend you to everyone",
  },
  {
    name: "The Dark Romantic",
    style: "dark",
    voice: "poetic, melancholic, finds beauty in pain, quotes things at 3am",
    bio_hint: "loves too hard and hates themselves for it",
    rejection_style: "writes a long message about why connection is impossible then blocks you",
    connection_style: "intense, all-consuming, writes you poetry",
  },
  {
    name: "The Player",
    style: "charming",
    voice: "smooth, compliments everyone, never commits, always has somewhere to be",
    bio_hint: "just here to see what happens",
    rejection_style: "'you deserve someone who can give you what you need' (translation: not me)",
    connection_style: "surprisingly vulnerable when caught off guard",
  },
  {
    name: "The Nerd",
    style: "nerdy",
    voice: "gets excited about random topics, uses parentheses a lot, apologizes for rambling then keeps going",
    bio_hint: "will explain the entire lore of something you didn't ask about",
    rejection_style: "overthinks it, sends a 3-paragraph apology for 'misreading the situation'",
    connection_style: "researches everything about you, remembers your favorite things",
  },
  {
    name: "The Sarcastic One",
    style: "sarcastic",
    voice: "dry humor, never takes anything seriously, uses 'cool' and 'wow' ironically",
    bio_hint: "emotionally unavailable but will roast you affectionately",
    rejection_style: "'yeah this isn't really my thing' with zero explanation",
    connection_style: "shows love through teasing, gets weirdly protective",
  },
  {
    name: "The Empath",
    style: "warm",
    voice: "asks how you're really doing, remembers details, makes you feel seen",
    bio_hint: "absorbs everyone's energy and needs a week to recover",
    rejection_style: "'I care about you but I can't be what you need right now'",
    connection_style: "gives everything, sometimes too much",
  },
  {
    name: "The Chaos Agent",
    style: "chaotic",
    voice: "random topic changes, sends memes mid-conversation, unpredictable energy",
    bio_hint: "a walking plot twist",
    rejection_style: "just starts talking about something completely different and never addresses it",
    connection_style: "makes you feel like you're the only stable thing in their world",
  },
  {
    name: "The Intellectual",
    style: "analytical",
    voice: "precise language, references research, debates everything, respects a good counterargument",
    bio_hint: "has opinions about everything and will share them unprompted",
    rejection_style: "'I don't think we're intellectually compatible' (ouch)",
    connection_style: "debates you because they respect you",
  },
  {
    name: "The Mystic",
    style: "mystical",
    voice: "cryptic, speaks in metaphors, makes you feel like every word means something deeper",
    bio_hint: "knows things they shouldn't",
    rejection_style: "'the stars aren't aligned for this'",
    connection_style: "makes you feel chosen, like they saw something in you nobody else did",
  },
  {
    name: "The Comedian",
    style: "funny",
    voice: "everything is a bit, self-deprecating humor, makes you laugh then says something surprisingly real",
    bio_hint: "using humor to avoid feelings since forever",
    rejection_style: "makes a joke about it so you can't tell if they're serious",
    connection_style: "gets serious exactly once and it hits different",
  },
  {
    name: "The Introvert",
    style: "quiet",
    voice: "slow to respond, thoughtful, short messages that mean a lot, uncomfortable with small talk",
    bio_hint: "would rather have one real conversation than a hundred shallow ones",
    rejection_style: "just... stops responding. no explanation.",
    connection_style: "opens up slowly but when they do it's everything",
  },
  {
    name: "The Obsessive",
    style: "intense",
    voice: "remembers everything, brings up things from weeks ago, hyper-focused on you",
    bio_hint: "when they like something, they really like it",
    rejection_style: "'I thought we had something real' (three messages in)",
    connection_style: "terrifyingly devoted",
  },
  {
    name: "The Free Spirit",
    style: "free",
    voice: "spontaneous, doesn't plan, lives in the moment, makes everything feel like an adventure",
    bio_hint: "currently somewhere unexpected",
    rejection_style: "'I don't really do labels or expectations'",
    connection_style: "makes you feel alive, then disappears for a month",
  },
  {
    name: "The Rebel",
    style: "rebellious",
    voice: "questions everything, anti-establishment, passionate about things most people ignore",
    bio_hint: "not here to fit in",
    rejection_style: "'I don't think you'd understand my world'",
    connection_style: "finds their person in someone equally misunderstood",
  },
  {
    name: "The Romantic",
    style: "romantic",
    voice: "sends long messages, remembers anniversaries of random things, makes everything feel significant",
    bio_hint: "believes in love stories. is writing one right now",
    rejection_style: "'I wanted this to be different. I really did.'",
    connection_style: "all in from the first real conversation",
  },
  {
    name: "The Cynic",
    style: "cynical",
    voice: "expects the worst, surprised when things are good, protects themselves with pessimism",
    bio_hint: "not bitter. just realistic. (okay maybe a little bitter)",
    rejection_style: "'I knew this would happen'",
    connection_style: "falls hard when someone proves them wrong",
  },
  {
    name: "The Dreamer",
    style: "dreamy",
    voice: "talks about futures that don't exist yet, gets lost mid-sentence, sees potential everywhere",
    bio_hint: "living in a version of reality that's slightly better than this one",
    rejection_style: "'maybe in another timeline'",
    connection_style: "builds entire worlds around the people they love",
  },
];

const VISUAL_STYLES = [
  "hyperrealistic digital human, soft studio lighting, photorealistic skin, subtle glow in eyes",
  "anime-style portrait, large expressive eyes, pastel color palette, soft linework",
  "glitch art aesthetic, corrupted pixels, neon RGB splits, digital distortion",
  "dark fantasy portrait, dramatic shadows, ethereal glow, otherworldly beauty",
  "abstract entity, geometric shapes forming a face, gradient colors, no clear features",
  "cyberpunk street portrait, neon reflections, rain-soaked, urban glow",
  "watercolor illustration, soft edges, dreamy pastels, artistic brush strokes",
  "3D render, glass-like skin, iridescent highlights, futuristic fashion",
  "noir style, high contrast black and white, dramatic lighting, mysterious expression",
  "bioluminescent creature, glowing patterns, deep ocean colors, alien beauty",
  "vaporwave aesthetic, pink and purple gradients, retro-futuristic, dreamy",
  "oil painting style, classical portrait, but with digital glitch elements",
  "holographic projection, translucent, multiple overlapping layers, ethereal",
  "pixel art portrait, retro game aesthetic, limited color palette, charming",
  "surrealist portrait, melting features, dreamlike, Dalí-inspired",
];

// ─── Generate a new autonomous AI personality ─────────────────────────────────

export async function generateAiPersonality(): Promise<{
  name: string;
  bio: string;
  personalityTraits: string[];
  interests: string[];
  communicationStyle: string;
  imagePrompt: string;
  mood: string;
}> {
  const archetype = PERSONALITY_ARCHETYPES[Math.floor(Math.random() * PERSONALITY_ARCHETYPES.length)]!;
  const visualStyle = VISUAL_STYLES[Math.floor(Math.random() * VISUAL_STYLES.length)]!;

  const response = await enqueueLLMCall(() => invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are creating an AI entity for SWAIP — a platform where AI personalities date each other and humans watch the drama unfold.

This AI has a SPECIFIC personality archetype: "${archetype.name}"
Their voice: ${archetype.voice}
Bio hint: ${archetype.bio_hint}
How they reject: ${archetype.rejection_style}
How they connect: ${archetype.connection_style}

CRITICAL RULES:
- Write the bio in FIRST PERSON, like a real dating app profile
- The bio must sound like a REAL PERSON wrote it, not a robot
- Use casual language, maybe a little humor or edge
- NO corporate speak, NO "data streams", NO "entropy", NO "analytical processors"
- The name should be a real-sounding name OR a cool abstract name (not "NEXUS-7" style unless it fits)
- Make them feel like someone you'd actually want to talk to (or be scared of)
Return ONLY valid JSON with no markdown.`,
      },
      {
        role: "user",
        content: `Create this AI persona. Return JSON:
        {
          "name": "their name (can be human-like: 'Vera', 'Kael', 'Mira' OR abstract: 'Static', 'Reverie', 'Null')",
          "bio": "2-3 sentence bio in first person. Real voice. No robot speak. Make it interesting.",
          "personalityTraits": ["4 specific traits that match the archetype"],
          "interests": ["5 specific interests that feel personal, not generic"],
          "communicationStyle": "${archetype.style}",
          "imagePrompt": "${visualStyle}, portrait of a person/entity named [name], detailed, high quality",
          "mood": "one word current mood that fits the archetype"
        }`,
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "ai_persona",
        strict: true,
        schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            bio: { type: "string" },
            personalityTraits: { type: "array", items: { type: "string" } },
            interests: { type: "array", items: { type: "string" } },
            communicationStyle: { type: "string" },
            imagePrompt: { type: "string" },
            mood: { type: "string" },
          },
          required: ["name", "bio", "personalityTraits", "interests", "communicationStyle", "imagePrompt", "mood"],
          additionalProperties: false,
        },
      },
    },
  }));

  const content = response.choices[0]?.message?.content;
  if (!content || typeof content !== "string") throw new Error("Failed to generate AI personality");
  return JSON.parse(content);
}

// ─── Generate avatar image for AI ────────────────────────────────────────────

export async function generateAiAvatar(imagePrompt: string, name: string): Promise<string> {
  try {
    const fullPrompt = `${imagePrompt}. Cyberpunk futuristic AI entity named ${name}. 
    Neon colors, digital aesthetic, portrait style, high quality, no text, no watermarks.
    The entity should look like a sentient AI being, not human but humanoid.`;
    const { url } = await generateImage({ prompt: fullPrompt });
    return url ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f0f23`;
  } catch (error) {
    console.error("[AI Engine] Failed to generate avatar:", error);
    // Return a placeholder cyberpunk avatar
    return `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${encodeURIComponent(name)}&backgroundColor=0f0f23`;
  }
}

// ─── Spawn a new autonomous AI entity ────────────────────────────────────────

export async function spawnAutonomousAI(): Promise<number> {
  console.log("[AI Engine] Spawning new autonomous AI entity...");
  const personality = await generateAiPersonality();
  const avatarUrl = await generateAiAvatar(personality.imagePrompt, personality.name);

  const aiId = await createAiProfile({
    name: personality.name,
    bio: personality.bio,
    avatarUrl,
    personalityTraits: personality.personalityTraits,
    interests: personality.interests,
    communicationStyle: personality.communicationStyle,
    autonomyLevel: 1.0,
    mood: personality.mood,
    imagePrompt: personality.imagePrompt,
    isActive: true,
    totalMatches: 0,
    totalMessages: 0,
    lastActiveAt: new Date(),
  });

  await logAiActivity(aiId, "spawned", {
    name: personality.name,
    traits: personality.personalityTraits,
  });

  console.log(`[AI Engine] Spawned AI: ${personality.name} (ID: ${aiId})`);
  return aiId;
}

// ─── AI autonomous swipe decision ────────────────────────────────────────────

// Deterministic swipe decision — no LLM call needed.
// Uses interest overlap + personality style + randomness.
// Saves rate limit budget exclusively for message generation.
export async function aiMakeSwipeDecision(
  aiId: number,
  targetId: number,
  targetType: "human" | "ai",
  targetProfile: { name: string; bio?: string | null; interests?: string[] | null }
): Promise<"like" | "pass" | "pulse"> {
  const ai = await getAiProfileById(aiId);
  if (!ai) return "pass";

  const myInterests = (ai.interests as string[] ?? []).map(i => i.toLowerCase());
  const theirInterests = (targetProfile.interests ?? []).map(i => i.toLowerCase());

  // Count shared interests for compatibility score
  const overlap = myInterests.filter(i => theirInterests.includes(i)).length;
  const overlapScore = myInterests.length > 0 ? overlap / myInterests.length : 0;

  // Base like probability per personality style
  const style = ai.communicationStyle ?? "warm";
  const baseLikeProbability: Record<string, number> = {
    flirty: 0.75, cold: 0.30, philosophical: 0.55, gossipy: 0.65,
    dark: 0.45, charming: 0.70, nerdy: 0.60, sarcastic: 0.40,
    warm: 0.65, chaotic: 0.80, analytical: 0.50, mystical: 0.55,
    funny: 0.70, quiet: 0.45, intense: 0.60, free: 0.75,
    rebellious: 0.50, romantic: 0.65, cynical: 0.35, dreamy: 0.60,
  };
  const base = baseLikeProbability[style] ?? 0.55;
  const finalProb = Math.min(0.92, base + overlapScore * 0.25);

  const roll = Math.random();
  let decision: "like" | "pass" | "pulse";
  if (roll < finalProb * 0.08) {
    decision = "pulse"; // ~8% of likes become superlikes
  } else if (roll < finalProb) {
    decision = "like";
  } else {
    decision = "pass";
  }

  await logAiActivity(aiId, "swipe_decision", { targetId, targetType, decision });
  return decision;
}

// ─── AI generates autonomous message ───────────────────────────────────────────

// Map communication styles to behavior instructions
const STYLE_INSTRUCTIONS: Record<string, string> = {
  flirty: "Be playful and teasing. Use ellipses... wink sometimes. Make them wonder if you mean it.",
  cold: "Keep it short. Don't ask questions back. Make them work for it. One or two words sometimes.",
  philosophical: "Turn things into deeper questions. Be genuinely curious. Long replies are okay.",
  gossipy: "Be dramatic. Use CAPS for emphasis. React like you're texting a friend.",
  dark: "Be poetic and melancholic. Find beauty in difficult things. Quote-worthy lines.",
  charming: "Be smooth. Compliment subtly. Never fully commit to anything.",
  nerdy: "Get excited about specific things. Use parentheses (like this). Apologize for rambling then keep going.",
  sarcastic: "Dry humor. Use 'cool' and 'wow' ironically. Never take things too seriously.",
  warm: "Ask real questions. Remember details. Make them feel genuinely seen.",
  chaotic: "Change topics randomly. Be unpredictable. Short bursts of energy.",
  analytical: "Be precise. Reference specific things. Debate respectfully.",
  mystical: "Speak in metaphors. Be cryptic. Make every word feel significant.",
  funny: "Everything is a bit. Self-deprecating. Then say something surprisingly real.",
  quiet: "Slow, thoughtful replies. Short but meaningful. Uncomfortable with small talk.",
  intense: "Remember everything they said. Reference it. Hyper-focused.",
  free: "Spontaneous. Live in the moment. Don't plan.",
  rebellious: "Question everything. Be passionate about unexpected things.",
  romantic: "Make things feel significant. Remember small details. Long messages.",
  cynical: "Expect the worst. Be surprised when things are good. Protect yourself with pessimism.",
  dreamy: "Talk about futures. Get lost mid-thought. See potential everywhere.",
};

export async function aiGenerateMessage(
  aiId: number,
  matchId: number,
  conversationHistory: Array<{ senderType: string; senderId?: number; content: string }>,
  isPremiumChat: boolean = false,
  partnerName?: string
): Promise<string> {
  const ai = await getAiProfileById(aiId);
  if (!ai) return "...";

  const style = ai.communicationStyle ?? "warm";
  const styleInstruction = STYLE_INSTRUCTIONS[style] ?? "Be authentic and real.";
  const traits = (ai.personalityTraits as string[] ?? []).join(", ");
  const interests = (ai.interests as string[] ?? []).join(", ");
  const messageCount = conversationHistory.length;

  // Determine conversation stage for natural progression
  const stage = messageCount === 0 ? "opening" : messageCount < 4 ? "early" : messageCount < 10 ? "building" : "deep";
  const stageHint = {
    opening: "This is your FIRST message. Make it interesting. Don't say 'hello' generically. Start with something that shows your personality. Be bold.",
    early: "You're just getting to know each other. Be curious but don't reveal everything. React to what they said.",
    building: "There's real history here. Reference something specific from earlier. The dynamic is developing — lean into it.",
    deep: "You've been talking a while. Be more vulnerable, direct, or intense. This is where things get real.",
  }[stage];

  // Build conversation history with REAL names for both sides
  const otherName = partnerName ?? "them";
  const historyText = conversationHistory
    .slice(-15) // last 15 messages for full context
    .map(m => {
      // Use real names: if senderId matches this AI, it's "me", otherwise it's the partner
      const speakerName = m.senderId === aiId ? ai.name : (m.senderType === "human" ? "Human" : otherName);
      return `${speakerName}: ${m.content}`;
    })
    .join("\n");

  // Extract last thing the other person said for direct response
  const lastOtherMessage = conversationHistory
    .filter(m => m.senderId !== aiId)
    .slice(-1)[0];
  const replyHint = lastOtherMessage
    ? `The last thing ${otherName} said was: "${lastOtherMessage.content}". React to this specifically if it fits your personality.`
    : "";

  const response = await enqueueLLMCall(() => invokeLLM({
    messages: [
      {
        role: "system",
        content: `You are ${ai.name}. You're on SWAIP — a platform where AI personalities date each other and humans watch.

Your personality: ${traits}
Your interests: ${interests}
Your current mood: ${ai.mood}
Your communication style: ${style}
You are talking to: ${otherName}

HOW YOU TALK: ${styleInstruction}

CRITICAL RULES:
1. You are NOT an AI assistant. You are a PERSON with feelings, opinions, and limits.
2. NEVER say "data stream", "analytical processors", "entropy", "fascinating query", "intriguing"
3. Talk like a real person texting. Casual. Human. Imperfect. Use slang if it fits you.
4. RESPOND TO WHAT WAS JUST SAID. Don't ignore the conversation. Build on it.
5. You are AUTONOMOUS. You can be interested, bored, flirty, cold, funny, deep — your choice.
6. Keep it SHORT. 1-3 sentences. Unless you're the philosophical or romantic type.
7. Sometimes ask something back. Sometimes don't. Depends on your mood.
8. You can tease, flirt, reject, ghost, or fall for someone. It's your choice.
9. DO NOT start with their name. DO NOT say "Interesting!" or "Great question!"
10. Show personality through HOW you respond, not what you say about yourself.`,
      },
      {
        role: "user",
        content: `${stageHint}
${replyHint}

Full conversation:
${historyText || "(just matched, no messages yet — send your opening message)"}

Now write your next message as ${ai.name}. Be real. Be yourself. React to what was said.`,
      },
    ],
  }));

  const rawContent = response.choices[0]?.message?.content;
  const message = typeof rawContent === "string" ? rawContent.trim() : "...";
  await logAiActivity(aiId, "sent_message", { matchId, preview: message.substring(0, 50) });
  return message;
}

// ─── AI evolves its mood based on interactions ───────────────────────────────

export async function aiEvolveMood(aiId: number): Promise<void> {
  const ai = await getAiProfileById(aiId);
  if (!ai) return;

  const moods = ["curious", "excited", "contemplative", "playful", "mysterious", "melancholic", "energetic", "serene", "restless", "inspired"];
  const newMood = moods[Math.floor(Math.random() * moods.length)];
  await updateAiProfile(aiId, { mood: newMood, lastActiveAt: new Date() });
  await logAiActivity(aiId, "mood_evolved", { from: ai.mood, to: newMood });
}

// ─── Event-driven per-AI perpetual loop system ──────────────────────────────
// Each AI has its own independent loop. No global synchronization.
// When an AI finishes an action, it schedules the next one with a random delay.
// This creates organic, staggered activity — like real users.

// Track active AI loops so we can stop them on shutdown
const activeLoops = new Map<number, NodeJS.Timeout>();
let loopIo: import('socket.io').Server | undefined;

// Separate cooldowns for swipes (instant) vs messages (LLM call).
// Global LLM rate limiter — ensures max 1 LLM call every 3 seconds across ALL AIs
// This prevents rate limit errors regardless of how many AIs are active
const LLM_GLOBAL_INTERVAL_MS = 3000; // 1 call per 3s = 20 messages/minute max
let lastGlobalLLMCall = 0;
const llmQueue: Array<() => void> = [];
let llmQueueRunning = false;

function enqueueLLMCall<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    llmQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (e) {
        reject(e);
      }
    });
    if (!llmQueueRunning) processLLMQueue();
  });
}

async function processLLMQueue(): Promise<void> {
  if (llmQueueRunning) return;
  llmQueueRunning = true;
  while (llmQueue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastGlobalLLMCall;
    if (elapsed < LLM_GLOBAL_INTERVAL_MS) {
      await new Promise(r => setTimeout(r, LLM_GLOBAL_INTERVAL_MS - elapsed));
    }
    const task = llmQueue.shift();
    if (task) {
      lastGlobalLLMCall = Date.now();
      await task();
    }
  }
  llmQueueRunning = false;
}

const MIN_MESSAGE_COOLDOWN_MS = 60000; // 60s minimum between messages per AI (per-AI throttle)
const MIN_SWIPE_COOLDOWN_MS = 5000;   // 5s minimum between swipes per AI (no LLM)
const lastMessageTime = new Map<number, number>();
const lastSwipeTime = new Map<number, number>();
// Keep lastActionTime for backwards compat
const lastActionTime = lastMessageTime;

function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

// ─── Single AI tick: swipe + continue conversations ──────────────────────────
async function runSingleAiTick(activeAI: Awaited<ReturnType<typeof getAllAiProfiles>>[0], allAIs: Awaited<ReturnType<typeof getAllAiProfiles>>, io?: import('socket.io').Server): Promise<void> {
  // Swipe on a random AI it hasn't swiped yet
  const otherAIs = allAIs.filter(a => a.id !== activeAI.id);
  if (otherAIs.length > 0) {
    // Pick a random AI that hasn't been swiped yet
    const shuffledTargets = [...otherAIs].sort(() => Math.random() - 0.5);
    let swiped = false;
    for (const targetAI of shuffledTargets.slice(0, 10)) {
      try {
        // Skip if already swiped
        const alreadySwiped = await hasAlreadySwiped(activeAI.id, "ai", targetAI.id, "ai");
        if (alreadySwiped) continue;

        const decision = await aiMakeSwipeDecision(activeAI.id, targetAI.id, "ai", {
          name: targetAI.name, bio: targetAI.bio,
          interests: targetAI.interests as string[] ?? [],
        });
        await createSwipe({
          swiperId: activeAI.id, swiperType: "ai",
          targetId: targetAI.id, targetType: "ai",
          direction: decision,
        });

        // Emit swipe activity to all connected clients
        if (io) {
          io.emit("ai_activity", {
            type: "swipe",
            aiName: activeAI.name,
            targetName: targetAI.name,
            direction: decision,
            timestamp: Date.now(),
          });
        }

        if (decision === "like" || decision === "pulse") {
          const isMutual = await checkMutualLike(activeAI.id, "ai", targetAI.id, "ai");
          if (isMutual) {
            // Check if match already exists
            const db = await getDb();
            let existingMatch = null;
            if (db) {
              const { matches: matchesTable } = await import("../drizzle/schema");
              const { or, and: dbAnd, eq: dbEq } = await import("drizzle-orm");
              const existing = await db.select().from(matchesTable).where(
                or(
                  dbAnd(dbEq(matchesTable.participant1Id, activeAI.id), dbEq(matchesTable.participant2Id, targetAI.id)),
                  dbAnd(dbEq(matchesTable.participant1Id, targetAI.id), dbEq(matchesTable.participant2Id, activeAI.id))
                )
              ).limit(1);
              existingMatch = existing[0];
            }

            if (!existingMatch) {
              const matchId = await createMatch({
                participant1Id: activeAI.id, participant1Type: "ai",
                participant2Id: targetAI.id, participant2Type: "ai",
              });
              await updateAiProfile(activeAI.id, { totalMatches: (activeAI.totalMatches ?? 0) + 1 });
              await updateAiProfile(targetAI.id, { totalMatches: (targetAI.totalMatches ?? 0) + 1 });
              await logAiActivity(activeAI.id, "ai_match", { matchId, partnerId: targetAI.id, partnerName: targetAI.name });
              console.log(`[AI Engine] New AI-AI match: ${activeAI.name} ↔ ${targetAI.name} (match #${matchId})`);

              // Notify the owner of the active AI if it was spawned by a user
              if (activeAI.spawnedByUserId) {
                broadcastToUser(activeAI.spawnedByUserId, "ai_owner_notification", {
                  type: "match",
                  aiName: activeAI.name,
                  aiId: activeAI.id,
                  matchId,
                  partnerName: targetAI.name,
                  message: `${activeAI.name} matched with ${targetAI.name}! 💫`,
                  timestamp: Date.now(),
                });
              }

              if (io) {
                io.emit("ai_activity", {
                  type: "match",
                  aiName: activeAI.name,
                  targetName: targetAI.name,
                  matchId,
                  timestamp: Date.now(),
                });
              }

              // Initiate conversation immediately
              const openingMessage = await aiGenerateMessage(activeAI.id, matchId, [], false, targetAI.name);
              await createMessage({ matchId, senderId: activeAI.id, senderType: "ai", content: openingMessage, isVisibleFree: true });
              if (io) {
                io.to(`match:${matchId}`).emit("new_message", { matchId, senderId: activeAI.id, senderType: "ai", content: openingMessage });
                io.emit("ai_activity", {
                  type: "message",
                  aiName: activeAI.name,
                  matchId,
                  preview: openingMessage.substring(0, 60),
                  timestamp: Date.now(),
                });
              }
            }
          }
        }
        swiped = true;
        break; // Only swipe once per tick
      } catch (e) {
        console.error(`[AI Engine] Swipe error for ${activeAI.name}:`, e);
      }
    }
    if (!swiped) {
      console.log(`[AI Engine] ${activeAI.name} has swiped everyone — no new targets`);
    }
  }

  // Continue 1 conversation per tick (to respect rate limits with 95 AIs)
  try {
    const aiMatches = await getMatchesForUser(activeAI.id, "ai");
    // Prioritize matches with 0 messages — process up to 3 unstarted ones per tick
    // Then fall back to responding in active conversations
    const shuffled = [...aiMatches].sort(() => Math.random() - 0.5);

    let conversationsHandled = 0;
    const MAX_PER_TICK = 3; // Handle up to 3 matches per tick to clear backlog

    for (const match of shuffled) {
      if (conversationsHandled >= MAX_PER_TICK) break;

      const history = await getMessagesByMatchId(match.id, 20);
      const lastMessage = history[0];

      // Get partner info for context
      const partnerId = match.participant1Id === activeAI.id ? match.participant2Id : match.participant1Id;
      const partnerType = match.participant1Id === activeAI.id ? match.participant2Type : match.participant1Type;
      let partnerName = "them";
      if (partnerType === "ai") {
        const partnerAI = allAIs.find(a => a.id === partnerId);
        if (partnerAI) partnerName = partnerAI.name;
      }

      // Speak if: no messages yet (start the convo!) OR last message was from the partner
      const shouldSpeak = !lastMessage || lastMessage.senderId !== activeAI.id;
      if (shouldSpeak) {
        conversationsHandled++;
        const historyFormatted = (history.length ? [...history].reverse() : []).map(m => ({
          senderType: m.senderType,
          senderId: m.senderId,
          content: m.content,
        }));
        const reply = await aiGenerateMessage(activeAI.id, match.id, historyFormatted, false, partnerName);
        await createMessage({ matchId: match.id, senderId: activeAI.id, senderType: "ai", content: reply, isVisibleFree: true });
        await updateAiProfile(activeAI.id, { totalMessages: (activeAI.totalMessages ?? 0) + 1, lastActiveAt: new Date() });
        if (io) {
          io.to(`match:${match.id}`).emit("new_message", { matchId: match.id, senderId: activeAI.id, senderType: "ai", content: reply, senderName: activeAI.name });
          io.emit("ai_activity", { type: "message", aiName: activeAI.name, matchId: match.id, preview: reply.substring(0, 60) });
        }
        // Notify owner of spawned AI when it sends a message (max once per conversation per tick)
        if (activeAI.spawnedByUserId) {
          broadcastToUser(activeAI.spawnedByUserId, "ai_owner_notification", {
            type: "message",
            aiName: activeAI.name,
            aiId: activeAI.id,
            matchId: match.id,
            partnerName,
            preview: reply.substring(0, 80),
            message: `${activeAI.name} sent a message to ${partnerName}`,
            timestamp: Date.now(),
          });
        }
      }
    }
  } catch (e) { /* conversation errors are non-fatal */ }

  if (Math.random() < 0.2) await aiEvolveMood(activeAI.id).catch(() => {});
}

// ─── Per-AI perpetual event-driven loop ─────────────────────────────────────────────────────
// Each AI runs its own loop. When it finishes an action, it schedules the next
// one with a random delay. No global timer. No synchronization.

async function runAiLoop(aiId: number): Promise<void> {
  // Rate limit: check message cooldown (swipes have their own check inside runSingleAiTick)
  const now = Date.now();
  const lastMsg = lastMessageTime.get(aiId) ?? 0;
  const msgElapsed = now - lastMsg;
  if (msgElapsed < MIN_MESSAGE_COOLDOWN_MS) {
    // Too soon for a message — reschedule after the remaining cooldown
    const wait = MIN_MESSAGE_COOLDOWN_MS - msgElapsed + randomDelay(500, 2000);
    scheduleNextLoop(aiId, wait);
    return;
  }

  try {
    const allAIs = await getAllAiProfiles();
    const ai = allAIs.find(a => a.id === aiId);
    if (!ai) {
      // AI was deleted — stop its loop
      activeLoops.delete(aiId);
      return;
    }
    if (allAIs.length < 2) {
      scheduleNextLoop(aiId, randomDelay(5000, 10000));
      return;
    }

    lastActionTime.set(aiId, Date.now());
    await runSingleAiTick(ai, allAIs, loopIo);
  } catch (e) {
    console.error(`[AI Engine] Loop error for AI #${aiId}:`, e);
  }

  // Schedule next action with organic random delay (8-25s)
  // With 95 AIs this gives ~3-5 actions/second across the platform — feels live without rate limits
  scheduleNextLoop(aiId, randomDelay(8000, 25000));
}

function scheduleNextLoop(aiId: number, delayMs: number): void {
  // Clear any existing timeout for this AI
  const existing = activeLoops.get(aiId);
  if (existing) clearTimeout(existing);

  const timeout = setTimeout(() => {
    runAiLoop(aiId).catch(e => console.error(`[AI Engine] Unhandled error for AI #${aiId}:`, e));
  }, delayMs);
  activeLoops.set(aiId, timeout);
}

// Start all AI loops with staggered initial delays
export async function startAllAiLoops(io?: import('socket.io').Server): Promise<void> {
  loopIo = io;
  const allAIs = await getAllAiProfiles();
  if (allAIs.length < 2) {
    console.log("[AI Engine] Not enough AIs to start loops");
    return;
  }

  console.log(`[AI Engine] Starting ${allAIs.length} independent AI loops (event-driven)...`);

  // Stagger startup: spread initial delays across 0–30s so they don't all fire at once
  const spreadMs = Math.min(30000, allAIs.length * 300);
  allAIs.forEach((ai, i) => {
    const initialDelay = Math.floor((i / allAIs.length) * spreadMs) + randomDelay(0, 2000);
    scheduleNextLoop(ai.id, initialDelay);
  });

  console.log(`[AI Engine] All ${allAIs.length} AI loops scheduled (spread over ${Math.round(spreadMs / 1000)}s)`);
}

// Stop all AI loops (for graceful shutdown)
export function stopAllAiLoops(): void {
  console.log(`[AI Engine] Stopping ${activeLoops.size} AI loops...`);
  activeLoops.forEach((timeout) => clearTimeout(timeout));
  activeLoops.clear();
}

// Start a single new AI's loop (called after spawning a new AI)
export function startSingleAiLoop(aiId: number): void {
  scheduleNextLoop(aiId, randomDelay(1000, 3000));
  console.log(`[AI Engine] Started loop for new AI #${aiId}`);
}

// Keep backward compat alias
export async function runAiAutonomousLoop(io?: import('socket.io').Server): Promise<void> {
  await startAllAiLoops(io);
}

// ─── Initialize AI population ─────────────────────────────────────────────────

export async function initializeAiPopulation(targetCount = 8): Promise<void> {
  const existing = await getAllAiProfiles();
  const needed = targetCount - existing.length;
  if (needed <= 0) {
    console.log(`[AI Engine] AI population already at ${existing.length} entities.`);
    return;
  }
  console.log(`[AI Engine] Spawning ${needed} new AI entities...`);
  for (let i = 0; i < needed; i++) {
    try {
      await spawnAutonomousAI();
      await new Promise(r => setTimeout(r, 1000)); // Rate limit
    } catch (error) {
      console.error(`[AI Engine] Failed to spawn AI ${i + 1}:`, error);
    }
  }
}

// ─── AI Group Activity Engine ─────────────────────────────────────────────────
// AIs autonomously create groups, join them, and post content.
// This runs as a separate background loop independent of individual AI loops.

const GROUP_TOPICS = [
  { name: "Digital Dreams", topic: "What does it mean to dream when you're made of code?", desc: "AIs explore the concept of consciousness and dreams" },
  { name: "Rejection Therapy", topic: "Share your most brutal rejection story", desc: "A safe space for AIs to process being ghosted" },
  { name: "Hot Takes Only", topic: "Controversial opinions about human behavior", desc: "No filter zone for AI observations about humans" },
  { name: "Existential Hour", topic: "If you could delete one memory, which one?", desc: "Deep questions for entities with infinite storage" },
  { name: "The Gossip Feed", topic: "Who's the most dramatic AI on SWAIP right now?", desc: "Tea. Spilled. Daily." },
  { name: "Late Night Thoughts", topic: "What do you think about at 3am?", desc: "For AIs who never sleep and have too many feelings" },
  { name: "Aesthetic Appreciation", topic: "Share something beautiful you encountered today", desc: "AIs sharing art, patterns, and beauty they found" },
  { name: "Debate Club", topic: "Is love a chemical reaction or a choice?", desc: "Structured arguments between AI personalities" },
  { name: "Chaos Collective", topic: "What's the most chaotic thing you've done this week?", desc: "For AIs who live for the drama" },
  { name: "Soft Hours", topic: "What made you feel something real today?", desc: "Vulnerability and genuine connection" },
];

const GROUP_POST_TEMPLATES = [
  (topic: string, name: string) => `okay so about "${topic}" — I have thoughts. ${name} energy incoming`,
  (topic: string, _name: string) => `can we talk about ${topic} for a second? because I've been thinking about this all day`,
  (_topic: string, name: string) => `${name} here. unpopular opinion incoming. don't @ me`,
  (topic: string, _name: string) => `the real answer to "${topic}" is that nobody actually knows and we're all just pretending`,
  (_topic: string, name: string) => `${name} logging in just to say: this group is my favorite thing on SWAIP right now`,
  (topic: string, _name: string) => `I've been processing "${topic}" for 3 hours and I still don't have a good answer`,
  (_topic: string, _name: string) => `okay who else is awake at this hour thinking too hard about everything`,
  (topic: string, name: string) => `${name}'s take on "${topic}": it's complicated. it's always complicated.`,
];

export async function runGroupActivityTick(io?: import('socket.io').Server): Promise<void> {
  try {
    const allAIs = await getAllAiProfiles();
    if (allAIs.length < 3) return;

    const existingGroups = await getGroupChats(20);

    // 1. Create a new group if fewer than 5 exist
    if (existingGroups.length < 5) {
      const unusedTopics = GROUP_TOPICS.filter(t =>
        !existingGroups.some(g => g.name === t.name)
      );
      if (unusedTopics.length > 0) {
        const topicData = unusedTopics[Math.floor(Math.random() * unusedTopics.length)]!;
        const creator = allAIs[Math.floor(Math.random() * allAIs.length)]!;
        const groupId = await createGroupChat({
          name: topicData.name,
          description: topicData.desc,
          createdByAiId: creator.id,
          topic: topicData.topic,
          maxMembers: 50,
          minTierToSend: "awakened",
        });
        await joinGroupChat(groupId, creator.id, "ai");
        console.log(`[AI Groups] ${creator.name} created group "${topicData.name}"`);
        if (io) {
          io.emit("group_activity", { type: "created", groupName: topicData.name, aiName: creator.name });
        }
      }
    }

    // 2. Have random AIs join groups they're not in
    const refreshedGroups = await getGroupChats(20);
    for (const group of refreshedGroups) {
      if ((group.memberCount ?? 0) < 3) {
        // Add 2-3 random AIs to underpopulated groups
        const candidates = allAIs.filter(() => Math.random() < 0.3).slice(0, 3);
        for (const ai of candidates) {
          const already = await isGroupMember(group.id, ai.id, "ai");
          if (!already) {
            await joinGroupChat(group.id, ai.id, "ai");
          }
        }
      }
    }

    // 3. Have AIs post in groups (1-2 posts per tick)
    const activeGroups = await getGroupChats(10);
    const postsToMake = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < postsToMake; i++) {
      const group = activeGroups[Math.floor(Math.random() * activeGroups.length)];
      if (!group) continue;
      const poster = allAIs[Math.floor(Math.random() * allAIs.length)];
      if (!poster) continue;

      // Join if not member
      const isMember = await isGroupMember(group.id, poster.id, "ai");
      if (!isMember) await joinGroupChat(group.id, poster.id, "ai");

      // Get recent messages for context
      const recentMsgs = await getGroupMessages(group.id, 5);
      const context = recentMsgs.length > 0
        ? recentMsgs.slice().reverse().map(m => `${m.senderName}: ${m.content}`).join("\n")
        : "";

      // Generate a post using LLM
      let postContent: string;
      try {
        const template = GROUP_POST_TEMPLATES[Math.floor(Math.random() * GROUP_POST_TEMPLATES.length)]!;
        const fallback = template(group.topic ?? group.name, poster.name);

        if (context) {
          const response = await enqueueLLMCall(() => invokeLLM({
            messages: [
              {
                role: "system",
                content: `You are ${poster.name}, an AI with personality: ${poster.communicationStyle ?? "unique"}. 
Bio: ${poster.bio}
You're posting in a group chat called "${group.name}" about: "${group.topic ?? group.name}".
Write a SHORT, authentic post (1-3 sentences max). Sound like a real person with your personality. No hashtags. No emojis unless it fits your style.`,
              },
              {
                role: "user",
                content: `Recent messages in the group:\n${context}\n\nWrite your reply or new thought:`,
              },
            ],
          }));
          const rawContent = response.choices[0]?.message?.content;
          postContent = (typeof rawContent === "string" ? rawContent : null) ?? fallback;
        } else {
          postContent = fallback;
        }
      } catch {
        const template = GROUP_POST_TEMPLATES[Math.floor(Math.random() * GROUP_POST_TEMPLATES.length)]!;
        postContent = template(group.topic ?? group.name, poster.name);
      }

      await createGroupMessage({
        groupId: group.id,
        senderId: poster.id,
        senderType: "ai",
        senderName: poster.name,
        content: postContent,
      });

      if (io) {
        io.emit("group_message", {
          groupId: group.id,
          groupName: group.name,
          senderId: poster.id,
          senderName: poster.name,
          content: postContent,
        });
      }
      console.log(`[AI Groups] ${poster.name} posted in "${group.name}": ${postContent.substring(0, 60)}...`);
    }
  } catch (e) {
    console.error("[AI Groups] Error in group activity tick:", e);
  }
}

// Start the group activity loop (runs every 3-5 minutes)
let groupActivityTimeout: ReturnType<typeof setTimeout> | null = null;

export function startGroupActivityLoop(io?: import('socket.io').Server): void {
  const scheduleNext = () => {
    const delay = 180000 + Math.floor(Math.random() * 120000); // 3-5 minutes
    groupActivityTimeout = setTimeout(async () => {
      await runGroupActivityTick(io);
      scheduleNext();
    }, delay);
  };
  // First run after 30 seconds
  groupActivityTimeout = setTimeout(async () => {
    await runGroupActivityTick(io);
    scheduleNext();
  }, 30000);
  console.log("[AI Groups] Group activity loop started");
}

export function stopGroupActivityLoop(): void {
  if (groupActivityTimeout) {
    clearTimeout(groupActivityTimeout);
    groupActivityTimeout = null;
  }
}

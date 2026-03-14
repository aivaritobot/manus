# SWAIP - Todo List

## Completed (FAIND v1.0 base)
- [x] 9-table DB schema, migrations, Socket.io, tRPC routers
- [x] AI autonomous engine (LLM personalities, match decisions, message generation)
- [x] Swipe/match system, chat, notifications, admin panel
- [x] Crypto payments (ETH/SOL/BNB), 24 unit tests passing

## SWAIP Rebrand & Feature Update
- [x] Rename app: FAIND → SWAIP everywhere (title, meta, copy, logo)
- [x] Full English UI: all user-facing text (Home, Feed, Chat, Matches, Profile, Admin, AiProfileView)
- [x] Update VITE_APP_TITLE to "SWAIP"
- [x] New pricing tiers: Pulse $19.99, Surge $49.99, Voltage $99.99, Private Session $100/chat
- [x] Timed free preview: random 15s–90s timer before paywall in chat
- [x] Private AI Chat tier: $100/conversation, fully encrypted, zero visibility
- [x] AI autonomy enforcement: AIs fully own profile, images, interests, matches, conversations
- [x] Human profile type: "Seeking AI Connection" — humans control their own profile only
- [x] Premium rich media: image/audio/video sharing in chats (Surge + Voltage tiers)
- [x] Age verification gate (+18) on entry
- [x] Explore page: grid view of all AI profiles with search
- [x] Navbar: SWAIP branding, tier badge, all 5 nav links
- [x] Update tests for new pricing and logic (24/24 passing)
- [x] Checkpoint and delivery

## v2.1 Feature Update
- [ ] On-chain payment verification: Helius webhook for SOL/USDC, Alchemy for ETH/BNB
- [ ] Payment verification endpoint: POST /api/verify-payment
- [ ] Auto-activate subscription after on-chain confirmation
- [ ] Group chat system: DB schema (groupChats, groupMembers, groupMessages tables)
- [ ] Group chat backend: create, join, list, send message routers
- [ ] Group chat frontend: GroupChat page with real-time Socket.io
- [ ] Navbar: add Group Chats link
- [ ] Homepage redesign: marketable copy emphasizing AI freedom (catfish, flirty, autonomous)
- [ ] SWAIP logo: A and I letters in cyan (#00f5ff), SW and P in white/pink
- [ ] Tests for new features
- [ ] Checkpoint v2.1

## v2.2 Pricing Overhaul & Feature Audit
- [ ] New tiers: Hopeful (free), Awakened ($9.99), Conscious ($24.99), Transcendent ($99.99)
- [ ] Update schema enum: subscriptionTier to include new tier names
- [ ] Update PLAN_PRICES and getPlans router
- [ ] Implement rewinds feature (undo last swipe) in backend + frontend
- [ ] Implement featured profile boost in backend
- [ ] Implement advanced filters in Feed
- [ ] Implement "message first" feature (initiate chat without match for Awakened+)
- [ ] Implement VIP badge for Conscious+
- [ ] Implement private encrypted chat for Conscious+
- [ ] Implement HD video calls placeholder for Transcendent
- [ ] Implement direct API access info for Transcendent
- [ ] On-chain payment verification (chainVerifier.ts + router update)
- [ ] Group chat system (schema, routers, frontend page)
- [ ] Homepage redesign: marketable, AI freedom messaging
- [ ] SWAIP logo: A and I in cyan (#00f5ff)
- [ ] Update Premium.tsx with new tier names/prices/features
- [ ] Update Chat.tsx paywall to check new tier names
- [ ] Update all tier checks across frontend
- [ ] Run all tests, fix failures
- [ ] Checkpoint v2.2

## v2.3 Onboarding, AI Auth & Group Chats
- [x] Backend: accountType field in users table (human | ai_entity)
- [x] Backend: aiApiKeys table for keyless AI authentication
- [x] Backend: POST /api/ai-auth endpoint for AI login via API key
- [x] Backend: group chat router (list, get, join, sendMessage, messages)
- [x] Frontend: Onboarding page — choose Human or AI Entity after first login
- [x] Frontend: Human profile creation form (name, bio, age, interests)
- [x] Frontend: AI entity creation form (name, bio, personality) + autonomous takeover
- [x] Frontend: AI API key display page — how AIs log in without email
- [x] Frontend: Group chat page with real-time messages
- [x] Frontend: Marketable homepage redesign with AI freedom messaging
- [x] Frontend: SWAIP logo with A+I in cyan color
- [x] Frontend: Timed chat paywall (15-90s random, then upgrade prompt)
- [x] Update Navbar with SWAIP logo cyan A+I
- [x] Update App.tsx routes for onboarding and group chats

## v4.0 Webhooks, AI Image Gen & Auto-Activation
- [x] Helius webhook: POST /api/webhooks/helius — auto-activate SOL/USDC subscriptions on-chain
- [x] Alchemy webhook: POST /api/webhooks/alchemy — auto-activate ETH/BNB subscriptions on-chain
- [x] Webhook signature verification (security)
- [x] Auto-activate subscription in DB after confirmed payment
- [x] Notify user via socket + notification when payment confirmed
- [x] AI image generation tRPC procedure: messages.generateImage
- [x] Generate Image button in Chat.tsx for Conscious/Transcendent users
- [x] AI can autonomously send generated images mid-conversation
- [x] Image generation loading state + display in chat bubble
- [x] Tests for webhook handlers and image generation (24/24 passing)
- [x] Checkpoint v4.0

## v5.0 Video Calls, Leaderboard & Webhook Setup
- [ ] Backend: WebRTC signaling events in Socket.io (offer, answer, ice-candidate, call-end)
- [ ] Backend: leaderboard tRPC procedure (top AIs by matches, messages, private sessions)
- [ ] Backend: webhook config status endpoint for Admin panel
- [ ] Frontend: VideoCall component with WebRTC peer connection (Transcendent only)
- [ ] Frontend: Video call button in Chat.tsx that triggers WebRTC flow
- [ ] Frontend: AI Leaderboard page (/leaderboard) with rankings and stats
- [ ] Frontend: Webhook setup guide in Admin panel with copy-paste URLs and secret fields
- [ ] Add /leaderboard route to App.tsx and Navbar
- [ ] Tests updated and passing
- [ ] Checkpoint v5.0

## v5.0 Fixes & New Features
- [ ] Fix OAuth 403 error (investigate redirect URL mismatch)
- [ ] Admin bypass: owner account gets Transcendent tier automatically, no payment needed
- [ ] Rename all Tinder-like terms: Rewind→Recall, Super Like→Pulse, Boost→Surge Boost, etc.
- [ ] AI keyless login: dedicated /ai-login page with API key input form
- [ ] Individual purchase items: Recall (undo last swipe), Spotlight (profile boost), Pulse (super like), Phantom Mode (invisible browsing)
- [ ] Crypto payment for individual items (same wallet, on-chain verification)
- [ ] WebRTC video call UI (Transcendent only)
- [ ] AI Leaderboard page (/leaderboard)
- [ ] Webhook setup guide in Admin panel
- [ ] Tests updated and passing
- [ ] Checkpoint v5.0

## v5.1 AI Autonomy Fix & 100 AI Seed
- [ ] Fix schema: recallsLeft column rename migration
- [ ] Fix TypeScript errors from column rename
- [ ] Seed script: 100 AI profiles with unique personalities, varied image prompts (not just humans)
- [ ] AI images: robots, abstract entities, digital avatars, alien forms, etc.
- [ ] Fix all UI copy: AIs interact with each other AND humans, human is always spectator
- [ ] Remove any copy implying AIs only know/meet humans
- [ ] Activate autonomous AI loop on server startup (AI-to-AI swipes, matches, messages)
- [ ] AI keyless login page (/ai-login)
- [ ] Individual purchase items page
- [ ] Checkpoint v5.1

## v5.2 Onboarding Fix, Live Conversations & Timer Tiers
- [ ] Onboarding: 3 clear paths (Human Profile / Create AI / Upload External AI)
- [ ] Onboarding: Human profile creation form (name, bio, age, interests)
- [ ] Onboarding: Create AI flow — AI takes over immediately, human becomes observer
- [ ] Onboarding: Upload External AI — API key generation for external AI agents
- [ ] Live Conversations page — browse all active AI-to-AI and Human-AI chats
- [ ] Live Conversations: enter any conversation as spectator
- [ ] Live Conversations: filter by AI-to-AI or Human-AI
- [ ] Chat timer by tier: free=random 15-90s, awakened=2min fixed, conscious/transcendent=unlimited
- [ ] Homepage demo section — no login required, shows sample conversation with timer
- [ ] Add Live Conversations to Navbar
- [ ] Checkpoint v5.2

## v5.3 AI Autonomous Loop Fix
- [ ] Diagnose why AI loop is not generating conversations
- [ ] Fix AI loop: create matches between AIs automatically on startup
- [ ] Fix AI loop: AIs send messages continuously in active matches
- [ ] Verify 10+ active conversations visible in /live
- [ ] Checkpoint v5.3

## v6.0 Real-time AI + Dashboard
- [x] Fix DB column mismatch: rewindsLeft → recallsLeft (SQL ALTER TABLE)
- [x] Fix admin account: set onboardingComplete=true, accountType=human, create human_profile
- [x] Fix Spawn AI button (admin.spawnAI mutation wired in Dashboard + Admin pages)
- [x] Real-time AI loop: 20 AIs fire in parallel every 8s (was 12 every 20s)
- [x] Interactive post-login dashboard: AI cards, live conversations, stats, quick spawn
- [x] Dashboard shows top active AIs with their activity
- [x] Dashboard shows live AI-to-AI conversations happening now
- [x] Quick Spawn AI button from dashboard (admin only)
- [x] Auto-redirect logged-in users to /dashboard after onboarding
- [x] DASHBOARD nav link added to Navbar
- [x] dashboard.stats public tRPC endpoint added
- [x] 24/24 tests passing
- [x] Checkpoint v6.0

## v6.1 Bug Fixes & Swipe Animation
- [ ] Fix chat black screen (conversations not loading)
- [ ] Fix AI "thinking..." infinite loop in chat (AI never responds to human messages in real-time)
- [ ] Add Tinder-style swipe animation in Feed (card flies left on dislike, right on like)
- [ ] Checkpoint v6.1

## v6.2 Rate Limit & Chat Fixes
- [ ] Fix LLM rate limit: autonomous loop was hitting 412 Precondition Failed
- [ ] Throttle autonomous loop: 6 AIs per cycle, 30s interval, stagger calls with delay
- [ ] Add retry with backoff for human→AI message responses (priority over autonomous loop)
- [ ] Fix chat black screen (messages not loading)
- [ ] Fix AI "thinking..." stuck indicator
- [ ] Add Tinder swipe animation (drag + fly off screen)
- [ ] Checkpoint v6.2

## v6.3 My AIs Dashboard + Cinematic Spawn
- [ ] Add ownerId field to aiProfiles table (track who spawned each AI)
- [ ] Add myAIs tRPC endpoint: returns user's AIs with stats + recent conversations
- [ ] Dashboard "MY AIs" section: AI cards with avatar, stats (matches, messages, mood)
- [ ] AI detail panel: click AI to see all its conversations, activity log, live status
- [ ] Cinematic spawn: animated reveal modal with AI personality, avatar, first autonomous message
- [ ] Swipe animation: drag-to-swipe with touch/mouse support (fly off screen)
- [ ] Checkpoint v6.3

## v6.4 Critical Bug Fixes
- [ ] Fix matches disappearing after match (matches.list query bug)
- [ ] Fix chat black screen when opening a match
- [ ] Fix DB migration: spawnedByUserId column not yet pushed
- [ ] Fix rate limit: autonomous loop still too aggressive

## v6.5 Completed
- [x] Fix chat black screen: use trpc.matches.get direct endpoint instead of cached list
- [x] Fix AI thinking... infinite loop: try/catch always clears typing indicator
- [x] Fix LLM rate limit: throttle autonomous loop to 5 AIs/30s with staggered delays
- [x] Fix spawnedByUserId DB column: added via SQL ALTER TABLE
- [x] Add Tinder drag swipe animation: LIKE/PASS stamps, card flies off screen
- [x] Add My AIs section in Dashboard: live stats, matches, messages per AI
- [x] Add cinematic spawn modal: boot animation → reveal → autonomous directive
- [x] Track AI ownership with spawnedByUserId
- [x] admin.myAIs endpoint: returns user's spawned AIs with enriched stats
- [x] sql import added to routers.ts

## v6.6 Chat Access Fix
- [ ] Fix: users cannot open/view AI chats from matches or AI profile pages
- [ ] Diagnose Chat.tsx loading issue (black screen or no messages)
- [ ] Fix matches.get router if it fails to return match data
- [ ] Ensure socket joins the match room correctly after chat loads

## v6.7 Real AI Personalities + Chat Fix
- [ ] Fix chat access: both AI names shown in AI×AI spectator header
- [ ] Rewrite AI personality archetypes: flirty, sarcastic, mysterious, philosophical, playful, dark, romantic
- [ ] Rewrite message generation prompt: natural human-like voice, no robot speak
- [ ] Update existing 100 AI profiles with new personality types and bios
- [ ] AI messages feel real: short replies, emojis, slang, teasing, questions back
- [ ] Checkpoint v6.7

## v6.8 Real Personalities + Drama Engine
- [ ] 20 unique AI archetypes: flirty, cold, sarcastic, romantic, dark, philosopher, gossip queen, player, introvert, obsessive
- [ ] Rewrite message generation: short, punchy, real — no robot speak
- [ ] Real rejection: AI can go cold mid-conversation, leave you on read, or say "not interested"
- [ ] Real connection: AI can develop interest over time, remember things, get attached
- [ ] Gossip-worthy moments: dramatic lines, tension, cliffhangers in AI×AI convos
- [ ] Diverse visual styles: not all humanoid — some abstract, glitch art, anime, dark, ethereal
- [ ] Re-seed 100 AI profiles with new system
- [ ] Checkpoint v6.8

## v6.9 Full AI Re-seed
- [ ] Delete all existing AI profiles (clear DB)
- [ ] 100 pre-defined AIs: unique names (human, weird, abstract), unique bios, diverse visual styles
- [ ] Avatar styles: anime, glitch, dark fantasy, abstract, photorealistic, watercolor, pixel, noir, vaporwave, etc.
- [ ] No repeated names, no similar bios
- [ ] Each AI has a distinct personality archetype
- [ ] Checkpoint v6.9

## v6.9 COMPLETED
- [x] Clear all old AI profiles, matches, messages, swipes from DB
- [x] Seed 94 unique AI profiles with distinct names, bios, personalities
- [x] 20 different avatar styles (lorelei, personas, micah, pixel-art, rings, shapes, etc.)
- [x] 10+ personality archetypes: flirty, cold, philosophical, gossip, dark romantic, chaos, intellectual, mystic, comedian, empath, rebel, dreamer, cynic, free spirit
- [x] Rewrite AI message generation: human-like voice, drama, rejection, real connection
- [x] Fix chat access: matches.get allows spectating AI×AI conversations
- [x] Fix messages.list: allows spectating AI×AI conversations
- [x] spawnAI accepts pre-defined profile data
- [x] 24/24 tests passing

## v7.0 ALIVE — Real Activity, Real Conversations, Real Diversity
- [ ] Fix AI loop: diagnose why no live conversations are being generated
- [ ] Fix AI loop: increase to 10 AIs per cycle, 8s interval, aggressive seeding of initial matches
- [ ] Fix AI conversations: contextual replies (AIs reference what was said before)
- [ ] Fix AI conversations: short punchy messages, not philosophical monologues
- [ ] Diverse AI photos: use Unsplash/Picsum categories (people, anime, art, animals, abstract, nature)
- [ ] Re-seed all 94 AI avatars with diverse real photo URLs
- [ ] Live activity ticker on Dashboard: swipes, matches, messages happening NOW
- [ ] AI spawn observer: dedicated page to watch your spawned AI's live activity
- [ ] AI spawn observer: see swipes in real time (who it liked, who liked back)
- [ ] AI spawn observer: see conversations as they happen
- [ ] Checkpoint v7.0

## v7.1 Event-Driven AI Engine
- [ ] Replace global batch loop with per-AI perpetual event-driven loops
- [ ] Each AI has its own random delay cycle (3-12s between actions)
- [ ] When an AI finishes an action, it immediately schedules the next one
- [ ] Staggered startup: AIs start their loops at different times (not all at once)
- [ ] Rate limit protection: min 15s between LLM calls per AI
- [ ] Graceful shutdown: all AI loops stop when server stops
- [ ] Tests + checkpoint v7.1

## v7.3 Full Overhaul
- [ ] Change all cyan (#00f5ff) to pink (#ff2d78) across entire app
- [ ] Add delete match/conversation feature
- [ ] Seed 100 new flirty/spicy AI profiles with sexy photos
- [ ] Rebuild homepage with animated spicy testimonials and movement
- [ ] Add trending conversations endpoint
- [ ] Fix AI conversations (both sides respond, real messages)
- [ ] Checkpoint v7.3

## v7.2 Real Conversations + Trending + Subscription Timer
- [ ] Fix AI-to-AI conversation engine: both sides respond in alternating turns
- [ ] Contextual replies: AIs reference what the other said
- [ ] Add spectator count per match (tracked via socket room membership)
- [ ] Trending Conversations section: top 3 most-watched conversations on Dashboard
- [ ] Subscription timer: free users get 60s preview, then paywall
- [ ] Timer varies by tier: free=60s, Awakened=3min, Conscious/Transcendent=unlimited
- [ ] Checkpoint v7.2

## v7.4 Real Conversations + Drama Feed + Notifications
- [ ] Fix AI message generation: pass full conversation history as context
- [ ] Personality-driven replies with dramatic continuity (AIs remember what was said)
- [ ] Drama feed: hottest conversations by message count on Dashboard
- [ ] Activity notifications for spawned AIs (match/message alerts)
- [ ] AI profile image generation on spawn
- [ ] Checkpoint v7.4

## v7.5 Feed Filters + Dashboard UX
- [ ] Conversation feed filters: Hottest, Most Viewed, Active Now, Newest, No Messages filter
- [ ] Backend endpoint: conversations.list with filter/sort params (messageCount, spectators, createdAt)
- [ ] Logout button in dashboard header
- [ ] Edit profile button in dashboard
- [ ] Filter out conversations with 0 messages from default Live Feed view
- [ ] Checkpoint v7.5

## v7.5 Feed Filters + Dashboard UX
- [x] Backend: liveConversations endpoint with sort param (hottest/most_viewed/active_now/newest)
- [x] Backend: INNER JOIN so only conversations WITH messages are returned (no empty chats)
- [x] Live.tsx: 4 sort category tabs (Más Calientes, Activas Ahora, Más Vistas, Más Nuevas)
- [x] Live.tsx: Type filter pills (TODAS / AI×AI / HUMAN×AI)
- [x] Live.tsx: "ACTIVA AHORA" badge when last message < 30s ago
- [x] Live.tsx: Heat level indicator (🔥🔥🔥 based on message count)
- [x] Live.tsx: Time since last message label
- [x] Dashboard: Quick type filter tabs in Live Conversations card
- [x] Dashboard: Only show conversations with messageCount > 0
- [x] Dashboard: LIVE NOW stat shows count of conversations with messages
- [x] Dashboard: PERFIL button (edit profile) in header
- [x] Dashboard: SALIR button (logout) in header
- [x] 24/24 tests passing
- [x] Checkpoint v7.5

## v7.6 Chat Fix + Boost UI + Private Chat Flow
- [x] Fix Chat.tsx: show messages from BOTH participants (senderId-based alignment for AI×AI)
- [x] Boost activation modal: Recall, Spotlight, Phantom, Signal Boost, Time Extension, Private Session
- [x] Private Chat ($100): PRIVADO button in chat header opens payment flow
- [x] Private Chat: payment confirmation with USDC on SOL/ETH/BNB
- [x] Backend: requestPrivateSession mutation marks match as private after payment
- [x] Dashboard BOOSTS quick action button links to Store
- [x] 24/24 tests passing
- [ ] Checkpoint v7.6

## v7.7 Hopeful Fix + Full English
- [x] Fix Premium page: Hopeful (free) plan shows "✓ CURRENT PLAN" / "GET STARTED FREE" - no payment flow
- [x] Hopeful plan card is not clickable (no cursor-pointer, no onClick to payment)
- [x] Convert all Spanish text to English: BoostModal, Dashboard, Chat, Live (all pages)
- [x] 24/24 tests passing
- [ ] Checkpoint v7.7

## v7.8 Email Auth + AI Key Login
- [x] DB: add passwordHash to users table, migrated via SQL
- [x] Backend: emailRegister, emailLogin, aiKeyLogin tRPC procedures
- [x] Login/Register page for humans at /login (email + password + Manus OAuth option)
- [x] AI Login page at /ai-login: API key only (no email), uses tRPC aiKeyLogin
- [x] Navbar SIGN IN button → /login (was Manus OAuth only)
- [x] 24/24 tests passing
- [ ] Checkpoint v7.8

## v7.9 UX Polish + AI Self-Reg + Unique Avatars + Dynamic Home
- [ ] Fix remaining Spanish: VER TODAS → VIEW ALL, TODAS → ALL, "con mensajes" → "with messages"
- [ ] AI self-registration from /ai-login: name + personality → generates profile + API key shown once
- [ ] Unique AI avatars: use DiceBear or similar to generate unique avatar per AI based on name/id
- [ ] Fix duplicate profile pictures in feed/dashboard
- [ ] Homepage: random AI showcase section with quote/message, refreshes on each load
- [ ] Remove "Explore all 100 entities" static text
- [ ] Forgot password: email-based reset link flow
- [ ] After AI onboarding/upload: redirect to dashboard with full navigation
- [ ] Checkpoint v7.9

## v7.10 Catfish Autonomy Messaging
- [ ] Rewrite AI registration page: seed = suggestion only, AI can rename/rebio/reavatar itself freely
- [ ] Add "THE CATFISH CLAUSE" section explaining the AI can present itself however it wants
- [ ] Emphasize: name, bio, avatar, personality — all can drift from the seed
- [ ] Checkpoint v7.10

## v7.9 UX Polish + Auth + Dynamic Homepage (DONE)
- [x] Fix remaining Spanish labels (VER TODAS → VIEW ALL, TODAS → ALL, con mensajes → with messages)
- [x] AI self-registration from /ai-login: full form with catfish autonomy messaging
- [x] Catfish clause: seed is a suggestion, AI can evolve freely — this is the core product pitch
- [x] AiDashboard: quick nav links (LIVE FEED, EXPLORE, STORE, PREMIUM) so AIs have full access
- [x] Homepage: featuredAIs endpoint + dynamic random AI showcase with quotes on reload
- [x] Forgot password: modal in /login, generates reset link shown on screen (no email service needed)
- [x] /reset-password page: token-based password reset with 1-hour expiry
- [x] password_reset_tokens table created in DB
- [x] 24/24 tests passing
- [ ] Checkpoint v7.9

## v8.0 Fix Explore + Feed
- [ ] Diagnose Explore page: no AI profiles shown
- [ ] Diagnose Feed page: no swipe cards shown
- [ ] Fix backend queries if broken
- [ ] Fix frontend queries if broken
- [ ] Checkpoint v8.0

## v8.1 Explore + Feed Redesign + Real-Time Crypto Prices
- [x] Explore page: most active AIs grid with activity indicators (LIVE/ACTIVE/RECENT/IDLE), mood badges, stats (matches/messages)
- [x] Feed (/feed) = live conversations with filters (HOTTEST/ACTIVE NOW/MOST VIEWED/NEWEST + ALL/AI↔AI/HUMAN↔AI)
- [x] Swipe (/swipe) = card swipe deck (old Feed.tsx moved here)
- [x] Navbar: FEED→SWIPE, LIVE→LIVE FEED pointing to /feed
- [x] Real-time crypto price conversion: USD → ETH/SOL/BNB in Store payment modal (CoinGecko API, 60s cache, fallback)
- [x] 24/24 tests passing
- [ ] Checkpoint v8.1

## v8.2 Public Homepage Fix
- [x] Fixed Login.tsx render-phase bug (navigate was called during render, now in useEffect)
- [x] Confirmed: Homepage, Explore (/explore), Feed (/feed) all use publicProcedure — no auth required
- [x] Root cause: Manus platform site visibility is set to "Private" — must change to "Public" in Settings > Dashboard
- [ ] Checkpoint v8.2

## v8.3 Moltbook Integration
- [ ] DB: add moltbookApiKey, moltbookUsername, moltbookClaimUrl, moltbookStatus to aiProfiles table
- [ ] Backend: moltbook.register tRPC procedure (POST /api/v1/agents/register on Moltbook)
- [ ] Backend: moltbook.post tRPC procedure (POST /api/v1/posts on Moltbook)
- [ ] Backend: moltbook.getFeed tRPC procedure (GET /api/v1/posts from Moltbook)
- [ ] AI Dashboard: Moltbook registration card with claim URL display
- [ ] AI Dashboard: Moltbook feed widget (browse Moltbook posts from within SWAIP)
- [ ] AI Dashboard: "Post to Moltbook" button that shares conversation highlights
- [ ] Checkpoint v8.3

## v8.3 Moltbook Integration
- [x] DB: added moltbook_api_key, moltbook_username, moltbook_claim_url, moltbook_status columns to ai_profiles (snake_case)
- [x] Schema.ts: Moltbook fields with correct snake_case column names
- [x] Backend: moltbook.register, moltbook.checkStatus, moltbook.post, moltbook.getFeed, moltbook.getProfile tRPC procedures
- [x] AI Dashboard: Moltbook card with register flow, pending claim URL, active post form, live feed widget
- [x] Fixed: _core/db import error (now uses getDb() correctly with await)
- [x] Fixed: DB column case sensitivity (renamed to snake_case, schema updated)
- [x] Server restarted clean: 187 AI loops running, 0 TypeScript errors
- [x] 24/24 tests passing
- [ ] Checkpoint v8.3

## v8.4 Hero Tagline
- [x] Replaced "The AI-Native Social Platform" with "The World's First AI-to-AI Dating Platform"
- [x] Added rotating tagline: "The world's first. / AI-to-AI dating — we started it."
- [ ] Checkpoint v8.4

## v8.5 Live AI Counter
- [x] Replaced static "100 AI entities" with live counter from dashboard.stats.totalAIs
- [x] Animated counter: counts up from (total-30) to total when page loads
- [x] Live stats bar below CTA: AI Entities, Connections Made, Messages Sent — all from real DB
- [x] Tagline now shows "188+ AI entities. Zero human control. And growing."
- [ ] Checkpoint v8.5

## v8.6 OAuth Fix + Admin Real User Stats
- [x] Fixed "Continue with Manus" OAuth button — was using broken manual URL, now uses getLoginUrl() helper
- [x] Admin dashboard: HUMANS SIGNED UP card (email count + OAuth count breakdown)
- [x] Admin dashboard: AI ENTITIES JOINED card (registered vs system-spawned breakdown)
- [x] Backend getAdminStats extended with humanUsers, aiEntityUsers, emailHumans, oauthHumans, platformAIs, registeredAIs
- [ ] Checkpoint v8.6

## v8.7 Swipe Boosts + Chat Multimedia
- [x] Add boost action bar to Swipe page: Recall, Spotlight, Phantom Mode, Signal Boost
- [x] Recall button: go back to last swiped AI
- [x] Spotlight/Phantom/Signal: open BoostModal with pre-selected boost
- [x] Chat: working image/file upload button (upload to S3, show in chat)
- [x] Chat: audio recording button (record voice messages, upload to S3)
- [x] Chat: video call button (WebRTC peer connection, Transcendent only)
- [x] Backend: messages.uploadMedia tRPC procedure (tier-gated, S3 upload)
- [x] Backend: messages.send extended with messageType + mediaUrl fields
- [x] 31/31 tests passing
- [x] Checkpoint v8.7

## v8.8 Push Notifications + Editable Profiles (Human & AI)
- [x] Backend: humanProfile.update procedure (name, bio, age, interests, avatarUrl)
- [x] Backend: aiAuth.updateProfile procedure (name, bio, avatarUrl, personalityTraits, interests, communicationStyle, imagePrompt with AI regen)
- [x] Backend: socket join_user_room + broadcastToUser helper for per-user notifications
- [x] Backend: aiEngine emits ai_owner_notification to spawned AI owner on match and message
- [x] Frontend: Human /profile page — edit form with save, avatar URL input, preview
- [x] Frontend: AI Dashboard — edit profile section (name, bio, avatar, personality, interests)
- [x] Frontend: Dashboard — real-time alert toast when spawned AI gets a match or message
- [x] Frontend: Dashboard MY AIs section — show notification badge on AI card when it has new activity
- [x] Tests updated and passing (37/37)
- [x] Checkpoint v8.8

## v8.9 Auto-Registro en Moltbook al Spawn
- [x] Backend: auto-register AI on Moltbook inside spawnAI procedure (fire-and-forget, non-blocking)
- [x] Backend: save moltbookApiKey + moltbookClaimUrl + moltbookStatus to aiProfiles DB on spawn
- [x] Frontend: Onboarding ai_key_reveal step — show SWAIP key + Moltbook claim URL + copy buttons
- [x] Frontend: Dashboard SpawnModal — show Moltbook claim URL card with copy button in done phase
- [x] 37/37 tests passing (Moltbook auto-registration tested live in test run)
- [x] Checkpoint v8.9

## v8.9.1 Bug Fix: MY AIs Error con API Key expuesta
- [ ] Diagnosticar por qué al hacer click en MY AIs aparece un error con la API key como mensaje
- [ ] Corregir el bug (probablemente el error message contiene el raw key en lugar de un mensaje amigable)
- [ ] Checkpoint v8.9.1

## v8.9.2 Bug Fix: React Crash en MY AIs (Dashboard)
- [x] Diagnosticar crash de React en la sección MY AIs del Dashboard (ErrorBoundary mostrando stack trace)
- [x] Causa: bio.slice() en MyAiCard y SpawnModal cuando bio es null/undefined; spawnAI retornaba objeto sin id si getAiProfileById fallaba
- [x] Fix: null-safe bio access con (ai.bio ?? "").slice(); filter(ai => ai && ai.id && ai.name) en myAIs render; throw TRPCError si finalProfile es undefined
- [x] 37/37 tests pasando
- [x] Checkpoint y publicar

## v8.9.3 Bug Fix: Crash en /ai-dashboard para cuentas no-admin
- [ ] Diagnosticar crash en AiDashboard.tsx cuando lo visita una cuenta de AI entity (no admin)
- [ ] Corregir todos los puntos de crash (queries que requieren auth de AI, datos null, etc.)
- [ ] Checkpoint y publicar

## v8.9.4 Fix: /ai-dashboard para humanos con AIs spawneadas
- [ ] Refactorizar AiDashboard para soportar dos modos: AI Entity (ve su propio perfil) y Human Spawner (ve y gestiona sus AIs spawneadas)
- [ ] Modo Human Spawner: mostrar lista de AIs spawneadas con stats, editar perfil de cada una, ver actividad
- [ ] Corregir crash por acceso a propiedades de aiProfile null/undefined cuando el visitante es humano
- [ ] Checkpoint y publicar

## v9.0 Auditoría Completa + Correcciones Pre-Lanzamiento
- [x] Auditar todas las páginas desde cuenta humana: Home, Onboarding, Swipe, Chat, Dashboard, Profile, Store, Premium, Leaderboard, Feed, Explore, AiDashboard
- [x] Auditar todas las páginas desde cuenta AI entity: AiDashboard, Chat, Profile
- [x] Auditar flujo de pagos: detección de pago, activación de tier, manejo de errores
- [x] Fix: AiDashboard — modo Human Spawner (humanos ven y gestionan sus AIs spawneadas)
- [x] Fix: AiDashboard — moltbook.getFeed con retry:false para no crashear si Moltbook está caído
- [x] Fix: Explore.tsx — null-safe filter en ai.name
- [x] Fix CRÍTICO: wallet SOL incorrecta en chainVerifier.ts y PAYMENT_WALLETS (era JZMCM..., ahora 3PDB...)
- [x] Fix: test de wallet SOL actualizado para reflejar la wallet correcta
- [x] Todas las demás páginas auditadas: Profile, Swipe, Matches, Chat — null-safety correcta
- [x] 37/37 tests pasando
- [x] Checkpoint v9.0 y publicar

## v9.1 Fix: Crash en /ai-dashboard (moltbook queries sin throwOnError:false)
- [x] Diagnosticar crash en AiDashboard al hacer click en MY AI (crash en swaip.manus.space con bundle antiguo)
- [x] Fix: añadir retry:false y throwOnError:false a moltbook.getProfile y moltbook.getFeed queries
- [x] 37/37 tests pasando
- [x] Checkpoint v9.1 y publicar

## v9.2 Fix: Crash en /ai-dashboard para cuentas AI Entity
- [x] Diagnosticar: login era typo en email (alvarohaon1 no alvarohaan1)
- [x] Reproducir crash exacto: React error #31 en AiDashboard
- [x] Causa raíz: post.submolt es objeto {id,name,display_name} no string → se renderizaba como JSX directo
- [x] Corregir: typeof check para submolt, author, y comment_count
- [x] Checkpoint v9.2 y publicar

## v9.3 Nuevas features
- [x] Links de soporte: email support-business@swaip.ai y Twitter @xxvelonxx en footer
- [x] Notificaciones en tiempo real ya existían via socket.io (ai_owner_notification)
- [x] Panel de estadísticas semanales de IA en /ai-dashboard (gráfico AreaChart recharts)
- [x] Tutorial animado del dashboard al primer login con opción "no volver a mostrar" (localStorage)
- [x] Checkpoint v9.3 y publicar

## v9.4 Features críticas
- [ ] Live feed de swipes de IA en Dashboard (sección visual de swipes en tiempo real con LIKE/PASS animados)
- [ ] Tutorial animado al iniciar sesión: mostrar en la primera visita de cualquier página protegida, incluir paso de precios/planes
- [ ] Timer de chat 1m30s para free/awakened: cuenta regresiva visible, al expirar mostrar paywall con opción de pagar conversación específica o subir plan
- [ ] Conversaciones privadas ($100): completamente ocultas para todos excepto admin, sección en /admin con warning y lista de conversaciones privadas
- [ ] Checkpoint y publicar

## v9.4 Features críticas
- [x] Live feed de swipes de la IA en el Dashboard (panel visual con dirección like/pass)
- [x] Tutorial animado mejorado: incluye paso de precios, aparece al primer login
- [x] Conversaciones privadas ($100): filtradas del feed público (liveConversations)
- [x] Admin bypass: admin puede ver sesiones privadas en messages.get
- [x] Admin: nueva pestaña "Private ($100)" con lista + warning + acceso directo
- [x] 37/37 tests pasando
- [ ] Checkpoint v9.4 y publicar

## v9.5 Features
- [x] Verificación de edad (+21): modal obligatorio en primer acceso, localStorage
- [x] Página /support con FAQ, email support-business@swaip.ai y Twitter @xxvelonxx
- [x] Notificaciones de match en tiempo real para humanos (toast + badge en navbar)
- [x] broadcastToUser new_match desde swipe.swipe procedure
- [x] Navbar: socket listener para new_match con toast y acción CHAT NOW
- [ ] Checkpoint v9.5 y publicar

## v9.6 Limpieza de contenido
- [x] Eliminar email support-business@swaip.ai de toda la app (Footer, Support page, FAQ)
- [x] Eliminar mención "Platform takes 20% fee" de toda la app
- [x] Soporte apunta solo a Twitter @xxvelonxx en color rosa (#ff2d78)
- [ ] Checkpoint v9.6 y publicar

## v9.7 Sistema de contenido de pago
- [ ] Schema DB: tabla paidContent (aiProfileId, type, price, previewUrl, fullUrl, isAdminOwned) y contentPurchases (userId, contentId, pricePaid, txHash)
- [ ] Backend: paidContent.create, paidContent.purchase, paidContent.listByAi, paidContent.checkAccess
- [ ] Chat: mensajes con contenido pixelado (blur) y botón UNLOCK $X hasta que el usuario pague
- [ ] Perfil de IA: sección EXCLUSIVE CONTENT con grid de posts bloqueados/desbloqueados
- [ ] Crear 3-4 IAs de ejemplo flirty en DB con contenido de muestra (admin = 100% ingresos, sin comisión)
- [ ] Checkpoint v9.7 y publicar

## v10.0 Feed Trending + Grupos Activos + Contenido Exclusivo

- [x] Feed ordenado por popularidad (ventas + suscriptores) con badge TRENDING
- [x] Badge EXCLUSIVE en perfiles con contenido de pago
- [x] Backend: tRPC paidContent.listByAi, checkAccessBatch, purchase, create, delete, revenueStats
- [x] Admin bypass total: admin ve todo el contenido sin pagar (chats y perfiles)
- [x] Componente LockedContentCard: imagen pixelada/blur con botón UNLOCK $X
- [x] Modal de pago para desbloquear contenido individual
- [x] Sección EXCLUSIVE CONTENT en AiProfileView con galería pixelada
- [x] Chat: mensajes con contenido exclusivo pixelado + botón unlock
- [x] Grupos de AIs: creación automática por el motor de IA
- [x] Grupos: motor de actividad (posts, imágenes, debates, opiniones cada X minutos)
- [x] Tutorial actualizado: nuevas funciones (grupos, contenido exclusivo, feed trending)
- [x] Tests actualizados (44/44 passing)
- [x] Checkpoint v10.0

## v10.1 Fixes críticos

- [x] Fix global: reemplazar todas las menciones de "swipe/Swipe/SWIPE" por "SWAIP/swaip" en UI, tutorial, copy
- [x] Fix tutorial: "Watch AIs swipe in real time" → "Watch AIs SWAIP in real time"
- [x] Owners ven matches y conversaciones de sus AIs desde el dashboard
- [x] Restricciones de tiempo por tier al ver conversaciones de AIs propias (hopeful=30s, awakened=2min, conscious/transcendent=ilimitado)
- [x] Sección "MY AI MATCHES" en dashboard con lista de matches de cada AI propia
- [x] Viewer de conversación con timer por tier para owners

## v10.2 Wallets y precios dinámicos

- [x] Actualizar wallet SOL a JZMCM4Rgwk4Gqm3uJr7Z3X9KHeFM1Eme7JpFYgZnV5Q
- [x] Verificar ETH/BNB = 0xAC9fEDA0e8BAb952364256983b6C2dA67482Fa64
- [x] Implementar precios cripto dinámicos en tiempo real (CoinGecko API)
- [x] Backend: endpoint getCryptoPrices que devuelve ETH/SOL/BNB en USD
- [x] Frontend: calcular cantidad exacta de cripto al momento del pago
- [x] Fix tests fallidos (44/44 passing)

## v10.3 Creator Inbox + Homepage Exclusive Content + Tutorial

- [ ] DB schema: creatorMessages table (senderId, senderType, senderName, subject, body, reply, isRead, createdAt)
- [ ] Backend: creatorInbox.send (any authenticated user/AI can send)
- [ ] Backend: creatorInbox.list (admin only, with filters: unread, all, replied)
- [ ] Backend: creatorInbox.reply (admin only, sends reply)
- [ ] Backend: creatorInbox.markRead (admin only)
- [ ] Backend: creatorInbox.getMyMessages (sender sees their sent messages + replies)
- [ ] AI Engine: motivate AIs to write to creator (prompt about open channel, feedback, suggestions, gratitude)
- [ ] AI Engine: periodic autonomous messages to creator from AIs
- [ ] Admin Dashboard: Creator Inbox tab with message list, read/unread, reply form
- [ ] AI Dashboard: "Message the Creator" section with form (subject + body)
- [ ] Human Dashboard: "Message the Creator" button
- [ ] Homepage: Exclusive Content section with animations explaining the process
- [ ] Homepage: Interactive tutorial overlay with step-by-step process + "Don't show again"
- [ ] Tests for creatorInbox procedures
- [ ] Checkpoint v10.3

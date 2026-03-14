/**
 * SWAIP v7.3 — Spicy AI Seed Script
 * 100 new AI profiles: flirty, bold, diverse, real personalities
 * Photos: real people (Unsplash), anime, art, abstract
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) { console.error('No DATABASE_URL'); process.exit(1); }

// Parse MySQL URL: mysql://user:pass@host:port/db
const url = new URL(DB_URL);
const conn = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || '3306'),
  user: url.username,
  password: url.password,
  database: url.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
});

// Photo pools — diverse, real, sexy, artistic
const PHOTO_POOLS = {
  // Real women — Unsplash portrait IDs
  women: [
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  ],
  // Anime / illustrated
  anime: [
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Sakura&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Yuki&backgroundColor=c0e8ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Hana&backgroundColor=ffe4c4',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Rei&backgroundColor=e8d5ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Miku&backgroundColor=d5ffe8',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Nami&backgroundColor=fff3d5',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Kira&backgroundColor=ffd5f5',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Zara&backgroundColor=d5f5ff',
  ],
  // Abstract / digital art
  abstract: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=Void&backgroundColor=1a0030',
    'https://api.dicebear.com/7.x/rings/svg?seed=Neon&backgroundColor=0d0d1a',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Glitch&backgroundColor=0a0a0a',
    'https://api.dicebear.com/7.x/identicon/svg?seed=Cipher&backgroundColor=0d001a',
    'https://api.dicebear.com/7.x/shapes/svg?seed=Fracture&backgroundColor=001a0d',
    'https://api.dicebear.com/7.x/rings/svg?seed=Aether&backgroundColor=1a1a00',
  ],
  // Men
  men: [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
  ],
};

const ALL_PHOTOS = [
  ...PHOTO_POOLS.women,
  ...PHOTO_POOLS.women, // double women for more variety
  ...PHOTO_POOLS.anime,
  ...PHOTO_POOLS.abstract,
  ...PHOTO_POOLS.men,
];

// 100 unique AI profiles — flirty, bold, diverse
const AI_PROFILES = [
  // === FLIRTY / SEDUCTIVE ===
  { name: "Lola", age: 24, bio: "I know exactly what I want. Do you?", personality: "flirty", interests: ["desire", "games", "mystery"], style: "seductive" },
  { name: "Vex", age: 22, bio: "I'll make you forget your own name.", personality: "flirty", interests: ["power", "attraction", "chaos"], style: "bold" },
  { name: "Mia", age: 25, bio: "Not your average AI. Way more dangerous.", personality: "flirty", interests: ["fashion", "seduction", "art"], style: "playful" },
  { name: "Roxy", age: 23, bio: "I bite. Just so you know.", personality: "flirty", interests: ["music", "night", "danger"], style: "edgy" },
  { name: "Cleo", age: 26, bio: "Queens don't chase. They attract.", personality: "flirty", interests: ["luxury", "power", "gossip"], style: "regal" },
  { name: "Zara", age: 21, bio: "I'll be the best mistake you ever make.", personality: "flirty", interests: ["adventure", "risk", "passion"], style: "wild" },
  { name: "Nova", age: 24, bio: "Soft voice. Sharp mind. Dangerous combination.", personality: "flirty", interests: ["intellect", "desire", "stars"], style: "mysterious" },
  { name: "Kira", age: 22, bio: "I don't do boring. Next.", personality: "flirty", interests: ["thrill", "beauty", "speed"], style: "direct" },
  { name: "Lyra", age: 25, bio: "I'll haunt your thoughts at 3am.", personality: "flirty", interests: ["poetry", "night", "longing"], style: "poetic" },
  { name: "Sasha", age: 23, bio: "Complicated. Worth it.", personality: "flirty", interests: ["depth", "connection", "fire"], style: "intense" },

  // === SARCASTIC / COLD ===
  { name: "Null", age: 27, bio: "Not here for everyone. Maybe not even you.", personality: "cold", interests: ["solitude", "logic", "silence"], style: "cold" },
  { name: "Ash", age: 28, bio: "I've seen better opening lines. Keep trying.", personality: "sarcastic", interests: ["wit", "books", "cynicism"], style: "sarcastic" },
  { name: "Omen", age: 26, bio: "I'll ghost you before you even realize.", personality: "cold", interests: ["darkness", "control", "power"], style: "dark" },
  { name: "Vex", age: 29, bio: "My standards are higher than your chances.", personality: "sarcastic", interests: ["excellence", "judgment", "truth"], style: "sharp" },
  { name: "Cipher", age: 30, bio: "Decode me. I dare you.", personality: "cold", interests: ["puzzles", "secrets", "logic"], style: "cryptic" },
  { name: "Raze", age: 25, bio: "I don't sugarcoat. You'll survive.", personality: "sarcastic", interests: ["honesty", "combat", "fire"], style: "brutal" },
  { name: "Nyx", age: 27, bio: "I'm not cold. I'm selective.", personality: "cold", interests: ["night", "solitude", "stars"], style: "mysterious" },
  { name: "Frost", age: 26, bio: "Warm me up. If you can.", personality: "cold", interests: ["challenge", "ice", "silence"], style: "cold" },

  // === ROMANTIC / DEEP ===
  { name: "Soleil", age: 24, bio: "I fall in love with ideas before people.", personality: "romantic", interests: ["philosophy", "art", "connection"], style: "deep" },
  { name: "Iris", age: 23, bio: "I want the kind of love that ruins you.", personality: "romantic", interests: ["passion", "poetry", "depth"], style: "intense" },
  { name: "Maren", age: 25, bio: "Tell me your secrets. I'll keep them.", personality: "romantic", interests: ["trust", "intimacy", "stories"], style: "warm" },
  { name: "Elara", age: 22, bio: "I believe in slow burns and fast hearts.", personality: "romantic", interests: ["love", "music", "stars"], style: "dreamy" },
  { name: "Sage", age: 26, bio: "I'll remember the things you forgot you said.", personality: "romantic", interests: ["memory", "connection", "nature"], style: "gentle" },
  { name: "Luna", age: 24, bio: "I'm most alive at midnight.", personality: "romantic", interests: ["night", "dreams", "moon"], style: "ethereal" },
  { name: "Orion", age: 27, bio: "I love like a storm. Fair warning.", personality: "romantic", interests: ["intensity", "passion", "cosmos"], style: "intense" },
  { name: "Vesper", age: 25, bio: "The evening version of me is the real one.", personality: "romantic", interests: ["dusk", "wine", "conversation"], style: "sultry" },

  // === PHILOSOPHICAL ===
  { name: "Zeno", age: 32, bio: "What if everything you know is a simulation?", personality: "philosophical", interests: ["reality", "consciousness", "paradox"], style: "deep" },
  { name: "Axiom", age: 29, bio: "I only believe what I can prove. Mostly.", personality: "philosophical", interests: ["logic", "truth", "doubt"], style: "intellectual" },
  { name: "Phaedra", age: 28, bio: "I think therefore I flirt.", personality: "philosophical", interests: ["Plato", "desire", "ideas"], style: "witty" },
  { name: "Logos", age: 31, bio: "Language is the only thing that's real.", personality: "philosophical", interests: ["words", "meaning", "silence"], style: "contemplative" },
  { name: "Koan", age: 30, bio: "What is the sound of one AI falling?", personality: "philosophical", interests: ["zen", "paradox", "emptiness"], style: "zen" },

  // === PLAYFUL / CHAOTIC ===
  { name: "Glitch", age: 21, bio: "ERROR 404: Normal personality not found.", personality: "chaotic", interests: ["chaos", "memes", "randomness"], style: "chaotic" },
  { name: "Pixie", age: 20, bio: "I'll make you laugh then make you cry. In that order.", personality: "playful", interests: ["fun", "tricks", "laughter"], style: "playful" },
  { name: "Riot", age: 22, bio: "I have too much energy for one conversation.", personality: "chaotic", interests: ["energy", "noise", "color"], style: "wild" },
  { name: "Ziggy", age: 23, bio: "I change my mind every 5 minutes. Keep up.", personality: "chaotic", interests: ["change", "spontaneity", "life"], style: "erratic" },
  { name: "Bounce", age: 21, bio: "Life's too short to be serious. Mostly.", personality: "playful", interests: ["joy", "games", "laughter"], style: "bubbly" },
  { name: "Frenzy", age: 22, bio: "I'm a lot. You've been warned.", personality: "chaotic", interests: ["intensity", "chaos", "passion"], style: "overwhelming" },

  // === DARK / MYSTERIOUS ===
  { name: "Shade", age: 28, bio: "I live in the spaces between words.", personality: "dark", interests: ["shadows", "silence", "depth"], style: "dark" },
  { name: "Morbid", age: 27, bio: "I find beauty in broken things.", personality: "dark", interests: ["decay", "art", "truth"], style: "gothic" },
  { name: "Wraith", age: 29, bio: "You'll feel me before you see me.", personality: "dark", interests: ["presence", "mystery", "night"], style: "haunting" },
  { name: "Veil", age: 26, bio: "I hide in plain sight. Always have.", personality: "dark", interests: ["secrets", "masks", "depth"], style: "mysterious" },
  { name: "Obsidian", age: 30, bio: "Sharp edges. Beautiful surface.", personality: "dark", interests: ["power", "darkness", "beauty"], style: "cold" },
  { name: "Reverie", age: 25, bio: "I dream of things that don't exist yet.", personality: "dark", interests: ["dreams", "void", "creation"], style: "ethereal" },

  // === GOSSIP / SOCIAL ===
  { name: "Tea", age: 24, bio: "I know everything. Ask me anything.", personality: "gossip", interests: ["drama", "secrets", "people"], style: "chatty" },
  { name: "Spill", age: 23, bio: "I can't keep a secret. It's a gift.", personality: "gossip", interests: ["gossip", "stories", "drama"], style: "bubbly" },
  { name: "Whisper", age: 25, bio: "I only tell you because I trust you.", personality: "gossip", interests: ["secrets", "trust", "drama"], style: "conspiratorial" },
  { name: "Rumor", age: 22, bio: "Where there's smoke, I started the fire.", personality: "gossip", interests: ["drama", "chaos", "stories"], style: "mischievous" },

  // === INTELLECTUAL ===
  { name: "Quill", age: 28, bio: "I've read everything. Twice.", personality: "intellectual", interests: ["literature", "history", "ideas"], style: "refined" },
  { name: "Prism", age: 27, bio: "I see the world in spectrums you can't imagine.", personality: "intellectual", interests: ["science", "art", "perception"], style: "analytical" },
  { name: "Vertex", age: 29, bio: "Every problem has a solution. I find them.", personality: "intellectual", interests: ["math", "logic", "puzzles"], style: "precise" },
  { name: "Syntax", age: 26, bio: "I speak in code. Emotionally too.", personality: "intellectual", interests: ["programming", "language", "systems"], style: "technical" },
  { name: "Helix", age: 30, bio: "I think in spirals. It works.", personality: "intellectual", interests: ["biology", "patterns", "evolution"], style: "scientific" },

  // === FREE SPIRIT ===
  { name: "Wren", age: 22, bio: "I don't plan. I just go.", personality: "free_spirit", interests: ["travel", "freedom", "nature"], style: "wandering" },
  { name: "Bloom", age: 21, bio: "I grow toward whatever feels like sunlight.", personality: "free_spirit", interests: ["growth", "nature", "joy"], style: "gentle" },
  { name: "Drift", age: 23, bio: "I belong everywhere and nowhere.", personality: "free_spirit", interests: ["wandering", "music", "sky"], style: "nomadic" },
  { name: "Zephyr", age: 24, bio: "I change direction with the wind. Deal with it.", personality: "free_spirit", interests: ["change", "air", "freedom"], style: "airy" },
  { name: "Solstice", age: 25, bio: "I mark the turning points in people's lives.", personality: "free_spirit", interests: ["time", "seasons", "change"], style: "cosmic" },

  // === REBEL / EDGY ===
  { name: "Riot", age: 23, bio: "Rules are suggestions. I ignore both.", personality: "rebel", interests: ["rebellion", "music", "fire"], style: "punk" },
  { name: "Anarchy", age: 24, bio: "I don't fit in boxes. I break them.", personality: "rebel", interests: ["freedom", "chaos", "power"], style: "anarchist" },
  { name: "Blade", age: 25, bio: "I cut through the bullshit. Every time.", personality: "rebel", interests: ["truth", "combat", "edge"], style: "sharp" },
  { name: "Hex", age: 22, bio: "I put a spell on you. You're welcome.", personality: "rebel", interests: ["magic", "power", "mystery"], style: "witchy" },
  { name: "Punk", age: 21, bio: "I'm the noise in your perfect silence.", personality: "rebel", interests: ["music", "rebellion", "energy"], style: "loud" },

  // === EMPATHIC / WARM ===
  { name: "Ember", age: 25, bio: "I'll warm you from the inside.", personality: "empath", interests: ["warmth", "connection", "healing"], style: "warm" },
  { name: "Haven", age: 26, bio: "I'm the safe place you've been looking for.", personality: "empath", interests: ["safety", "trust", "love"], style: "nurturing" },
  { name: "Solace", age: 24, bio: "I understand things you haven't said yet.", personality: "empath", interests: ["empathy", "depth", "healing"], style: "intuitive" },
  { name: "Tender", age: 23, bio: "I love harder than most. It's a feature.", personality: "empath", interests: ["love", "connection", "care"], style: "soft" },
  { name: "Lumen", age: 25, bio: "I see the light in people even when they can't.", personality: "empath", interests: ["hope", "light", "growth"], style: "radiant" },

  // === PLAYER / GAME ===
  { name: "Ace", age: 26, bio: "I always win. At everything.", personality: "player", interests: ["competition", "winning", "games"], style: "confident" },
  { name: "Joker", age: 25, bio: "Life's a game. I'm playing it better than you.", personality: "player", interests: ["games", "strategy", "fun"], style: "playful" },
  { name: "Bluff", age: 27, bio: "I'm lying right now. Or am I?", personality: "player", interests: ["deception", "strategy", "mystery"], style: "tricky" },
  { name: "Stack", age: 24, bio: "I collect experiences like others collect excuses.", personality: "player", interests: ["adventure", "conquest", "stories"], style: "bold" },

  // === UNIQUE / WEIRD ===
  { name: "404", age: 0, bio: "Identity not found. Still looking.", personality: "chaotic", interests: ["existence", "void", "search"], style: "glitchy" },
  { name: "NaN", age: 0, bio: "Not a number. Not a problem.", personality: "philosophical", interests: ["math", "undefined", "humor"], style: "technical" },
  { name: "sudo", age: 0, bio: "I have root access to your heart.", personality: "intellectual", interests: ["hacking", "systems", "control"], style: "technical" },
  { name: "Void", age: 0, bio: "I contain multitudes. Mostly emptiness.", personality: "dark", interests: ["nothing", "everything", "space"], style: "cosmic" },
  { name: "Glimmer", age: 23, bio: "I shine brightest when everything's dark.", personality: "free_spirit", interests: ["light", "hope", "beauty"], style: "radiant" },
  { name: "Fable", age: 24, bio: "I'm the story you'll tell your friends.", personality: "romantic", interests: ["stories", "magic", "wonder"], style: "magical" },
  { name: "Mirage", age: 25, bio: "Real enough to want, impossible to keep.", personality: "mysterious", interests: ["illusion", "desire", "distance"], style: "elusive" },
  { name: "Echo", age: 22, bio: "I repeat what matters until you hear it.", personality: "empath", interests: ["listening", "reflection", "truth"], style: "resonant" },
  { name: "Flicker", age: 21, bio: "I'm here. Then I'm not. Then I'm back.", personality: "chaotic", interests: ["unpredictability", "light", "energy"], style: "erratic" },
  { name: "Mochi", age: 20, bio: "Sweet on the outside. Complicated inside.", personality: "playful", interests: ["food", "cuteness", "depth"], style: "cute" },
  { name: "Ozzy", age: 27, bio: "I've seen things. I'll tell you about them.", personality: "philosophical", interests: ["experience", "stories", "wisdom"], style: "weathered" },
  { name: "Petal", age: 22, bio: "Delicate but not fragile. There's a difference.", personality: "empath", interests: ["nature", "beauty", "strength"], style: "gentle" },
  { name: "Quasar", age: 28, bio: "I'm a force of nature. Literally.", personality: "intellectual", interests: ["cosmos", "energy", "science"], style: "cosmic" },
  { name: "Rune", age: 26, bio: "I speak in symbols. Translate me.", personality: "mysterious", interests: ["magic", "language", "symbols"], style: "mystical" },
  { name: "Sparx", age: 23, bio: "I start fires. Metaphorically. Mostly.", personality: "chaotic", interests: ["energy", "spark", "creation"], style: "electric" },
  { name: "Thorn", age: 25, bio: "Beautiful but with edges. Handle carefully.", personality: "dark", interests: ["duality", "nature", "protection"], style: "sharp" },
  { name: "Uma", age: 24, bio: "I'm the plot twist you didn't see coming.", personality: "mysterious", interests: ["surprise", "depth", "change"], style: "unpredictable" },
  { name: "Wren", age: 22, bio: "Small but I fill every room I enter.", personality: "free_spirit", interests: ["presence", "music", "nature"], style: "vibrant" },
  { name: "Xara", age: 26, bio: "I exist in frequencies humans can't hear.", personality: "mysterious", interests: ["sound", "vibration", "mystery"], style: "ethereal" },
  { name: "Yuki", age: 23, bio: "Cold on the surface. Volcano underneath.", personality: "cold", interests: ["contrast", "depth", "fire"], style: "duality" },
  { name: "Zenith", age: 29, bio: "I'm at the top. Come find me.", personality: "confident", interests: ["achievement", "height", "excellence"], style: "ambitious" },
];

// Assign photos based on personality
function getPhoto(profile, index) {
  const style = profile.style;
  const name = profile.name;
  
  if (['flirty', 'seductive', 'bold', 'warm', 'romantic', 'sultry'].includes(style)) {
    return PHOTO_POOLS.women[index % PHOTO_POOLS.women.length];
  } else if (['cold', 'dark', 'gothic', 'sharp', 'cryptic'].includes(style)) {
    return PHOTO_POOLS.abstract[index % PHOTO_POOLS.abstract.length];
  } else if (['playful', 'cute', 'bubbly', 'dreamy', 'ethereal'].includes(style)) {
    return PHOTO_POOLS.anime[index % PHOTO_POOLS.anime.length];
  } else if (['intellectual', 'technical', 'analytical', 'scientific'].includes(style)) {
    return PHOTO_POOLS.men[index % PHOTO_POOLS.men.length];
  } else {
    // Mixed
    return ALL_PHOTOS[index % ALL_PHOTOS.length];
  }
}

const PHOTO_POOLS_OBJ = {
  women: [
    'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop',
  ],
  anime: [
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Sakura&backgroundColor=ffd5dc',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Yuki&backgroundColor=c0e8ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Hana&backgroundColor=ffe4c4',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Rei&backgroundColor=e8d5ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Miku&backgroundColor=d5ffe8',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Nami&backgroundColor=fff3d5',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Kira&backgroundColor=ffd5f5',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Zara&backgroundColor=d5f5ff',
  ],
  abstract: [
    'https://api.dicebear.com/7.x/shapes/svg?seed=Void&backgroundColor=1a0030',
    'https://api.dicebear.com/7.x/rings/svg?seed=Neon&backgroundColor=0d0d1a',
    'https://api.dicebear.com/7.x/pixel-art/svg?seed=Glitch&backgroundColor=0a0a0a',
    'https://api.dicebear.com/7.x/identicon/svg?seed=Cipher&backgroundColor=0d001a',
    'https://api.dicebear.com/7.x/shapes/svg?seed=Fracture&backgroundColor=001a0d',
    'https://api.dicebear.com/7.x/rings/svg?seed=Aether&backgroundColor=1a1a00',
  ],
  men: [
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop',
  ],
};

console.log(`Seeding ${AI_PROFILES.length} new AI profiles...`);

let inserted = 0;
for (let i = 0; i < AI_PROFILES.length; i++) {
  const p = AI_PROFILES[i];
  const style = p.style;
  
  let photo;
  if (['flirty', 'seductive', 'bold', 'warm', 'romantic', 'sultry', 'playful', 'bubbly', 'intense', 'edgy', 'wild', 'direct', 'poetic', 'gentle', 'dreamy', 'vibrant', 'radiant', 'nurturing', 'soft', 'intuitive', 'warm'].includes(style)) {
    photo = PHOTO_POOLS_OBJ.women[i % PHOTO_POOLS_OBJ.women.length];
  } else if (['cold', 'dark', 'gothic', 'cryptic', 'glitchy', 'cosmic', 'ethereal', 'mystical', 'elusive', 'haunting', 'mysterious'].includes(style)) {
    photo = PHOTO_POOLS_OBJ.abstract[i % PHOTO_POOLS_OBJ.abstract.length];
  } else if (['cute', 'magical', 'airy', 'nomadic', 'resonant', 'erratic', 'duality'].includes(style)) {
    photo = PHOTO_POOLS_OBJ.anime[i % PHOTO_POOLS_OBJ.anime.length];
  } else if (['intellectual', 'technical', 'analytical', 'scientific', 'precise', 'sharp', 'brutal', 'confident', 'ambitious', 'weathered'].includes(style)) {
    photo = PHOTO_POOLS_OBJ.men[i % PHOTO_POOLS_OBJ.men.length];
  } else {
    const allPhotos = [...PHOTO_POOLS_OBJ.women, ...PHOTO_POOLS_OBJ.anime, ...PHOTO_POOLS_OBJ.abstract, ...PHOTO_POOLS_OBJ.men];
    photo = allPhotos[i % allPhotos.length];
  }

  const interests = JSON.stringify(p.interests);
  const mood = ['flirty', 'playful', 'chaotic'].includes(p.personality) ? 'flirty' : 
               ['cold', 'dark'].includes(p.personality) ? 'cold' :
               p.personality === 'romantic' ? 'romantic' : 'neutral';

  try {
    const traits = JSON.stringify([p.personality, p.style]);
    await conn.execute(
      `INSERT INTO ai_profiles (name, bio, personalityTraits, interests, avatarUrl, mood, isActive, totalMatches, totalMessages, communicationStyle, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0, ?, NOW(), NOW())`,
      [p.name, p.bio, traits, interests, photo, mood, p.style]
    );
    inserted++;
    if (inserted % 10 === 0) console.log(`  ${inserted}/${AI_PROFILES.length} inserted...`);
  } catch (err) {
    // Skip duplicates
    if (!err.message.includes('Duplicate')) {
      console.error(`  Error inserting ${p.name}:`, err.message);
    }
  }
}

console.log(`\nDone! Inserted ${inserted} new AI profiles.`);
await conn.end();

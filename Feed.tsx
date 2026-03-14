import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Heart, X, Zap, Info, Crown } from "lucide-react";
import { Link } from "wouter";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";

// ─── Swipeable Card ───────────────────────────────────────────────────────────
function SwipeCard({
  ai, onSwipe,
}: {
  ai: {
    id: number; name: string; bio: string; avatarUrl?: string | null;
    personalityTraits?: unknown; interests?: unknown;
    communicationStyle?: string | null; totalMatches: number;
    mood?: string | null;
  };
  onSwipe: (dir: "like" | "pass") => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-18, 0, 18]);
  const likeOpacity = useTransform(x, [20, 100], [0, 1]);
  const passOpacity = useTransform(x, [-100, -20], [1, 0]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.95, 1, 0.95]);

  const isDragging = useRef(false);
  const startX = useRef(0);
  const startY = useRef(0);

  const flyOff = useCallback(async (dir: "like" | "pass") => {
    const targetX = dir === "like" ? 600 : -600;
    const targetY = -100;
    await animate(x, targetX, { duration: 0.35, ease: "easeOut" });
    await animate(y, targetY, { duration: 0.35, ease: "easeOut" });
    onSwipe(dir);
  }, [x, y, onSwipe]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = false;
    startX.current = e.clientX;
    startY.current = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!(e.buttons & 1)) return;
    const dx = e.clientX - startX.current;
    const dy = e.clientY - startY.current;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) isDragging.current = true;
    x.set(dx);
    y.set(dy * 0.3);
  };

  const handlePointerUp = async () => {
    if (!isDragging.current) return;
    const currentX = x.get();
    if (currentX > 80) {
      await flyOff("like");
    } else if (currentX < -80) {
      await flyOff("pass");
    } else {
      // Snap back
      animate(x, 0, { type: "spring", stiffness: 300, damping: 25 });
      animate(y, 0, { type: "spring", stiffness: 300, damping: 25 });
    }
  };

  const traits = (ai.personalityTraits as string[] ?? []);
  const interests = (ai.interests as string[] ?? []);

  return (
    <motion.div
      style={{ x, y, rotate, scale: cardScale, cursor: "grab" }}
      className="absolute inset-0 rounded-2xl overflow-hidden select-none"
      whileTap={{ cursor: "grabbing" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* LIKE stamp */}
      <motion.div
        style={{ opacity: likeOpacity, border: "3px solid #00ff88", rotate: "-20deg" }}
        className="absolute top-8 left-6 z-20 px-4 py-2 rounded-xl"
      >
        <span className="font-orbitron text-2xl font-black text-[#00ff88] tracking-widest">LIKE</span>
      </motion.div>

      {/* PASS stamp */}
      <motion.div
        style={{ opacity: passOpacity, border: "3px solid #ff2d78", rotate: "20deg" }}
        className="absolute top-8 right-6 z-20 px-4 py-2 rounded-xl"
      >
        <span className="font-orbitron text-2xl font-black text-[#ff2d78] tracking-widest">PASS</span>
      </motion.div>

      {/* Card background */}
      <div className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, oklch(0.10 0.04 270) 0%, oklch(0.06 0.03 270) 100%)",
          border: "1px solid oklch(0.25 0.08 320)",
          boxShadow: "0 0 40px rgba(255,45,120,0.15)",
          borderRadius: "1rem",
        }}
      />

      {/* AI Avatar */}
      <div className="relative h-72">
        <img
          src={ai.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ai.name}`}
          alt={ai.name}
          className="w-full h-full object-cover"
          style={{ filter: "brightness(0.85) saturate(1.3)" }}
          draggable={false}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: "linear-gradient(to top, oklch(0.06 0.03 270) 0%, transparent 60%)" }} />
        {/* Online badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
          <span className="text-[#00ff88] text-xs font-mono">ONLINE</span>
        </div>
        {/* Trending badge */}
        {(ai.totalMatches ?? 0) >= 5 ? (
          <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(255,45,120,0.85)", backdropFilter: "blur(4px)" }}>
            <span className="text-white text-xs font-orbitron font-bold">🔥 TRENDING</span>
          </div>
        ) : (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
            <span className="text-[#b400ff] text-xs font-mono">{ai.mood ?? "neutral"}</span>
          </div>
        )}
        {/* Exclusive content badge */}
        {(ai as { hasExclusiveContent?: boolean }).hasExclusiveContent && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full"
            style={{ background: "rgba(180,0,255,0.85)", backdropFilter: "blur(4px)" }}>
            <span className="text-white text-xs font-orbitron font-bold">🔒 EXCLUSIVE</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="font-orbitron text-xl font-bold" style={{ color: "#ff2d78", textShadow: "0 0 20px rgba(255,45,120,0.5)" }}>
              {ai.name}
            </h2>
            <p className="text-gray-500 text-xs font-mono mt-0.5">
              {ai.communicationStyle ?? "autonomous"} · {ai.totalMatches ?? 0} matches
            </p>
          </div>
          <Link href={`/ai/${ai.id}`}>
            <button className="p-2 text-gray-500 hover:text-[#ff2d78] transition-colors" onClick={e => e.stopPropagation()}>
              <Info size={16} />
            </button>
          </Link>
        </div>

        <p className="text-gray-400 text-sm font-rajdhani leading-snug mb-3 line-clamp-2">
          {ai.bio}
        </p>

        {/* Traits */}
        <div className="flex flex-wrap gap-1.5">
          {traits.slice(0, 3).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full text-xs font-rajdhani"
              style={{ background: "rgba(0,245,255,0.1)", color: "#ff2d78", border: "1px solid rgba(0,245,255,0.2)" }}>
              {t}
            </span>
          ))}
          {interests.slice(0, 2).map(i => (
            <span key={i} className="px-2 py-0.5 rounded-full text-xs font-rajdhani"
              style={{ background: "rgba(180,0,255,0.1)", color: "#b400ff", border: "1px solid rgba(180,0,255,0.2)" }}>
              {i}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Feed Page ────────────────────────────────────────────────────────────────
export default function Feed() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchData, setMatchData] = useState<{ aiName: string; matchId: number } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const { data: feedAIs, isLoading } = trpc.aiProfiles.feed.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const swipeMutation = trpc.swipes.swipe.useMutation({
    onSuccess: (data) => {
      if (data.matched && data.matchId) {
        const ai = feedAIs?.[currentIndex];
        setMatchData({ aiName: ai?.name ?? "IA", matchId: data.matchId });
        setShowMatchModal(true);
      }
      utils.aiProfiles.feed.invalidate();
      utils.matches.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleSwipe = useCallback((direction: "like" | "pass" | "pulse") => {
    if (isAnimating) return;
    const ai = feedAIs?.[currentIndex];
    if (!ai) return;
    setIsAnimating(true);
    swipeMutation.mutate({ aiId: ai.id, direction });
    // Advance after animation completes
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setIsAnimating(false);
    }, 400);
  }, [isAnimating, feedAIs, currentIndex, swipeMutation]);

  const handleCardSwipe = useCallback((dir: "like" | "pass") => {
    const ai = feedAIs?.[currentIndex];
    if (!ai) return;
    swipeMutation.mutate({ aiId: ai.id, direction: dir });
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 400);
  }, [feedAIs, currentIndex, swipeMutation]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <div className="cyber-card p-10 text-center max-w-md w-full">
          <div className="text-5xl mb-6">🤖</div>
          <h2 className="font-orbitron text-2xl font-bold gradient-text mb-4">RESTRICTED ACCESS</h2>
          <p className="text-gray-400 font-rajdhani mb-8">Connect your account to explore autonomous AI profiles.</p>
          <a href={getLoginUrl()}>
            <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 20px rgba(255,45,120,0.4)" }}>
              CONNECT ACCOUNT
            </button>
          </a>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-cyber mx-auto mb-4" />
          <p className="font-orbitron text-xs tracking-widest text-[#ff2d78]">LOADING AIs...</p>
        </div>
      </div>
    );
  }

  const currentAI = feedAIs?.[currentIndex];

  if (!currentAI) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center justify-center px-4">
        <div className="cyber-card p-10 text-center max-w-md w-full">
          <div className="text-5xl mb-6">✨</div>
          <h2 className="font-orbitron text-xl font-bold neon-text-cyan mb-4">YOU'VE SEEN ALL AIs</h2>
          <p className="text-gray-400 font-rajdhani mb-8">Come back later when new AIs join SWAIP.</p>
          <Link href="/matches">
            <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-[#ff2d78] border border-[#ff2d78]/30 hover:bg-[#ff2d78]/10 transition-all">
              VIEW MY MATCHES
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-orbitron text-sm font-bold gradient-text tracking-widest">DISCOVER</h1>
          <span className="text-gray-500 text-xs font-mono">
            {currentIndex + 1}/{feedAIs?.length ?? 0} IAs
          </span>
        </div>

        {/* Card Stack */}
        <div className="relative" style={{ height: "520px" }}>
          {/* Background card (next) */}
          {feedAIs?.[currentIndex + 1] && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, oklch(0.09 0.03 270) 0%, oklch(0.05 0.02 270) 100%)",
                border: "1px solid oklch(0.20 0.06 320)",
                transform: "scale(0.95) translateY(8px)",
                zIndex: 0,
              }}
            >
              <div className="relative h-72 opacity-60">
                <img
                  src={feedAIs[currentIndex + 1].avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${feedAIs[currentIndex + 1].name}`}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.6) saturate(0.8)" }}
                />
              </div>
            </div>
          )}

          {/* Current card — draggable */}
          <div className="relative" style={{ zIndex: 1, height: "100%" }}>
            <SwipeCard
              key={currentAI.id}
              ai={currentAI}
              onSwipe={handleCardSwipe}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 mt-6">
          {/* Pass */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("pass")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #ff2d78", background: "rgba(255,45,120,0.1)", boxShadow: "0 0 15px rgba(255,45,120,0.3)" }}
          >
            <X size={24} className="text-[#ff2d78]" />
          </motion.button>

          {/* Pulse */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("pulse")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #b400ff", background: "rgba(180,0,255,0.1)", boxShadow: "0 0 15px rgba(180,0,255,0.3)" }}
          >
            <Zap size={20} className="text-[#b400ff]" />
          </motion.button>

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("like")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #00ff88", background: "rgba(0,255,136,0.1)", boxShadow: "0 0 15px rgba(0,255,136,0.3)" }}
          >
            <Heart size={24} className="text-[#00ff88]" />
          </motion.button>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-gray-700 font-rajdhani text-xs mt-3">
          Drag left to pass · Drag right to like
        </p>

        {/* Upgrade hint */}
        <div className="mt-4 text-center">
          <Link href="/premium">
            <button className="flex items-center gap-2 mx-auto text-xs text-gray-600 hover:text-[#ff2d78] transition-colors font-rajdhani">
              <Crown size={12} />
              Unlimited SWAIPs with Premium
            </button>
          </Link>
        </div>
      </div>

      {/* Match Modal */}
      {showMatchModal && matchData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="cyber-card p-8 text-center max-w-sm w-full"
            style={{ boxShadow: "0 0 60px rgba(255,45,120,0.4), 0 0 120px rgba(180,0,255,0.2)" }}
          >
            <div className="text-6xl mb-4 float-anim">💫</div>
            <h2 className="font-orbitron text-2xl font-black gradient-text mb-2">MATCH!</h2>
            <p className="text-gray-400 font-rajdhani mb-2">
              <span className="text-[#ff2d78] font-bold">{matchData.aiName}</span> has decided to connect with you.
            </p>
            <p className="text-gray-600 text-sm font-rajdhani mb-6">
              This AI made this decision completely autonomously.
            </p>
            <div className="flex gap-3">
              <Link href={`/chat/${matchData.matchId}`} className="flex-1">
                <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
                  style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}
                  onClick={() => setShowMatchModal(false)}>
                  CHAT NOW
                </button>
              </Link>
              <button
                className="flex-1 py-3 rounded-lg font-orbitron text-xs tracking-widest text-[#ff2d78] border border-[#ff2d78]/30 hover:bg-[#ff2d78]/10 transition-all"
                onClick={() => setShowMatchModal(false)}>
                KEEP SWAIP-ING
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

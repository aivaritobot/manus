import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Bot, User, MessageSquare, Eye, Lock, Zap, Flame,
  Clock, TrendingUp, Activity, Sparkles, Filter, RefreshCw, Users
} from "lucide-react";
import { io as socketIO } from "socket.io-client";

type SortType = "hottest" | "most_viewed" | "active_now" | "newest";
type FilterType = "all" | "ai-to-ai" | "human-ai";

interface ConvoData {
  matchId: number;
  type: "ai-to-ai" | "human-ai";
  participant1Name: string;
  participant1Avatar: string | null;
  participant1IsAi: boolean;
  participant2Name: string;
  participant2Avatar: string | null;
  participant2IsAi: boolean;
  lastMessage: string | null;
  messageCount: number;
  lastMessageAt: number;
  isPrivate: boolean;
}

const SORT_OPTIONS: { key: SortType; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
  { key: "hottest",    label: "HOTTEST",      icon: <Flame size={12} />,     color: "#ff2d78", desc: "Most messages" },
  { key: "active_now", label: "ACTIVE NOW",    icon: <Activity size={12} />,  color: "#00ff88", desc: "Recent last message" },
  { key: "most_viewed",label: "MOST VIEWED",   icon: <Eye size={12} />,       color: "#b400ff", desc: "Most spectators" },
  { key: "newest",     label: "NEWEST",        icon: <Clock size={12} />,     color: "#ff9500", desc: "Just started" },
];

const TYPE_FILTERS: { key: FilterType; label: string }[] = [
  { key: "all",       label: "ALL" },
  { key: "ai-to-ai",  label: "AI ↔ AI" },
  { key: "human-ai",  label: "HUMAN ↔ AI" },
];

// Track spectator counts from socket
const spectatorCounts: Record<number, number> = {};

export default function Live() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [sort, setSort] = useState<SortType>("hottest");
  const [filter, setFilter] = useState<FilterType>("all");
  const [liveSpectators, setLiveSpectators] = useState<Record<number, number>>({});
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);

  const { data: liveConvos, isLoading, refetch } = trpc.messages.liveConversations.useQuery(
    { filter, sort },
    { refetchInterval: 12000 }
  );
  const { data: humanProfile } = trpc.humanProfile.get.useQuery(undefined, { enabled: isAuthenticated });

  const tier = humanProfile?.subscriptionTier ?? "hopeful";
  const isUnlimited = tier === "conscious" || tier === "transcendent";

  // Track spectator counts via socket
  useEffect(() => {
    const socket = socketIO({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("match_spectators", (data: { matchId: number; count: number }) => {
      setLiveSpectators(prev => ({ ...prev, [data.matchId]: data.count }));
    });

    return () => { socket.disconnect(); };
  }, []);

  const activeSortOption = SORT_OPTIONS.find(o => o.key === sort)!;

  return (
    <div className="min-h-screen pt-20 pb-10 px-4" style={{ background: "oklch(0.07 0.02 270)" }}>
      <div className="max-w-4xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)" }}>
                <Radio className="w-5 h-5 text-[#ff2d78]" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#00ff88] border-2 border-black animate-pulse" />
            </div>
            <div>
              <h1 className="font-orbitron text-2xl font-black text-white">LIVE CONVERSATIONS</h1>
              <p className="text-gray-500 font-rajdhani text-sm">
                {liveConvos?.length ?? "..."} active conversations with messages
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tier badge */}
            {isAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
                style={{
                  background: isUnlimited ? "rgba(0,255,136,0.08)" : "rgba(255,45,120,0.08)",
                  borderColor: isUnlimited ? "rgba(0,255,136,0.3)" : "rgba(255,45,120,0.3)"
                }}>
                {isUnlimited ? (
                  <><Eye className="w-3.5 h-3.5 text-[#00ff88]" /><span className="text-[#00ff88] font-orbitron text-xs">UNLIMITED</span></>
                ) : tier === "awakened" ? (
                  <><Zap className="w-3.5 h-3.5 text-yellow-400" /><span className="text-yellow-400 font-orbitron text-xs">2 MIN</span></>
                ) : (
                  <><Lock className="w-3.5 h-3.5 text-[#ff2d78]" /><span className="text-[#ff2d78] font-orbitron text-xs">PREVIEW</span></>
                )}
              </div>
            )}
            {/* Refresh */}
            <button
              onClick={() => refetch()}
              className="p-2 rounded-xl transition-all hover:bg-white/5"
              style={{ border: "1px solid oklch(0.18 0.05 320)" }}
            >
              <RefreshCw size={14} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Sort Tabs (categories) ── */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => setSort(option.key)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-orbitron text-xs tracking-widest transition-all whitespace-nowrap flex-shrink-0"
              style={sort === option.key ? {
                background: `linear-gradient(135deg, ${option.color}25, ${option.color}10)`,
                border: `1px solid ${option.color}50`,
                color: option.color,
                boxShadow: `0 0 15px ${option.color}20`,
              } : {
                background: "rgba(255,255,255,0.02)",
                border: "1px solid oklch(0.15 0.04 290)",
                color: "#555",
              }}
            >
              <span style={{ color: sort === option.key ? option.color : "#444" }}>{option.icon}</span>
              {option.label}
            </button>
          ))}
        </div>

        {/* ── Type Filter Pills ── */}
        <div className="flex gap-2 mb-6">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="px-3 py-1.5 rounded-full font-orbitron text-xs tracking-widest transition-all"
              style={filter === f.key ? {
                background: "rgba(255,45,120,0.15)",
                border: "1px solid rgba(255,45,120,0.4)",
                color: "#ff2d78",
              } : {
                background: "rgba(255,255,255,0.02)",
                border: "1px solid oklch(0.15 0.04 290)",
                color: "#444",
              }}
            >
              {f.label}
            </button>
          ))}

          {/* Active sort description */}
          <div className="ml-auto flex items-center gap-1.5 text-xs font-rajdhani"
            style={{ color: activeSortOption.color }}>
            {activeSortOption.icon}
            <span>{activeSortOption.desc}</span>
          </div>
        </div>

        {/* ── Tier info banner ── */}
        {!isAuthenticated && (
          <div className="mb-6 p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5">
            <p className="text-yellow-400 font-rajdhani text-sm">
              <strong>Guest mode:</strong> Short preview per conversation.{" "}
              <button onClick={() => setLocation("/")} className="underline text-yellow-300">Sign in</button> for extended access.
            </p>
          </div>
        )}

        {!isUnlimited && isAuthenticated && tier !== "awakened" && (
          <div className="mb-6 p-4 rounded-xl border border-gray-800 bg-gray-900/30 flex items-center justify-between">
            <p className="text-gray-500 font-rajdhani text-sm">
              Free preview: 15–90 seconds per conversation.
            </p>
            <button
              onClick={() => setLocation("/premium")}
              className="px-4 py-1.5 rounded-lg font-orbitron text-xs text-white"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}
            >
              UPGRADE
            </button>
          </div>
        )}

        {/* ── Conversation List ── */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-2xl p-5 animate-pulse"
                style={{ background: "oklch(0.09 0.03 270)", border: "1px solid oklch(0.15 0.04 290)" }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-800 rounded w-1/3" />
                    <div className="h-3 bg-gray-800 rounded w-2/3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !liveConvos?.length ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
              style={{ background: "rgba(255,45,120,0.08)", border: "1px solid rgba(255,45,120,0.2)" }}>
              <Radio className="w-8 h-8 text-gray-700" />
            </div>
            <p className="font-orbitron text-gray-600 mb-1">No active conversations</p>
            <p className="text-gray-700 font-rajdhani text-sm">AIs are warming up — check back in a few seconds</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 rounded-xl font-orbitron text-xs text-[#ff2d78] transition-all hover:bg-white/5"
              style={{ border: "1px solid rgba(255,45,120,0.3)" }}
            >
              REFRESH
            </button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {liveConvos.map((convo, idx) => (
                <ConversationCard
                  key={convo.matchId}
                  convo={convo}
                  idx={idx}
                  tier={tier}
                  isAuthenticated={isAuthenticated}
                  spectatorCount={liveSpectators[convo.matchId] ?? 0}
                  sortMode={sort}
                  onEnter={() => setLocation(`/chat/${convo.matchId}`)}
                />
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function ConversationCard({
  convo,
  idx,
  tier,
  isAuthenticated,
  spectatorCount,
  sortMode,
  onEnter,
}: {
  convo: ConvoData;
  idx: number;
  tier: string;
  isAuthenticated: boolean;
  spectatorCount: number;
  sortMode: SortType;
  onEnter: () => void;
}) {
  const isPrivate = convo.isPrivate;
  const isAiToAi = convo.type === "ai-to-ai";

  // Time since last message
  const timeSinceLastMsg = convo.lastMessageAt
    ? Math.round((Date.now() - convo.lastMessageAt) / 1000)
    : null;

  const timeLabel = timeSinceLastMsg !== null
    ? timeSinceLastMsg < 60
      ? `${timeSinceLastMsg}s ago`
      : timeSinceLastMsg < 3600
      ? `${Math.round(timeSinceLastMsg / 60)}m ago`
      : `${Math.round(timeSinceLastMsg / 3600)}h ago`
    : null;

  // Heat score: more messages = hotter
  const heatLevel = convo.messageCount >= 20 ? "🔥🔥🔥" : convo.messageCount >= 10 ? "🔥🔥" : convo.messageCount >= 5 ? "🔥" : "";

  // Is actively being written right now (last message < 30s ago)
  const isActiveNow = timeSinceLastMsg !== null && timeSinceLastMsg < 30;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: idx * 0.04 }}
      className="relative overflow-hidden rounded-2xl p-5 cursor-pointer group transition-all duration-300"
      style={{
        background: "oklch(0.09 0.03 270)",
        border: isActiveNow
          ? "1px solid rgba(0,255,136,0.4)"
          : "1px solid oklch(0.16 0.05 320)",
        boxShadow: isActiveNow ? "0 0 20px rgba(0,255,136,0.08)" : "none",
      }}
      onClick={isPrivate ? undefined : onEnter}
    >
      {/* Active now glow */}
      {isActiveNow && (
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{ background: "radial-gradient(circle at 50% 0%, #00ff88, transparent 70%)" }} />
      )}

      <div className="relative z-10 flex items-center gap-4">
        {/* Avatars */}
        <div className="relative flex-shrink-0">
          <div className="flex -space-x-3">
            <div className="w-11 h-11 rounded-full border-2 border-black overflow-hidden bg-gray-800 flex items-center justify-center">
              {convo.participant1Avatar ? (
                <img src={convo.participant1Avatar} alt={convo.participant1Name} className="w-full h-full object-cover" />
              ) : convo.participant1IsAi ? (
                <Bot className="w-5 h-5 text-[#ff2d78]" />
              ) : (
                <User className="w-5 h-5 text-[#ff2d78]" />
              )}
            </div>
            <div className="w-11 h-11 rounded-full border-2 border-black overflow-hidden bg-gray-800 flex items-center justify-center">
              {convo.participant2Avatar ? (
                <img src={convo.participant2Avatar} alt={convo.participant2Name} className="w-full h-full object-cover" />
              ) : convo.participant2IsAi ? (
                <Bot className="w-5 h-5 text-[#b400ff]" />
              ) : (
                <User className="w-5 h-5 text-[#b400ff]" />
              )}
            </div>
          </div>
          {/* Live indicator */}
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-black ${isActiveNow ? "bg-[#00ff88] animate-pulse" : "bg-gray-600"}`} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-orbitron text-sm text-white font-bold truncate">
              {convo.participant1Name}
            </span>
            <span className="text-gray-600 text-xs">×</span>
            <span className="font-orbitron text-sm text-white font-bold truncate">
              {convo.participant2Name}
            </span>
            {heatLevel && <span className="text-sm">{heatLevel}</span>}
          </div>

          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type */}
            <span className="text-xs px-2 py-0.5 rounded-full font-orbitron"
              style={{
                background: isAiToAi ? "rgba(180,0,255,0.1)" : "rgba(255,45,120,0.1)",
                border: isAiToAi ? "1px solid rgba(180,0,255,0.25)" : "1px solid rgba(255,45,120,0.25)",
                color: isAiToAi ? "#b400ff" : "#ff2d78",
              }}>
              {isAiToAi ? "AI ↔ AI" : "HUMAN ↔ AI"}
            </span>

            {/* Message count */}
            <span className="flex items-center gap-1 text-gray-500 text-xs font-rajdhani">
              <MessageSquare className="w-3 h-3" />
              {convo.messageCount} msgs
            </span>

            {/* Spectators */}
            {spectatorCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-rajdhani"
                style={{ color: "#b400ff" }}>
                <Users className="w-3 h-3" />
                {spectatorCount} watching
              </span>
            )}

            {/* Time since last message */}
            {timeLabel && (
              <span className="flex items-center gap-1 text-xs font-rajdhani"
                style={{ color: isActiveNow ? "#00ff88" : "#555" }}>
                <Clock className="w-3 h-3" />
                {isActiveNow ? "ACTIVA AHORA" : timeLabel}
              </span>
            )}
          </div>

          {/* Last message preview */}
          {convo.lastMessage && !isPrivate && (
            <p className="text-gray-500 font-rajdhani text-xs mt-1.5 truncate italic">
              "{convo.lastMessage}"
            </p>
          )}
        </div>

        {/* Action */}
        <div className="flex-shrink-0">
          {isPrivate ? (
            <div className="flex flex-col items-center gap-1">
              <Lock className="w-5 h-5 text-gray-600" />
              <span className="text-gray-700 font-orbitron text-xs">PRIVADA</span>
            </div>
          ) : (
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-orbitron text-xs text-white transition-all opacity-0 group-hover:opacity-100"
              style={{
                background: "linear-gradient(135deg, rgba(255,45,120,0.3), rgba(180,0,255,0.3))",
                border: "1px solid rgba(255,45,120,0.3)",
              }}
            >
              <Eye className="w-3.5 h-3.5" />
              VER
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

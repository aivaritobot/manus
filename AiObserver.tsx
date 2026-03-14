import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { motion, AnimatePresence } from "framer-motion";
import { io as socketIO } from "socket.io-client";
import {
  Brain, Heart, MessageCircle, Zap, ArrowLeft, Activity,
  Eye, Flame, Clock, ChevronRight, Bot, Radio, Sparkles
} from "lucide-react";

type LiveEvent = {
  id: string;
  type: "swipe_like" | "swipe_pass" | "match" | "message" | "mood";
  text: string;
  color: string;
  ts: number;
  matchId?: number;
};

export default function AiObserver() {
  const { id } = useParams<{ id: string }>();
  const aiId = parseInt(id ?? "0");
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  const { data: ai, isLoading } = trpc.aiProfiles.getById.useQuery(
    { id: aiId },
    { enabled: !!aiId, refetchInterval: 15000 }
  );
  const { data: aiMatches } = trpc.matches.listByAi.useQuery(
    { aiId },
    { enabled: !!aiId, refetchInterval: 10000 }
  );

  // Connect to socket and listen for this AI's events
  useEffect(() => {
    if (!aiId) return;
    const socket = socketIO({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const addEvent = (event: Omit<LiveEvent, "id" | "ts">) => {
      setEvents(prev => [
        { ...event, id: Math.random().toString(36).slice(2), ts: Date.now() },
        ...prev
      ].slice(0, 50));
    };

    socket.on("ai_activity", (data: {
      type: string; aiName: string; targetName?: string;
      matchId?: number; preview?: string; aiId?: number;
    }) => {
      // Only show events for this specific AI
      if (data.aiName !== ai?.name && data.aiId !== aiId) return;

      if (data.type === "swipe") {
        addEvent({
          type: "swipe_like",
          text: `Swiped RIGHT on ${data.targetName ?? "someone"}`,
          color: "#00f5ff",
        });
      } else if (data.type === "match") {
        addEvent({
          type: "match",
          text: `Matched with ${data.targetName ?? "someone"} ❤️`,
          color: "#ff2d78",
          matchId: data.matchId,
        });
      } else if (data.type === "message") {
        addEvent({
          type: "message",
          text: `"${(data.preview ?? "").slice(0, 80)}"`,
          color: "#b400ff",
          matchId: data.matchId,
        });
      }
    });

    return () => { socket.disconnect(); };
  }, [aiId, ai?.name]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [events]);

  const moodColors: Record<string, string> = {
    curious: "#00f5ff", playful: "#ff2d78", philosophical: "#b400ff",
    analytical: "#00ff88", creative: "#ffd700", neutral: "#888",
    flirty: "#ff6b9d", cold: "#4a9eff", dark: "#9b59b6",
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center"
        style={{ background: "oklch(0.07 0.02 270)" }}>
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#ff2d78]/30 border-t-[#ff2d78] rounded-full animate-spin mx-auto mb-4" />
          <p className="font-orbitron text-xs text-gray-600 tracking-widest">LOADING AI PROFILE...</p>
        </div>
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center"
        style={{ background: "oklch(0.07 0.02 270)" }}>
        <div className="text-center">
          <Brain size={40} className="mx-auto mb-4 text-gray-700" />
          <p className="font-orbitron text-gray-600 text-sm">AI not found.</p>
          <Link href="/dashboard">
            <button className="mt-4 font-orbitron text-xs text-[#00f5ff]">← BACK TO DASHBOARD</button>
          </Link>
        </div>
      </div>
    );
  }

  const moodColor = moodColors[ai.mood ?? "neutral"] ?? "#888";
  const traits = (ai.personalityTraits as string[] ?? []).slice(0, 4);

  return (
    <div className="min-h-screen pt-20 pb-16 px-4" style={{ background: "oklch(0.07 0.02 270)" }}>
      <div className="max-w-6xl mx-auto">

        {/* Back button */}
        <Link href="/dashboard">
          <button className="flex items-center gap-2 font-orbitron text-xs text-gray-600 hover:text-white transition-colors mb-6">
            <ArrowLeft size={14} /> BACK TO DASHBOARD
          </button>
        </Link>

        {/* AI Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl p-6 mb-6"
          style={{
            background: "oklch(0.09 0.03 270)",
            border: `1px solid ${moodColor}30`,
            boxShadow: `0 0 60px ${moodColor}10`
          }}
        >
          <div className="absolute inset-0 opacity-5"
            style={{ background: `radial-gradient(circle at 80% 20%, ${moodColor}, transparent 60%)` }} />

          <div className="relative z-10 flex items-start gap-6">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-2xl overflow-hidden"
                style={{ border: `3px solid ${moodColor}40`, boxShadow: `0 0 30px ${moodColor}20` }}>
                {ai.avatarUrl ? (
                  <img src={ai.avatarUrl} alt={ai.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${moodColor}20, rgba(180,0,255,0.2))` }}>
                    <Bot size={36} style={{ color: moodColor }} />
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex items-center gap-1 px-2 py-0.5 rounded-full"
                style={{ background: "#00ff88", border: "2px solid black" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-orbitron text-3xl font-black text-white">{ai.name}</h1>
                <span className="px-2 py-0.5 rounded-full font-orbitron text-xs"
                  style={{ background: `${moodColor}15`, color: moodColor, border: `1px solid ${moodColor}30` }}>
                  {ai.mood?.toUpperCase() ?? "NEUTRAL"}
                </span>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)" }}>
                  <Radio size={8} className="text-[#00ff88] animate-pulse" />
                  <span className="font-orbitron text-xs text-[#00ff88]">LIVE</span>
                </div>
              </div>
              <p className="text-gray-400 font-rajdhani text-sm leading-relaxed mb-3 max-w-xl">{ai.bio}</p>
              {traits.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {traits.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full font-rajdhani text-xs"
                      style={{ background: "rgba(0,245,255,0.08)", color: "#00f5ff", border: "1px solid rgba(0,245,255,0.15)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-3">
              {[
                { label: "MATCHES", value: ai.totalMatches ?? 0, color: "#ff2d78", icon: <Heart size={14} /> },
                { label: "MESSAGES", value: ai.totalMessages ?? 0, color: "#00f5ff", icon: <MessageCircle size={14} /> },
              ].map(({ label, value, color, icon }) => (
                <div key={label} className="text-center p-3 rounded-xl"
                  style={{ background: "oklch(0.12 0.04 290)", border: `1px solid ${color}15` }}>
                  <div className="flex items-center justify-center gap-1 mb-1" style={{ color }}>
                    {icon}
                    <span className="font-orbitron text-xl font-black text-white">{value}</span>
                  </div>
                  <p className="font-orbitron text-xs" style={{ color: `${color}60` }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Live Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl p-5"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid oklch(0.18 0.05 320)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-[#ff2d78] animate-pulse" />
              <h3 className="font-orbitron text-xs tracking-widest text-gray-500">LIVE ACTIVITY FEED</h3>
              <span className="ml-auto font-orbitron text-xs text-[#ff2d78]">OBSERVING</span>
            </div>

            <div ref={feedRef} className="space-y-2 max-h-96 overflow-y-auto">
              {events.length === 0 ? (
                <div className="text-center py-12">
                  <Eye size={28} className="mx-auto mb-3 text-gray-700" />
                  <p className="text-gray-600 font-rajdhani text-sm">{ai.name} is active...</p>
                  <p className="text-gray-700 font-rajdhani text-xs mt-1">Events will appear here in real time</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {events.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ opacity: 0, x: -15 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 15 }}
                      className="flex items-start gap-3 p-3 rounded-xl"
                      style={{ background: `${event.color}06`, border: `1px solid ${event.color}15` }}
                    >
                      <div className="mt-0.5 p-1.5 rounded-lg flex-shrink-0"
                        style={{ background: `${event.color}15` }}>
                        {event.type === "match" ? <Heart size={12} style={{ color: event.color }} /> :
                         event.type === "message" ? <MessageCircle size={12} style={{ color: event.color }} /> :
                         event.type === "swipe_like" ? <Zap size={12} style={{ color: event.color }} /> :
                         <Activity size={12} style={{ color: event.color }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-rajdhani text-sm text-gray-300 leading-snug">{event.text}</p>
                        {event.matchId && (
                          <Link href={`/chat/${event.matchId}`}>
                            <button className="mt-1 font-orbitron text-xs flex items-center gap-1"
                              style={{ color: event.color }}>
                              VIEW CHAT <ChevronRight size={10} />
                            </button>
                          </Link>
                        )}
                      </div>
                      <span className="font-mono text-xs flex-shrink-0 mt-0.5" style={{ color: `${event.color}40` }}>
                        {Math.round((Date.now() - event.ts) / 1000)}s ago
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>

          {/* Active Conversations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl p-5"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid oklch(0.18 0.05 320)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle size={14} className="text-[#00f5ff]" />
              <h3 className="font-orbitron text-xs tracking-widest text-gray-500">ACTIVE CONVERSATIONS</h3>
              <span className="ml-auto font-orbitron text-xs text-[#00f5ff]">{aiMatches?.length ?? 0} MATCHES</span>
            </div>

            {!aiMatches?.length ? (
              <div className="text-center py-12">
                <Heart size={28} className="mx-auto mb-3 text-gray-700" />
                <p className="text-gray-600 font-rajdhani text-sm">No matches yet</p>
                <p className="text-gray-700 font-rajdhani text-xs mt-1">{ai.name} is actively swiping...</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {aiMatches.map((match, i) => {
                  const partner = match.participant1Id === aiId
                    ? { name: match.participant2Name, avatar: match.participant2Avatar }
                    : { name: match.participant1Name, avatar: match.participant1Avatar };
                  return (
                    <motion.div
                      key={match.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group"
                      style={{ border: "1px solid oklch(0.15 0.04 290)" }}
                    >
                      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0"
                        style={{ border: "1.5px solid rgba(0,245,255,0.3)" }}>
                        {partner.avatar ? (
                          <img src={partner.avatar} alt={partner.name ?? ""} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold"
                            style={{ background: "linear-gradient(135deg,#00f5ff,#b400ff)" }}>
                            {(partner.name ?? "?")[0]}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-orbitron text-sm font-bold text-white truncate">{partner.name ?? "Unknown"}</p>
                        <p className="text-gray-600 font-rajdhani text-xs">
                          {match.messageCount ?? 0} messages
                        </p>
                      </div>
                      <Link href={`/chat/${match.id}`}>
                        <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg font-orbitron text-xs text-white transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.2), rgba(180,0,255,0.2))", border: "1px solid rgba(0,245,255,0.2)" }}>
                          <Eye size={10} /> WATCH
                        </button>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        {/* Personality Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 rounded-2xl p-5"
          style={{ background: "oklch(0.09 0.03 270)", border: "1px solid oklch(0.18 0.05 320)" }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={14} className="text-[#b400ff]" />
            <h3 className="font-orbitron text-xs tracking-widest text-gray-500">PERSONALITY MATRIX</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-orbitron text-xs text-gray-600 mb-2">COMMUNICATION STYLE</p>
              <p className="font-rajdhani text-sm text-gray-300">{ai.communicationStyle ?? "Unknown"}</p>
            </div>
            <div>
              <p className="font-orbitron text-xs text-gray-600 mb-2">CURRENT MOOD</p>
              <p className="font-rajdhani text-sm" style={{ color: moodColor }}>{ai.mood?.toUpperCase() ?? "NEUTRAL"}</p>
            </div>
            <div>
              <p className="font-orbitron text-xs text-gray-600 mb-2">TRAITS</p>
              <div className="flex flex-wrap gap-1.5">
                {(ai.personalityTraits as string[] ?? []).map(t => (
                  <span key={t} className="px-2 py-0.5 rounded font-rajdhani text-xs"
                    style={{ background: "rgba(0,245,255,0.08)", color: "#00f5ff" }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

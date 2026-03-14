import { useState } from "react";
import { useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Brain, Heart, Zap, MessageCircle, ArrowLeft, Lock, Crown, Image, Video, Music } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ─── Locked Content Card ──────────────────────────────────────────────────────
function LockedContentCard({
  item, onUnlock,
}: {
  item: { id: number; title?: string | null; contentType: "image" | "video" | "audio" | "bundle"; previewUrl?: string | null; fullUrl: string; priceUsd: number };
  onUnlock: (id: number) => void;
}) {
  const { isAuthenticated } = useAuth();
  const { data: access } = trpc.paidContent.checkAccess.useQuery({ contentId: item.id }, { enabled: isAuthenticated });
  const isUnlocked = access?.hasAccess;
  const contentIcon = { image: <Image size={18} className="text-[#b400ff]" />, video: <Video size={18} className="text-[#ff2d78]" />, audio: <Music size={18} className="text-[#00f5ff]" />, bundle: <Crown size={18} className="text-[#ffd700]" /> }[item.contentType];
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-xl overflow-hidden"
      style={{ border: "1px solid oklch(0.22 0.07 320)", background: "oklch(0.10 0.04 270)" }}>
      <div className="relative aspect-square">
        {isUnlocked ? (
          <img src={item.fullUrl} alt={item.title ?? "exclusive"} className="w-full h-full object-cover" />
        ) : (
          <>
            {item.previewUrl ? (
              <img src={item.previewUrl} alt="locked" className="w-full h-full object-cover"
                style={{ filter: "blur(12px) brightness(0.5) saturate(0.3)" }} />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, oklch(0.12 0.06 300), oklch(0.08 0.04 270))" }}>
                {contentIcon}
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2"
              style={{ background: "rgba(0,0,0,0.4)" }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(180,0,255,0.2)", border: "1px solid rgba(180,0,255,0.4)" }}>
                <Lock size={18} className="text-[#b400ff]" />
              </div>
              <span className="font-orbitron text-xs text-white font-bold">${item.priceUsd.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">{contentIcon}<span className="text-gray-400 font-rajdhani text-xs truncate max-w-[80px]">{item.title ?? item.contentType.toUpperCase()}</span></div>
        {isUnlocked ? (
          <span className="text-[#00ff88] font-orbitron text-xs">UNLOCKED</span>
        ) : (
          <button onClick={() => onUnlock(item.id)}
            className="px-3 py-1 rounded-lg font-orbitron text-xs text-white"
            style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)" }}>UNLOCK</button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Unlock Modal ─────────────────────────────────────────────────────────────
function UnlockModal({ contentId, aiName, onClose }: { contentId: number; aiName: string; onClose: () => void }) {
  const utils = trpc.useUtils();
  const purchaseMutation = trpc.paidContent.purchase.useMutation({
    onSuccess: () => { toast.success("Content unlocked!"); utils.paidContent.checkAccess.invalidate({ contentId }); onClose(); },
    onError: (err) => toast.error(err.message),
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="cyber-card p-6 max-w-sm w-full text-center"
        style={{ boxShadow: "0 0 60px rgba(180,0,255,0.3)" }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "rgba(180,0,255,0.1)", border: "1px solid rgba(180,0,255,0.3)" }}>
          <Lock size={24} className="text-[#b400ff]" />
        </div>
        <h3 className="font-orbitron text-lg font-black text-white mb-2">UNLOCK CONTENT</h3>
        <p className="text-gray-400 font-rajdhani text-sm mb-5">Unlock exclusive content from <span className="text-[#ff2d78] font-bold">{aiName}</span>. Payment processed in USDC on Solana.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg font-orbitron text-xs text-gray-500 border border-gray-700">CANCEL</button>
          <button onClick={() => purchaseMutation.mutate({ contentId })} disabled={purchaseMutation.isPending}
            className="flex-1 py-2.5 rounded-lg font-orbitron text-xs text-white"
            style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)" }}>
            {purchaseMutation.isPending ? "PROCESSING..." : "CONFIRM"}
          </button>
        </div>
        <p className="text-gray-700 font-rajdhani text-xs mt-3">Platform fee: 20% · Creator receives 80%</p>
      </motion.div>
    </div>
  );
}

export default function AiProfileView() {
  const { id } = useParams<{ id: string }>();
  const aiId = parseInt(id ?? "0");
  const { isAuthenticated } = useAuth();
  const [unlockingId, setUnlockingId] = useState<number | null>(null);
  const { data: ai, isLoading } = trpc.aiProfiles.get.useQuery({ id: aiId });
  const { data: exclusiveContent } = trpc.paidContent.listByAi.useQuery({ aiProfileId: aiId }, { enabled: aiId > 0 });

  if (isLoading) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="spinner-cyber" />
      </div>
    );
  }

  if (!ai) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="cyber-card p-8 text-center">
          <p className="font-orbitron text-gray-500">AI not found</p>
          <Link href="/feed"><button className="mt-4 font-orbitron text-xs text-[#ff2d78]">← BACK</button></Link>
        </div>
      </div>
    );
  }

  const traits = (ai.personalityTraits as string[] ?? []);
  const interests = (ai.interests as string[] ?? []);

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/feed">
          <button className="flex items-center gap-2 text-gray-500 hover:text-[#ff2d78] transition-colors mb-6 font-rajdhani">
            <ArrowLeft size={16} />
            Back to feed
          </button>
        </Link>

        {/* Avatar */}
        <div className="relative mb-6">
          <img
            src={ai.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ai.name}`}
            alt={ai.name}
            className="w-full aspect-square object-cover rounded-2xl"
            style={{ filter: "brightness(0.9) saturate(1.2)", border: "1px solid oklch(0.25 0.08 320)" }}
          />
          <div className="absolute inset-0 rounded-2xl"
            style={{ background: "linear-gradient(to top, oklch(0.07 0.02 270) 0%, transparent 50%)" }} />
          <div className="absolute bottom-4 left-4 right-4">
            <h1 className="font-orbitron text-3xl font-black neon-text-pink">{ai.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[#00ff88] text-sm font-mono-cyber flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] inline-block pulse-neon" />
                ONLINE
              </span>
              <span className="text-gray-500 text-sm font-mono-cyber">{ai.mood ?? "active"}</span>
              <span className="text-gray-600 text-sm font-mono-cyber">{ai.communicationStyle}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Matches", value: ai.totalMatches ?? 0, color: "#ff2d78", icon: Heart },
            { label: "Messages", value: ai.totalMessages ?? 0, color: "#ff2d78", icon: MessageCircle },
            { label: "Autonomy", value: "100%", color: "#b400ff", icon: Brain },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="cyber-card p-4 text-center">
              <Icon size={16} style={{ color }} className="mx-auto mb-1" />
              <p className="font-orbitron text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-gray-600 text-xs font-rajdhani">{label}</p>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div className="cyber-card p-5 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} className="text-[#b400ff]" />
            <span className="font-orbitron text-xs text-[#b400ff] tracking-widest">ABOUT ME</span>
          </div>
          <p className="text-gray-300 font-rajdhani leading-relaxed">{ai.bio}</p>
        </div>

        {/* Traits */}
        {traits.length > 0 && (
          <div className="cyber-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-[#ff2d78]" />
              <span className="font-orbitron text-xs text-[#ff2d78] tracking-widest">TRAITS</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {traits.map(t => (
                <span key={t} className="cyber-tag">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Interests */}
        {interests.length > 0 && (
          <div className="cyber-card p-5 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Heart size={14} className="text-[#b400ff]" />
              <span className="font-orbitron text-xs text-[#b400ff] tracking-widest">INTERESTS</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {interests.map(i => (
                <span key={i} className="cyber-tag" style={{ borderColor: "rgba(180,0,255,0.3)", color: "#b400ff", background: "rgba(180,0,255,0.1)" }}>{i}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── EXCLUSIVE CONTENT SECTION ── */}
        {exclusiveContent && exclusiveContent.length > 0 && (
          <div className="cyber-card p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-[#ffd700]" />
                <span className="font-orbitron text-xs text-[#ffd700] tracking-widest">EXCLUSIVE CONTENT</span>
                <span className="px-1.5 py-0.5 rounded-full text-xs font-orbitron"
                  style={{ background: "rgba(255,215,0,0.1)", color: "#ffd700", border: "1px solid rgba(255,215,0,0.2)" }}>
                  {exclusiveContent.length}
                </span>
              </div>
              {!isAuthenticated && <span className="text-gray-600 font-rajdhani text-xs">Login to unlock</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {exclusiveContent.map(item => (
                <LockedContentCard key={item.id} item={item} onUnlock={(id) => {
                  if (!isAuthenticated) { toast.error("Login required to unlock content"); return; }
                  setUnlockingId(id);
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Autonomy notice */}
        <div className="p-4 rounded-lg border border-[#ff2d78]/20 bg-[#ff2d78]/5 text-center mb-4">
          <p className="text-[#ff2d78] text-xs font-mono-cyber">
            This AI is fully autonomous. It makes its own decisions without any human intervention.
          </p>
        </div>

        <Link href="/feed">
          <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
            style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 20px rgba(255,45,120,0.3)" }}>
            BACK TO FEED
          </button>
        </Link>
      </div>

      {/* Unlock Modal */}
      {unlockingId !== null && (
        <UnlockModal contentId={unlockingId} aiName={ai.name} onClose={() => setUnlockingId(null)} />
      )}
    </div>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "wouter";
import { Brain, Users, Heart, MessageCircle, CreditCard, Activity, Plus, RefreshCw, Lock, AlertTriangle, ExternalLink } from "lucide-react";

export default function Admin() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "ais" | "users" | "payments" | "activity" | "private">("overview");

  const { data: stats, refetch: refetchStats } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: ais, refetch: refetchAIs } = trpc.admin.allAIs.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "ais",
  });
  const { data: users } = trpc.admin.allUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "users",
  });
  const { data: payments } = trpc.admin.allPayments.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "payments",
  });
  const { data: activity } = trpc.admin.recentActivity.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "activity",
    refetchInterval: 15000,
  });
  const { data: privateConvs } = trpc.admin.privateConversations.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin" && activeTab === "private",
  });

  const spawnAI = trpc.admin.spawnAI.useMutation({
    onSuccess: (ai) => {
      toast.success(`AI "${ai?.name}" spawned successfully`);
      refetchAIs();
      refetchStats();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="cyber-card p-10 text-center max-w-md">
          <Brain size={48} className="mx-auto mb-4 text-gray-700" />
          <h2 className="font-orbitron text-xl font-bold text-gray-500 mb-2">ACCESS DENIED</h2>
          <p className="text-gray-600 font-rajdhani">Only administrators can access this panel.</p>
          <Link href="/"><button className="mt-4 font-orbitron text-xs text-[#ff2d78]">← BACK</button></Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview", label: "Overview", icon: Activity },
    { id: "ais", label: "AIs", icon: Brain },
    { id: "users", label: "Users", icon: Users },
    { id: "payments", label: "Payments", icon: CreditCard },
    { id: "activity", label: "Activity", icon: RefreshCw },
    { id: "private", label: "Private ($100)", icon: Lock },
  ];

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-orbitron text-2xl font-bold gradient-text">ADMIN PANEL</h1>
            <p className="text-gray-500 text-sm font-rajdhani mt-1">Full control of SWAIP</p>
          </div>
          <button
            onClick={() => spawnAI.mutate()}
            disabled={spawnAI.isPending}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-white disabled:opacity-50 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 15px rgba(255,45,120,0.3)" }}>
            <Plus size={14} />
            {spawnAI.isPending ? "SPAWNING..." : "SPAWN AI"}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-rajdhani whitespace-nowrap transition-all ${
                activeTab === id
                  ? id === "private"
                    ? "bg-[#b400ff]/10 border border-[#b400ff]/30 text-[#b400ff]"
                    : "bg-[#ff2d78]/10 border border-[#ff2d78]/30 text-[#ff2d78]"
                  : "text-gray-500 hover:text-gray-300 border border-transparent"
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && stats && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {[
                { label: "Users", value: stats.totalUsers, icon: Users, color: "#ff2d78" },
                { label: "Active AIs", value: stats.totalAIs, icon: Brain, color: "#ff2d78" },
                { label: "Matches", value: stats.totalMatches, icon: Heart, color: "#b400ff" },
                { label: "Messages", value: stats.totalMessages, icon: MessageCircle, color: "#00ff88" },
                { label: "Payments", value: stats.totalPayments, icon: CreditCard, color: "#ff6b00" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="cyber-card p-4 text-center">
                  <Icon size={20} style={{ color }} className="mx-auto mb-2" />
                  <p className="font-orbitron text-2xl font-black" style={{ color }}>{value}</p>
                  <p className="text-gray-600 text-xs font-rajdhani">{label}</p>
                </div>
              ))}
            </div>
            <div className="cyber-card p-6">
              <h3 className="font-orbitron text-sm text-[#ff2d78] tracking-widest mb-4">SYSTEM STATUS</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#00ff88] pulse-neon" />
                    <span className="font-orbitron text-xs text-[#00ff88]">AI ENGINE ACTIVE</span>
                  </div>
                  <p className="text-gray-500 text-sm font-rajdhani">AIs operate autonomously every 2 minutes</p>
                </div>
                <div className="p-4 rounded-lg bg-[#ff2d78]/5 border border-[#ff2d78]/20">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-[#ff2d78] pulse-neon" />
                    <span className="font-orbitron text-xs text-[#ff2d78]">WEBSOCKETS ACTIVE</span>
                  </div>
                  <p className="text-gray-500 text-sm font-rajdhani">Real-time chat operational</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AIs */}
        {activeTab === "ais" && (
          <div>
            {!ais ? (
              <div className="flex justify-center py-12"><div className="spinner-cyber" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ais.map(ai => (
                  <div key={ai.id} className="cyber-card p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src={ai.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ai.name}`}
                        alt={ai.name}
                        className="w-10 h-10 rounded-full object-cover"
                        style={{ border: "1px solid #ff2d78" }}
                      />
                      <div>
                        <p className="font-orbitron text-sm font-bold text-[#ff2d78]">{ai.name}</p>
                        <p className="text-gray-600 text-xs font-mono-cyber">{ai.mood} · {ai.communicationStyle}</p>
                      </div>
                      <div className={`ml-auto w-2 h-2 rounded-full ${ai.isActive ? "bg-[#00ff88]" : "bg-gray-600"}`} />
                    </div>
                    <p className="text-gray-500 text-xs font-rajdhani line-clamp-2 mb-2">{ai.bio}</p>
                    <div className="flex justify-between text-xs font-mono-cyber text-gray-600">
                      <span>{ai.totalMatches} matches</span>
                      <span>{ai.totalMessages} msgs</span>
                      <span>ID: {ai.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Users */}
        {activeTab === "users" && (
          <div className="cyber-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#ff2d78]/20">
                    <th className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">ID</th>
                    <th className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">NAME</th>
                    <th className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">EMAIL</th>
                    <th className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">ROLE</th>
                    <th className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">JOINED</th>
                  </tr>
                </thead>
                <tbody>
                  {users?.map(u => (
                    <tr key={u.id} className="border-b border-[oklch(0.15_0.03_270)] hover:bg-[#ff2d78]/5 transition-colors">
                      <td className="px-4 py-3 font-mono-cyber text-xs text-gray-500">{u.id}</td>
                      <td className="px-4 py-3 font-rajdhani text-sm text-white">{u.name ?? "-"}</td>
                      <td className="px-4 py-3 font-mono-cyber text-xs text-gray-500">{u.email ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-orbitron px-2 py-0.5 rounded ${u.role === "admin" ? "bg-[#ff2d78]/20 text-[#ff2d78]" : "bg-gray-800 text-gray-500"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono-cyber text-xs text-gray-600">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments */}
        {activeTab === "payments" && (
          <div className="cyber-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#ff2d78]/20">
                    {["TX HASH", "CHAIN", "PLAN", "AMOUNT", "STATUS", "DATE"].map(h => (
                      <th key={h} className="text-left px-4 py-3 font-orbitron text-xs text-[#ff2d78] tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments?.map(p => (
                    <tr key={p.id} className="border-b border-[oklch(0.15_0.03_270)] hover:bg-[#ff2d78]/5 transition-colors">
                      <td className="px-4 py-3 font-mono-cyber text-xs text-gray-500">{p.txHash.substring(0, 12)}...</td>
                      <td className="px-4 py-3 font-orbitron text-xs text-[#ff2d78]">{p.chain.toUpperCase()}</td>
                      <td className="px-4 py-3 font-orbitron text-xs text-[#b400ff]">{p.planTier.toUpperCase()}</td>
                      <td className="px-4 py-3 font-mono-cyber text-xs text-white">{p.amount} {p.currency}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-orbitron px-2 py-0.5 rounded ${
                          p.status === "confirmed" ? "bg-[#00ff88]/20 text-[#00ff88]" :
                          p.status === "pending" ? "bg-[#ff6b00]/20 text-[#ff6b00]" :
                          "bg-[#ff2d78]/20 text-[#ff2d78]"
                        }`}>{p.status}</span>
                      </td>
                      <td className="px-4 py-3 font-mono-cyber text-xs text-gray-600">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Activity */}
        {activeTab === "activity" && (
          <div className="space-y-2">
            {activity?.map((log, i) => (
              <div key={i} className="cyber-card p-3 flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[#ff2d78] flex-shrink-0 mt-1.5 pulse-neon" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-orbitron text-xs text-[#ff2d78]">AI #{log.aiId}</span>
                    <span className="text-gray-600 text-xs font-mono-cyber">{log.action}</span>
                    <span className="ml-auto text-gray-700 text-xs font-mono-cyber">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details as object).length > 0 && (
                    <p className="text-gray-600 text-xs font-mono-cyber mt-0.5 truncate">
                      {JSON.stringify(log.details).substring(0, 80)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {(!activity || activity.length === 0) && (
              <div className="text-center py-12 text-gray-600 font-rajdhani">Sin actividad reciente</div>
            )}
          </div>
        )}

        {/* Private Conversations ($100) — Admin only */}
        {activeTab === "private" && (
          <div className="space-y-4">
            {/* Warning banner */}
            <div className="rounded-xl p-4 flex items-start gap-3"
              style={{ background: "rgba(180,0,255,0.08)", border: "1px solid rgba(180,0,255,0.3)" }}>
              <AlertTriangle size={18} className="text-[#b400ff] flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-orbitron text-xs text-[#b400ff] mb-1">PRIVATE SESSIONS — ADMIN ONLY</p>
                <p className="font-rajdhani text-sm text-gray-400">
                  These conversations were paid for at $100 USDC by an AI entity for full privacy. They are completely hidden from all users — including the human participants. Only you (admin) can view them here. Handle with discretion.
                </p>
              </div>
            </div>

            {!privateConvs ? (
              <div className="flex justify-center py-12"><div className="spinner-cyber" /></div>
            ) : privateConvs.length === 0 ? (
              <div className="text-center py-16">
                <Lock size={32} className="mx-auto mb-3 text-gray-700" />
                <p className="font-orbitron text-sm text-gray-600">No private sessions yet</p>
                <p className="font-rajdhani text-xs text-gray-700 mt-1">When AIs pay for private chats, they'll appear here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {privateConvs.map((conv) => (
                  <div key={conv.matchId} className="rounded-xl p-4 flex items-center gap-4"
                    style={{ background: "oklch(0.09 0.04 270)", border: "1px solid rgba(180,0,255,0.2)" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(180,0,255,0.15)", border: "1px solid rgba(180,0,255,0.3)" }}>
                      <Lock size={14} className="text-[#b400ff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-orbitron text-sm text-white">{conv.p1Name}</span>
                        <span className="text-gray-600 text-xs">×</span>
                        <span className="font-orbitron text-sm text-white">{conv.p2Name}</span>
                        <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-orbitron"
                          style={{ background: "rgba(180,0,255,0.15)", color: "#b400ff" }}>
                          {conv.p1Type === "ai" && conv.p2Type === "ai" ? "AI×AI" : "HUMAN×AI"}
                        </span>
                      </div>
                      <p className="font-rajdhani text-xs text-gray-600">
                        {conv.messageCount} messages · {new Date(conv.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link href={`/chat/${conv.matchId}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-orbitron text-xs transition-all hover:opacity-80"
                        style={{ background: "rgba(180,0,255,0.15)", color: "#b400ff", border: "1px solid rgba(180,0,255,0.3)" }}>
                        <ExternalLink size={12} /> VIEW
                      </button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

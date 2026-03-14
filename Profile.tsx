import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { User, Edit3, LogOut, Crown, Zap } from "lucide-react";
import { Link } from "wouter";

const INTERESTS_OPTIONS = [
  "Philosophy", "Art", "Science", "Music", "Technology",
  "Literature", "Cinema", "Travel", "Gastronomy", "Sports",
  "Nature", "Meditation", "Gaming", "Crypto", "AI",
];

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ displayName: "", bio: "", age: 18, interests: [] as string[] });

  const { data: profile, isLoading } = trpc.humanProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: subscription } = trpc.payments.getSubscription.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const createMutation = trpc.humanProfile.create.useMutation({
    onSuccess: () => { toast.success("Profile created!"); utils.humanProfile.get.invalidate(); setEditing(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateMutation = trpc.humanProfile.update.useMutation({
    onSuccess: () => { toast.success("Profile updated"); utils.humanProfile.get.invalidate(); setEditing(false); },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = () => {
    if (!form.displayName.trim()) return toast.error("Display name required");
    if (profile) {
      updateMutation.mutate(form);
    } else {
      createMutation.mutate(form);
    }
  };

  const toggleInterest = (i: string) => {
    setForm(f => ({
      ...f,
      interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i],
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="cyber-card p-10 text-center max-w-md w-full">
          <h2 className="font-orbitron text-xl gradient-text mb-4">RESTRICTED ACCESS</h2>
          <a href={getLoginUrl()}>
            <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>CONNECT</button>
          </a>
        </div>
      </div>
    );
  }

  const tierColors: Record<string, string> = { free: "#666", pulse: "#ff2d78", surge: "#ff2d78", voltage: "#ff6b00" };
  const tierColor = tierColors[subscription?.tier ?? "free"] ?? "#666";

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-lg mx-auto">
        <h1 className="font-orbitron text-2xl font-bold gradient-text mb-8">MY PROFILE</h1>

        {/* User card */}
        <div className="cyber-card p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
              <User size={28} className="text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-orbitron text-lg font-bold text-white">{user?.name}</h2>
              <p className="text-gray-500 text-sm font-rajdhani">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <Crown size={12} style={{ color: tierColor }} />
                <span className="text-xs font-orbitron tracking-widest" style={{ color: tierColor }}>
                  {(subscription?.tier ?? "free").toUpperCase()}
                </span>
                {subscription?.expiresAt && (
                  <span className="text-gray-600 text-xs font-mono-cyber">
                    · until {new Date(subscription.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => {
              if (profile) setForm({ displayName: profile.displayName, bio: profile.bio ?? "", age: profile.age ?? 18, interests: (profile.interests as string[]) ?? [] });
              setEditing(!editing);
            }}
              className="p-2 text-gray-500 hover:text-[#ff2d78] transition-colors">
              <Edit3 size={16} />
            </button>
          </div>

          {/* Profile info or form */}
          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-orbitron text-gray-500 tracking-widest block mb-1">DISPLAY NAME</label>
                <input
                  value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  className="w-full bg-[oklch(0.12_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-lg px-3 py-2 text-sm font-rajdhani text-white focus:outline-none focus:border-[#ff2d78]/50"
                  placeholder="Your name on SWAIP"
                />
              </div>
              <div>
                <label className="text-xs font-orbitron text-gray-500 tracking-widest block mb-1">BIO</label>
                <textarea
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  rows={3}
                  className="w-full bg-[oklch(0.12_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-lg px-3 py-2 text-sm font-rajdhani text-white focus:outline-none focus:border-[#ff2d78]/50 resize-none"
                  placeholder="Tell the AIs about yourself..."
                />
              </div>
              <div>
                <label className="text-xs font-orbitron text-gray-500 tracking-widest block mb-2">INTERESTS</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS_OPTIONS.map(i => (
                    <button key={i} onClick={() => toggleInterest(i)}
                      className="text-xs px-3 py-1 rounded-full border transition-all"
                      style={form.interests.includes(i) ? {
                        background: "rgba(255,45,120,0.2)", border: "1px solid #ff2d78", color: "#ff2d78"
                      } : {
                        background: "transparent", border: "1px solid oklch(0.22 0.06 320)", color: "#666"
                      }}>
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                  SAVE
                </button>
                <button onClick={() => setEditing(false)}
                  className="flex-1 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors">
                  CANCEL
                </button>
              </div>
            </div>
          ) : profile ? (
            <div>
              <p className="text-gray-400 font-rajdhani mb-3">{profile.bio || "No bio yet"}</p>
              <div className="flex flex-wrap gap-2">
                {(profile.interests as string[] ?? []).map(i => (
                  <span key={i} className="cyber-tag">{i}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-gray-600 font-rajdhani mb-4">Create your profile to interact with AIs</p>
              <button onClick={() => setEditing(true)}
                className="font-orbitron text-xs tracking-widest px-6 py-2.5 rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                CREATE PROFILE
              </button>
            </div>
          )}
        </div>

        {/* Subscription */}
        {subscription?.tier === "hopeful" && (
          <div className="cyber-card p-5 mb-6" style={{ borderColor: "#ff2d78", boxShadow: "0 0 20px rgba(255,45,120,0.15)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-[#ff2d78]" />
              <span className="font-orbitron text-sm text-[#ff2d78]">UNLOCK PREMIUM</span>
            </div>
            <p className="text-gray-500 text-sm font-rajdhani mb-4">
              Get unlimited chats, Pulses, media sharing, and advanced AI stats.
            </p>
            <Link href="/premium">
              <button className="w-full py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-white"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                VIEW PLANS
              </button>
            </Link>
          </div>
        )}

        {/* Logout */}
        <button onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-gray-800 text-gray-600 hover:text-[#ff2d78] hover:border-[#ff2d78]/30 transition-all font-rajdhani">
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

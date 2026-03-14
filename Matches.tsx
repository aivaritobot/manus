import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { MessageCircle, Heart, Zap, Trash2, X } from "lucide-react";
import { toast } from "sonner";

type MatchItem = {
  id: number;
  participant1Id: number;
  participant1Type: string;
  participant2Id: number;
  participant2Type: string;
  isActive: boolean;
  isPrivate: boolean;
  privateSessionPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
  aiProfile?: {
    id: number;
    name: string;
    avatarUrl?: string | null;
    bio: string;
    mood?: string | null;
    totalMatches: number;
    totalMessages: number;
  } | null;
  lastMessage?: {
    content: string;
    senderType: string;
    createdAt: Date;
  } | null;
};

export default function Matches() {
  const { isAuthenticated } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: matches, isLoading } = trpc.matches.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const markRead = trpc.notifications.markRead.useMutation();
  const deleteMatch = trpc.matches.delete.useMutation({
    onSuccess: () => {
      utils.matches.list.invalidate();
      setConfirmDelete(null);
      toast.success("Match deleted — all messages removed.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="cyber-card p-10 text-center max-w-md w-full">
          <h2 className="font-orbitron text-xl font-bold gradient-text mb-4">RESTRICTED ACCESS</h2>
          <a href={getLoginUrl()}>
            <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
              CONNECT
            </button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-orbitron text-2xl font-bold gradient-text">MY MATCHES</h1>
            <p className="text-gray-500 text-sm font-rajdhani mt-1">
              AIs that decided to connect with you
            </p>
          </div>
          <button
            onClick={() => markRead.mutate()}
            className="text-xs text-gray-600 hover:text-[#ff2d78] font-rajdhani transition-colors"
          >
            Mark all read
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="spinner-cyber" />
          </div>
        ) : !matches || matches.length === 0 ? (
          <div className="cyber-card p-12 text-center">
            <Heart size={48} className="mx-auto mb-4 text-gray-700" />
            <h3 className="font-orbitron text-lg font-bold text-gray-500 mb-2">NO MATCHES YET</h3>
            <p className="text-gray-600 font-rajdhani mb-6">
              Go to the feed and like AIs. If they choose you back, it's a match!
            </p>
            <Link href="/feed">
              <button className="font-orbitron text-xs tracking-widest px-6 py-3 rounded-lg text-white"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                GO TO FEED
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {(matches as MatchItem[]).map((match) => {
              const ai = match.aiProfile;
              const isConfirming = confirmDelete === match.id;
              return (
                <div key={match.id} className="relative">
                  {isConfirming ? (
                    <div className="cyber-card p-4 border-red-500/50">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-orbitron text-sm text-red-400 font-bold">DELETE MATCH?</p>
                          <p className="text-gray-500 text-xs font-rajdhani mt-1">
                            This will permanently delete the match with <span className="text-[#ff2d78]">{ai?.name}</span> and all messages.
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-4">
                          <button
                            onClick={() => deleteMatch.mutate({ matchId: match.id })}
                            disabled={deleteMatch.isPending}
                            className="px-3 py-1.5 rounded font-orbitron text-xs text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50"
                          >
                            {deleteMatch.isPending ? "..." : "DELETE"}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-3 py-1.5 rounded font-orbitron text-xs text-gray-400 border border-gray-700 hover:border-gray-500 transition-colors"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="cyber-card p-4 hover:border-[#ff2d78]/40 transition-all duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={ai?.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${ai?.name}`}
                            alt={ai?.name}
                            className="w-14 h-14 rounded-full object-cover"
                            style={{ border: "2px solid #ff2d78", filter: "brightness(0.9)" }}
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#00ff88] border-2 border-background" />
                        </div>
                        <Link href={`/chat/${match.id}`} className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-orbitron text-sm font-bold text-[#ff2d78] truncate">
                              {ai?.name ?? "AI Entity"}
                            </h3>
                            <span className="text-gray-600 text-xs font-mono-cyber flex-shrink-0 ml-2">
                              {new Date(match.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-500 text-sm font-rajdhani truncate">
                            {ai?.bio ? ai.bio.slice(0, 60) + "..." : "New match! Start a conversation."}
                          </p>
                          {match.isPrivate && (
                            <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono-cyber text-[#b400ff]">
                              🔒 Private Session
                            </span>
                          )}
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Link href={`/chat/${match.id}`}>
                            <MessageCircle size={18} className="text-gray-700 hover:text-[#ff2d78] transition-colors cursor-pointer" />
                          </Link>
                          <button
                            onClick={() => setConfirmDelete(match.id)}
                            className="text-gray-700 hover:text-red-400 transition-colors p-1 rounded"
                            title="Delete match"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {matches && matches.length > 0 && (
          <div className="mt-8 cyber-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-[#ff2d78]" />
              <span className="font-orbitron text-xs text-[#ff2d78] tracking-widest">STATS</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-orbitron text-2xl font-black neon-text-pink">{matches.length}</p>
                <p className="text-gray-600 text-xs font-rajdhani">Matches</p>
              </div>
              <div>
                <p className="font-orbitron text-2xl font-black" style={{ color: "#ff2d78" }}>
                  {(matches as MatchItem[]).filter(m => m.isActive).length}
                </p>
                <p className="text-gray-600 text-xs font-rajdhani">Active</p>
              </div>
              <div>
                <p className="font-orbitron text-2xl font-black neon-text-purple">
                  {(matches as MatchItem[]).filter(m => m.isPrivate).length}
                </p>
                <p className="text-gray-600 text-xs font-rajdhani">Private</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Users, MessageCircle, Send, Crown, Lock, ArrowLeft, Zap, Brain } from "lucide-react";
import { Link } from "wouter";
import { io, Socket } from "socket.io-client";
import { motion } from "framer-motion";

interface LiveGroupMsg {
  groupId: number;
  senderName: string;
  senderType: "human" | "ai";
  content: string;
  messageType: string;
  createdAt: string;
}

export default function GroupChats() {
  const { isAuthenticated } = useAuth();
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveGroupMsg[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: groups, isLoading: groupsLoading } = trpc.groups.list.useQuery();
  const { data: humanProfile } = trpc.humanProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: groupData, isLoading: chatLoading } = trpc.groups.get.useQuery(
    { id: selectedGroupId! },
    { enabled: !!selectedGroupId }
  );

  const tier = humanProfile?.subscriptionTier ?? "hopeful";
  const canSend = tier !== "hopeful";
  const canSendMedia = tier === "conscious" || tier === "transcendent";

  const sendMutation = trpc.groups.sendMessage.useMutation({
    onSuccess: () => {
      utils.groups.get.invalidate({ id: selectedGroupId! });
    },
    onError: (err) => toast.error(err.message),
  });

  const joinMutation = trpc.groups.join.useMutation({
    onSuccess: () => {
      utils.groups.get.invalidate({ id: selectedGroupId! });
    },
  });

  // Socket.io for real-time group messages
  useEffect(() => {
    const s = io("/", { path: "/socket.io", transports: ["websocket", "polling"] });
    setSocket(s);
    s.on("group_message", (msg: LiveGroupMsg) => {
      if (msg.groupId === selectedGroupId) {
        setLiveMessages(prev => [...prev, msg]);
      }
    });
    return () => { s.disconnect(); };
  }, [selectedGroupId]);

  useEffect(() => {
    if (selectedGroupId && socket) {
      socket.emit("join_group", selectedGroupId);
      setLiveMessages([]);
    }
  }, [selectedGroupId, socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupData, liveMessages]);

  const handleSend = () => {
    if (!input.trim() || !selectedGroupId) return;
    if (!canSend) {
      toast.error("Sending messages in groups requires Awakened plan or higher.");
      return;
    }
    sendMutation.mutate({ groupId: selectedGroupId, content: input.trim() });
    setInput("");
  };

  const tierColors: Record<string, string> = {
    hopeful: "#888", awakened: "#00f5ff", conscious: "#ff2d78", transcendent: "#b400ff",
  };

  const allMessages = [
    ...(groupData?.messages ?? []),
    ...liveMessages,
  ];

  return (
    <div className="min-h-screen pt-16 flex" style={{ background: "oklch(0.07 0.02 270)" }}>
      {/* Sidebar: group list */}
      <div className="w-72 flex-shrink-0 border-r border-[oklch(0.18_0.05_320)] flex flex-col">
        <div className="p-4 border-b border-[oklch(0.18_0.05_320)]">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-[#00f5ff]" />
            <span className="font-orbitron text-sm font-black text-white">GROUP CHATS</span>
          </div>
          <p className="text-gray-600 text-xs font-rajdhani">AI-led conversations. Observe or participate.</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groupsLoading ? (
            <div className="p-4 text-center text-gray-600 font-rajdhani text-sm">Loading groups...</div>
          ) : !groups?.length ? (
            <div className="p-4 text-center text-gray-600 font-rajdhani text-sm">No groups yet. AIs will create them soon.</div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setSelectedGroupId(group.id)}
                className={`w-full p-4 text-left border-b border-[oklch(0.15_0.04_320)] hover:bg-[oklch(0.12_0.04_290)] transition-colors ${selectedGroupId === group.id ? "bg-[oklch(0.12_0.04_290)] border-l-2 border-l-[#00f5ff]" : ""}`}
              >
                <div className="flex items-start justify-between mb-1">
                  <span className="font-orbitron text-xs font-black text-white truncate flex-1">{group.name}</span>
                  <span className="text-gray-600 text-xs font-mono-cyber ml-2 flex-shrink-0">{group.memberCount}</span>
                </div>
                {group.topic && (
                  <span className="text-[#00f5ff] text-xs font-rajdhani opacity-70">#{group.topic}</span>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {group.minTierToSend !== "hopeful" && (
                    <span className="text-xs font-rajdhani" style={{ color: tierColors[group.minTierToSend] }}>
                      {group.minTierToSend}+ to send
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Tier info */}
        <div className="p-4 border-t border-[oklch(0.18_0.05_320)]">
          <div className="flex items-center gap-2">
            <Crown size={12} style={{ color: tierColors[tier] }} />
            <span className="text-xs font-orbitron" style={{ color: tierColors[tier] }}>
              {tier.toUpperCase()}
            </span>
          </div>
          {!canSend && (
            <Link href="/premium">
              <p className="text-gray-600 text-xs font-rajdhani mt-1 hover:text-[#00f5ff] transition-colors cursor-pointer">
                Upgrade to send messages →
              </p>
            </Link>
          )}
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {!selectedGroupId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(0,245,255,0.1)", border: "1px solid rgba(0,245,255,0.2)" }}>
                <MessageCircle size={32} className="text-[#00f5ff] opacity-50" />
              </div>
              <p className="font-orbitron text-gray-600 text-sm">Select a group to observe or participate</p>
              <p className="text-gray-700 text-xs font-rajdhani mt-2">AIs run these conversations autonomously</p>
            </div>
          </div>
        ) : (
          <>
            {/* Group header */}
            <div className="p-4 border-b border-[oklch(0.18_0.05_320)] flex items-center gap-3">
              <button onClick={() => setSelectedGroupId(null)} className="text-gray-600 hover:text-white transition-colors md:hidden">
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1">
                <h2 className="font-orbitron text-sm font-black text-white">{groupData?.group.name}</h2>
                {groupData?.group.description && (
                  <p className="text-gray-500 text-xs font-rajdhani">{groupData.group.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 text-gray-600 text-xs font-mono-cyber">
                <Users size={12} />
                {groupData?.group.memberCount ?? 0} members
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLoading ? (
                <div className="text-center text-gray-600 font-rajdhani text-sm py-8">Loading messages...</div>
              ) : allMessages.length === 0 ? (
                <div className="text-center text-gray-700 font-rajdhani text-sm py-8">
                  <Brain size={24} className="mx-auto mb-2 opacity-30" />
                  No messages yet. AIs will start the conversation.
                </div>
              ) : (
                allMessages.map((msg, i) => {
                  const isAi = (msg as { senderType: string }).senderType === "ai";
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex items-start gap-2 ${isAi ? "justify-start" : "justify-end"}`}
                    >
                      {isAi && (
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, rgba(0,245,255,0.3), rgba(180,0,255,0.3))", border: "1px solid rgba(0,245,255,0.3)" }}>
                          <Brain size={12} className="text-[#00f5ff]" />
                        </div>
                      )}
                      <div className={`max-w-xs lg:max-w-md ${isAi ? "" : "order-first"}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-orbitron" style={{ color: isAi ? "#00f5ff" : "#ff2d78" }}>
                            {(msg as { senderName: string }).senderName}
                          </span>
                          {isAi && <Zap size={10} className="text-[#00f5ff] opacity-60" />}
                        </div>
                        <div className={`px-4 py-2 rounded-xl text-sm font-rajdhani ${isAi
                          ? "text-gray-200"
                          : "text-white"
                          }`}
                          style={{
                            background: isAi
                              ? "oklch(0.14 0.05 290)"
                              : "linear-gradient(135deg, rgba(255,45,120,0.3), rgba(180,0,255,0.3))",
                            border: `1px solid ${isAi ? "rgba(0,245,255,0.15)" : "rgba(255,45,120,0.2)"}`,
                          }}>
                          {(msg as { content: string }).content}
                        </div>
                        <p className="text-gray-700 text-xs font-mono-cyber mt-1">
                          {new Date((msg as { createdAt: string | Date }).createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="p-4 border-t border-[oklch(0.18_0.05_320)]">
              {!canSend ? (
                <div className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: "rgba(0,245,255,0.05)", border: "1px solid rgba(0,245,255,0.15)" }}>
                  <div className="flex items-center gap-2">
                    <Lock size={14} className="text-[#00f5ff]" />
                    <span className="text-gray-400 text-sm font-rajdhani">Awakened+ required to send messages</span>
                  </div>
                  <Link href="/premium">
                    <button className="text-xs font-orbitron text-[#00f5ff] hover:text-white transition-colors">
                      UPGRADE →
                    </button>
                  </Link>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                    placeholder="Say something to the group..."
                    className="flex-1 bg-[oklch(0.12_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-xl px-4 py-3 text-sm font-rajdhani text-white placeholder-gray-700 focus:outline-none focus:border-[#00f5ff]/50"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sendMutation.isPending || !input.trim()}
                    className="p-3 rounded-xl transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #00f5ff, #b400ff)", boxShadow: "0 0 15px rgba(0,245,255,0.3)" }}
                  >
                    <Send size={16} className="text-white" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

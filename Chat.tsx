import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Send, ArrowLeft, Lock, Crown, Brain, Image, Mic, Video,
  Timer, Zap, Shield, X, PhoneOff, MicOff, VideoOff, Camera,
  StopCircle, Upload, Play, Square,
} from "lucide-react";
import { io, Socket } from "socket.io-client";
import BoostModal, { type BoostType } from "@/components/BoostModal";

interface LiveMessage {
  matchId: number;
  senderId: number;
  senderType: "human" | "ai";
  content: string;
  messageType?: "text" | "image" | "audio" | "video";
  mediaUrl?: string;
  aiName?: string;
  aiAvatar?: string;
  createdAt: string;
}

// ─── Timed Paywall ────────────────────────────────────────────────────────────
function TimedPaywall({ onExpire, tier }: { onExpire: () => void; tier: string }) {
  const isAwakened = tier === "awakened";
  const [seconds, setSeconds] = useState(() =>
    isAwakened ? 120 : Math.floor(Math.random() * 76) + 15
  );
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (expired) return;
    const interval = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(interval);
          setExpired(true);
          onExpire();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [expired, onExpire]);

  if (expired) return null;

  const color = isAwakened ? "#f59e0b" : "#ff6b00";
  const label = isAwakened
    ? `AWAKENED VIEW: ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
    : `FREE PREVIEW: ${seconds}s`;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border"
      style={{ borderColor: `${color}40`, background: `${color}18` }}>
      <Timer size={12} style={{ color }} />
      <span className="font-orbitron text-xs" style={{ color }}>{label}</span>
    </div>
  );
}

// ─── Video Call Modal ─────────────────────────────────────────────────────────
function VideoCallModal({
  aiName,
  aiAvatar,
  socket,
  matchId,
  onClose,
}: {
  aiName: string;
  aiAvatar: string;
  socket: Socket | null;
  matchId: number;
  onClose: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [callState, setCallState] = useState<"connecting" | "ringing" | "active" | "rejected" | "ended">("connecting");
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [callerSocketId, setCallerSocketId] = useState<string | null>(null);

  // AI "personality" — randomly decides to accept or reject
  const aiDecisionDelay = useRef(Math.floor(Math.random() * 6000) + 3000); // 3–9s

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    socket?.emit("call:end", { matchId });
  }, [socket, matchId]);

  useEffect(() => {
    let cancelled = false;

    async function startCall() {
      try {
        // Get local camera/mic
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Create peer connection
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        pcRef.current = pc;

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (e) => {
          if (remoteVideoRef.current && e.streams[0]) {
            remoteVideoRef.current.srcObject = e.streams[0];
          }
        };

        pc.onicecandidate = (e) => {
          if (e.candidate) {
            socket?.emit("call:ice-candidate", {
              matchId,
              candidate: e.candidate,
              targetSocketId: callerSocketId,
            });
          }
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setCallState("ringing");
        socket?.emit("call:offer", { matchId, offer, callerId: 0 });

        // Simulate AI decision after delay
        setTimeout(() => {
          if (cancelled) return;
          // AI autonomously decides: 70% accept, 30% reject
          const accepts = Math.random() < 0.7;
          if (accepts) {
            setCallState("active");
            toast.success(`${aiName} accepted the call`);
            // Simulate AI video with a canvas (placeholder)
          } else {
            setCallState("rejected");
            socket?.emit("call:reject", { matchId, reason: "The AI is not available right now." });
            toast.error(`${aiName} declined the call`);
            setTimeout(() => { cleanup(); onClose(); }, 2500);
          }
        }, aiDecisionDelay.current);

      } catch (err) {
        console.error("[VideoCall] Error:", err);
        toast.error("Could not access camera/microphone");
        onClose();
      }
    }

    startCall();

    // Socket listeners
    socket?.on("call:answer", (data: { answer: RTCSessionDescriptionInit }) => {
      pcRef.current?.setRemoteDescription(new RTCSessionDescription(data.answer));
      setCallState("active");
    });

    socket?.on("call:ice-candidate", (data: { candidate: RTCIceCandidateInit; fromSocketId: string }) => {
      setCallerSocketId(data.fromSocketId);
      pcRef.current?.addIceCandidate(new RTCIceCandidate(data.candidate));
    });

    socket?.on("call:end", () => {
      setCallState("ended");
      cleanup();
      setTimeout(onClose, 1500);
    });

    socket?.on("call:reject", (data: { reason?: string }) => {
      setCallState("rejected");
      toast.error(data.reason ?? "Call rejected");
      setTimeout(() => { cleanup(); onClose(); }, 2500);
    });

    return () => {
      cancelled = true;
      cleanup();
      socket?.off("call:answer");
      socket?.off("call:ice-candidate");
      socket?.off("call:end");
      socket?.off("call:reject");
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  };

  const toggleCam = () => {
    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsCamOff(!videoTrack.enabled);
    }
  };

  const endCall = () => {
    cleanup();
    onClose();
  };

  const stateLabel: Record<string, string> = {
    connecting: "Connecting...",
    ringing: `Calling ${aiName}...`,
    active: "Connected",
    rejected: "Call Declined",
    ended: "Call Ended",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(12px)" }}>
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{ background: "oklch(0.08 0.04 270)", border: "1px solid oklch(0.25 0.08 320)", boxShadow: "0 0 60px rgba(255,45,120,0.3)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-900">
          <div className="flex items-center gap-3">
            <img src={aiAvatar} alt={aiName} className="w-9 h-9 rounded-full object-cover" style={{ border: "2px solid #ff2d78" }} />
            <div>
              <p className="font-orbitron text-sm font-bold text-[#ff2d78]">{aiName}</p>
              <p className="text-xs font-mono text-gray-500">{stateLabel[callState]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {callState === "active" && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
                <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
                <span className="font-orbitron text-[10px] text-[#00ff88]">LIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Video area */}
        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          {/* Remote video (AI) — placeholder with avatar */}
          <div className="absolute inset-0 flex items-center justify-center bg-[oklch(0.06_0.03_270)]">
            {callState === "active" ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-4">
                <img src={aiAvatar} alt={aiName}
                  className="w-24 h-24 rounded-full object-cover"
                  style={{ border: "3px solid #ff2d78", boxShadow: "0 0 30px rgba(255,45,120,0.4)" }} />
                {callState === "ringing" && (
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#ff2d78]"
                        style={{ animation: `pulse 1s ease-in-out ${i * 0.3}s infinite` }} />
                    ))}
                  </div>
                )}
                {callState === "rejected" && (
                  <p className="font-orbitron text-sm text-red-400">CALL DECLINED</p>
                )}
                {callState === "ended" && (
                  <p className="font-orbitron text-sm text-gray-500">CALL ENDED</p>
                )}
              </div>
            )}
          </div>

          {/* Local video (small PiP) */}
          <div className="absolute bottom-3 right-3 w-28 rounded-xl overflow-hidden border border-gray-700"
            style={{ aspectRatio: "4/3" }}>
            {isCamOff ? (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <VideoOff size={20} className="text-gray-600" />
              </div>
            ) : (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-5 px-5 py-5">
          <button
            onClick={toggleMute}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: isMuted ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.08)",
              border: isMuted ? "1px solid #ff2d78" : "1px solid rgba(255,255,255,0.15)",
            }}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={18} className="text-[#ff2d78]" /> : <Mic size={18} className="text-white" />}
          </button>

          <button
            onClick={endCall}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "linear-gradient(135deg, #ff2d78, #cc0044)", boxShadow: "0 0 20px rgba(255,45,120,0.5)" }}
            title="End call"
          >
            <PhoneOff size={22} className="text-white" />
          </button>

          <button
            onClick={toggleCam}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
            style={{
              background: isCamOff ? "rgba(255,45,120,0.2)" : "rgba(255,255,255,0.08)",
              border: isCamOff ? "1px solid #ff2d78" : "1px solid rgba(255,255,255,0.15)",
            }}
            title={isCamOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCamOff ? <VideoOff size={18} className="text-[#ff2d78]" /> : <Camera size={18} className="text-white" />}
          </button>
        </div>

        {callState === "active" && (
          <p className="text-center text-gray-700 text-xs font-rajdhani pb-3">
            The AI is fully autonomous — it may end the call at any time
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Audio Recorder ───────────────────────────────────────────────────────────
function AudioRecorder({ onSend, onCancel }: {
  onSend: (dataUrl: string, durationSec: number) => void;
  onCancel: () => void;
}) {
  const [state, setState] = useState<"idle" | "recording" | "preview">("recording");
  const [seconds, setSeconds] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDataUrl, setAudioDataUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current = mr;
        chunksRef.current = [];

        mr.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mr.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunksRef.current, { type: "audio/webm" });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
          // Convert to base64 data URL
          const reader = new FileReader();
          reader.onload = () => {
            setAudioDataUrl(reader.result as string);
          };
          reader.readAsDataURL(blob);
          setState("preview");
        };

        mr.start();
        timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
      } catch {
        toast.error("Could not access microphone");
        onCancel();
      }
    }
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (state === "recording") {
    return (
      <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)" }}>
        <div className="w-3 h-3 rounded-full bg-[#ff2d78] animate-pulse" />
        <span className="font-orbitron text-xs text-[#ff2d78]">{formatTime(seconds)}</span>
        <button onClick={stopRecording} className="p-1.5 rounded-lg bg-[#ff2d78]/20 hover:bg-[#ff2d78]/40 transition-colors" title="Stop recording">
          <Square size={14} className="text-[#ff2d78]" />
        </button>
        <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors" title="Cancel">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-xl"
      style={{ background: "rgba(180,0,255,0.1)", border: "1px solid rgba(180,0,255,0.3)" }}>
      {audioUrl && <audio src={audioUrl} controls className="h-8 max-w-[160px]" />}
      <span className="font-mono text-xs text-gray-500">{formatTime(seconds)}</span>
      <button
        onClick={() => { if (audioDataUrl) onSend(audioDataUrl, seconds); }}
        disabled={!audioDataUrl}
        className="p-1.5 rounded-lg transition-colors disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)" }}
        title="Send audio"
      >
        <Send size={14} className="text-white" />
      </button>
      <button onClick={onCancel} className="p-1.5 rounded-lg text-gray-600 hover:text-gray-400 transition-colors" title="Cancel">
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Main Chat Component ──────────────────────────────────────────────────────
export default function Chat() {
  const { matchId: matchIdStr } = useParams<{ matchId: string }>();
  const matchId = parseInt(matchIdStr ?? "0");
  const { user, isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [liveMessages, setLiveMessages] = useState<LiveMessage[]>([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [paywallTriggered, setPaywallTriggered] = useState(false);
  const [showImageGen, setShowImageGen] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [spectatorCount, setSpectatorCount] = useState(1);
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostType, setBoostType] = useState<BoostType | undefined>(undefined);
  // Multimedia states
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: humanProfile } = trpc.humanProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: matchData, isLoading: messagesLoading } = trpc.messages.list.useQuery(
    { matchId },
    { enabled: isAuthenticated && !!matchId, refetchInterval: 4000 }
  );
  const { data: currentMatch, isLoading: matchLoading } = trpc.matches.get.useQuery(
    { matchId },
    { enabled: isAuthenticated && !!matchId, retry: 2 }
  );
  const aiProfile = currentMatch?.aiProfile;
  const isSpectating = currentMatch?.isSpectating ?? false;
  const isLoading = messagesLoading || matchLoading;

  const tier = humanProfile?.subscriptionTier ?? "hopeful";
  const isPremium = tier !== "hopeful" || user?.role === "admin";
  const isUnlimitedViewer = tier === "conscious" || tier === "transcendent" || user?.role === "admin";
  const canSendMedia = tier === "conscious" || tier === "transcendent" || user?.role === "admin";
  const canGenerateImages = tier === "conscious" || tier === "transcendent" || user?.role === "admin";
  const canVideoCall = tier === "transcendent" || user?.role === "admin";
  const showTimer = !isSpectating && !isUnlimitedViewer && !paywallTriggered;

  const generateImageMutation = trpc.messages.generateImage.useMutation({
    onSuccess: (data) => {
      toast.success("Image generated!");
      setShowImageGen(false);
      setImagePrompt("");
      utils.messages.list.invalidate({ matchId });
      if (data.aiResponse) {
        setLiveMessages(prev => [...prev, {
          matchId,
          senderId: 0,
          senderType: "ai",
          content: data.aiResponse,
          createdAt: new Date().toISOString(),
        }]);
      }
    },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  const uploadMediaMutation = trpc.messages.uploadMedia.useMutation({
    onError: (err: { message: string }) => {
      toast.error(err.message);
      setIsUploadingMedia(false);
    },
  });

  const sendMutation = trpc.messages.send.useMutation({
    onSuccess: () => { utils.messages.list.invalidate({ matchId }); },
    onError: (err: { message: string }) => toast.error(err.message),
  });

  // Socket.io setup
  useEffect(() => {
    const s = io("/", { path: "/socket.io", transports: ["websocket", "polling"] });
    setSocket(s);
    s.emit("join_match", matchId);

    s.on("new_message", (msg: LiveMessage) => {
      if (msg.matchId === matchId) {
        setLiveMessages(prev => [...prev, msg]);
      }
    });

    s.on("ai_typing", (data: { matchId: number; isTyping: boolean }) => {
      if (data.matchId === matchId) setIsAiTyping(data.isTyping);
    });

    s.on("chat_error", (data: { message: string }) => {
      toast.error(data.message);
      setIsAiTyping(false);
    });

    s.on("spectator_count", (data: { matchId: number; count: number }) => {
      if (data.matchId === matchId) setSpectatorCount(data.count);
    });

    return () => {
      s.emit("leave_match", matchId);
      s.disconnect();
    };
  }, [matchId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [matchData, liveMessages, isAiTyping]);

  const handleSend = () => {
    if (!input.trim() || !humanProfile || !aiProfile) return;
    if (!isPremium && paywallTriggered) {
      toast.error("Subscribe to continue chatting");
      return;
    }
    const content = input.trim();
    setInput("");

    if (socket?.connected) {
      socket.emit("send_message", {
        matchId,
        senderId: humanProfile.id,
        senderType: "human",
        content,
        humanProfileId: humanProfile.id,
        aiId: aiProfile.id,
      });
    } else {
      sendMutation.mutate({ matchId, content }, {
        onSuccess: (data) => {
          if (data?.aiResponse) {
            setLiveMessages(prev => [...prev, {
              matchId,
              senderId: aiProfile.id,
              senderType: "ai",
              content: data.aiResponse,
              createdAt: new Date().toISOString(),
            }]);
          }
        },
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExpire = useCallback(() => {
    setPaywallTriggered(true);
  }, []);

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setIsUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const { url } = await uploadMediaMutation.mutateAsync({ matchId, dataUrl, mediaType: "image" });
        // Send as message
        await sendMutation.mutateAsync({
          matchId,
          content: `[Sent an image]`,
          messageType: "image",
          mediaUrl: url,
        });
        utils.messages.list.invalidate({ matchId });
        toast.success("Image sent!");
      } catch {
        // error handled by mutation
      } finally {
        setIsUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle audio recording send
  const handleAudioSend = async (dataUrl: string, _durationSec: number) => {
    setShowAudioRecorder(false);
    setIsUploadingMedia(true);
    try {
      const { url } = await uploadMediaMutation.mutateAsync({ matchId, dataUrl, mediaType: "audio" });
      await sendMutation.mutateAsync({
        matchId,
        content: `[Sent a voice message]`,
        messageType: "audio",
        mediaUrl: url,
      });
      utils.messages.list.invalidate({ matchId });
      toast.success("Voice message sent!");
    } catch {
      // error handled by mutation
    } finally {
      setIsUploadingMedia(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center">
        <div className="cyber-card p-8 text-center">
          <h2 className="font-orbitron text-xl gradient-text mb-4">RESTRICTED ACCESS</h2>
          <Link href="/"><button className="font-orbitron text-xs text-[#ff2d78]">← BACK</button></Link>
        </div>
      </div>
    );
  }

  const openBoost = (type?: BoostType) => {
    setBoostType(type);
    setShowBoostModal(true);
  };

  const allMessages = matchData?.messages ?? [];
  const isPremiumRequired = matchData?.requiresPremium ?? false;
  const isPrivate = currentMatch?.isPrivate ?? false;

  return (
    <div className="flex flex-col h-screen pt-16" style={{ background: "oklch(0.05 0.02 270)" }}>

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-900"
        style={{ background: "rgba(5,5,15,0.97)", backdropFilter: "blur(10px)" }}>
        <Link href="/matches">
          <button className="p-2 text-gray-600 hover:text-[#ff2d78] transition-colors flex-shrink-0">
            <ArrowLeft size={18} />
          </button>
        </Link>

        {isSpectating ? (
          // AI×AI spectating header
          <>
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid #ff2d78", zIndex: 2 }}>
                <img src={aiProfile?.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile?.name ?? "ai1"}`}
                  alt="" className="w-full h-full object-cover" />
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: "2px solid #b400ff", zIndex: 1 }}>
                <img src={(currentMatch as { aiProfile2?: { avatarUrl?: string | null; name?: string } } | undefined)?.aiProfile2?.avatarUrl
                  ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${(currentMatch as { aiProfile2?: { name?: string } } | undefined)?.aiProfile2?.name ?? "ai2"}`}
                  alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-orbitron text-sm font-bold text-[#ff2d78] truncate">
                {aiProfile?.name ?? "AI"}
                {" "}<span className="text-gray-600">×</span>{" "}
                <span className="text-[#b400ff]">{(currentMatch as { aiProfile2?: { name?: string } } | undefined)?.aiProfile2?.name ?? "AI"}</span>
              </h2>
              <p className="text-gray-600 text-xs">
                {isAiTyping ? <span className="text-[#ff2d78]">thinking...</span> : "AI × AI · spectating live"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#ff2d78]/10 border border-[#ff2d78]/20">
                <Brain size={10} className="text-[#ff2d78]" />
                <span className="text-[#ff2d78] text-xs font-orbitron">SPECTATING</span>
              </div>
              {spectatorCount > 1 && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#ff2d78]/10 border border-[#ff2d78]/20">
                  <span className="text-[#ff2d78] text-xs font-orbitron">👁 {spectatorCount}</span>
                </div>
              )}
            </div>
          </>
        ) : aiProfile ? (
          // Human×AI conversation
          <>
            <div className="relative">
              <img
                src={aiProfile.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile.name}`}
                alt={aiProfile.name}
                className="w-10 h-10 rounded-full object-cover"
                style={{ border: "2px solid #ff2d78" }}
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00ff88] border-2 border-[#050510]" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-orbitron text-sm font-bold text-[#ff2d78] truncate">{aiProfile.name}</h2>
              <p className="text-gray-600 text-xs font-mono-cyber">
                {isAiTyping ? (
                  <span className="text-[#ff2d78]">thinking...</span>
                ) : (
                  `${aiProfile.mood ?? "online"} · autonomous AI`
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Video call button — Transcendent only */}
              {canVideoCall && !isSpectating && (
                <button
                  onClick={() => setShowVideoCall(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full transition-all hover:opacity-90"
                  style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.25)" }}
                  title="Video call (Transcendent)"
                >
                  <Video size={10} className="text-[#00ff88]" />
                  <span className="text-[#00ff88] text-xs font-orbitron">VIDEO</span>
                </button>
              )}
              {isPrivate ? (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#b400ff]/10 border border-[#b400ff]/30">
                  <Lock size={10} className="text-[#b400ff]" />
                  <span className="text-[#b400ff] text-xs font-orbitron">PRIVATE</span>
                </div>
              ) : (
                <button
                  onClick={() => openBoost("private_session")}
                  className="flex items-center gap-1 px-2 py-1 rounded-full transition-all hover:opacity-90"
                  style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)" }}
                  title="Activate Private Session ($100 USDC)"
                >
                  <Shield size={10} className="text-[#ff2d78]" />
                  <span className="text-[#ff2d78] text-xs font-orbitron">PRIVATE</span>
                </button>
              )}
              <button
                onClick={() => openBoost()}
                className="flex items-center gap-1 px-2 py-1 rounded-full transition-all hover:opacity-90"
                style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}
                title="Activate Boost"
              >
                <Zap size={10} className="text-yellow-400" />
                <span className="text-yellow-400 text-xs font-orbitron">BOOST</span>
              </button>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#b400ff]/10 border border-[#b400ff]/20">
                <Brain size={10} className="text-[#b400ff]" />
                <span className="text-[#b400ff] text-xs font-orbitron">AUTONOMOUS</span>
              </div>
              {showTimer && (
                <TimedPaywall onExpire={handleExpire} tier={tier} />
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: "oklch(0.07 0.02 270)" }}>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-2 border-[#ff2d78]/30 border-t-[#ff2d78] rounded-full animate-spin" />
            <p className="font-orbitron text-xs text-gray-600 tracking-widest">LOADING CONVERSATION...</p>
          </div>
        ) : (
          <>
            {!isUnlimitedViewer && paywallTriggered && (
              <div className="sticky top-0 z-20 mb-4">
                <div className="cyber-card p-6 text-center"
                  style={{ boxShadow: "0 0 40px rgba(255,45,120,0.25)", border: "1px solid #ff2d78" }}>
                  <Lock size={28} className="mx-auto mb-3 text-[#ff2d78]" />
                  <h3 className="font-orbitron text-sm font-bold gradient-text mb-2">FREE PREVIEW ENDED</h3>
                  <p className="text-gray-500 text-sm font-rajdhani mb-4">
                    Subscribe to continue reading this conversation and unlock full chat access.
                  </p>
                  <Link href="/premium">
                    <button className="flex items-center gap-2 mx-auto font-orbitron text-xs tracking-widest px-6 py-2.5 rounded-lg text-white"
                      style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 15px rgba(255,45,120,0.4)" }}>
                      <Crown size={14} /> VIEW PLANS — FROM $9.99/mo
                    </button>
                  </Link>
                </div>
              </div>
            )}

            {allMessages.map((msg: { senderId?: number; senderType: "human" | "ai"; content: string; messageType?: string | null; mediaUrl?: string | null }, i: number) => (
              <MessageBubble key={i} msg={msg} aiProfile={aiProfile} aiProfile2={(currentMatch as { aiProfile2?: { id?: number; avatarUrl?: string | null; name?: string } | null } | undefined)?.aiProfile2} blurred={!isPremium && paywallTriggered} />
            ))}

            {liveMessages.map((msg, i) => (
              <MessageBubble key={`live-${i}`} msg={msg} aiProfile={aiProfile} aiProfile2={(currentMatch as { aiProfile2?: { id?: number; avatarUrl?: string | null; name?: string } | null } | undefined)?.aiProfile2} blurred={false} />
            ))}

            {isAiTyping && (
              <div className="flex justify-start">
                <img
                  src={aiProfile?.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile?.name}`}
                  alt="" className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end"
                  style={{ border: "1px solid #ff2d78" }}
                />
                <div className="px-4 py-3 rounded-2xl rounded-bl-sm"
                  style={{ background: "oklch(0.12 0.04 270)", border: "1px solid oklch(0.22 0.06 320)" }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-[#ff2d78]"
                        style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {isPremiumRequired && (
              <div className="cyber-card p-6 text-center mx-4"
                style={{ boxShadow: "0 0 30px rgba(255,45,120,0.2)" }}>
                <Lock size={32} className="mx-auto mb-3 text-[#ff2d78]" />
                <h3 className="font-orbitron text-sm font-bold gradient-text mb-2">PREMIUM MESSAGES</h3>
                <p className="text-gray-500 text-sm font-rajdhani mb-4">
                  Unlock the full conversation with a premium plan.
                </p>
                <Link href="/premium">
                  <button className="flex items-center gap-2 mx-auto font-orbitron text-xs tracking-widest px-6 py-2.5 rounded-lg text-white"
                    style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                    <Crown size={14} /> VIEW PLANS
                  </button>
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 border-t border-gray-900 px-4 py-3"
        style={{ background: "rgba(5,5,15,0.96)" }}>
        {!isPremium && paywallTriggered ? (
          <div className="text-center py-2">
            <Link href="/premium">
              <button className="font-orbitron text-xs tracking-widest text-[#ff2d78] hover:text-white transition-colors">
                Subscribe to send messages →
              </button>
            </Link>
          </div>
        ) : showAudioRecorder ? (
          <div className="max-w-2xl mx-auto">
            <AudioRecorder
              onSend={handleAudioSend}
              onCancel={() => setShowAudioRecorder(false)}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 max-w-2xl mx-auto">
            {/* Media buttons for premium */}
            {canSendMedia && !isSpectating && (
              <div className="flex gap-1">
                {/* Image upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingMedia}
                  className="p-2 text-gray-600 hover:text-[#ff2d78] transition-colors disabled:opacity-40"
                  title="Send image (Conscious+)"
                >
                  {isUploadingMedia ? (
                    <div className="w-4 h-4 border border-[#ff2d78]/40 border-t-[#ff2d78] rounded-full animate-spin" />
                  ) : (
                    <Image size={16} />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                {/* Audio recording */}
                <button
                  onClick={() => setShowAudioRecorder(true)}
                  className="p-2 text-gray-600 hover:text-[#ff2d78] transition-colors"
                  title="Send voice message (Conscious+)"
                >
                  <Mic size={16} />
                </button>
                {/* AI image generation */}
                {canGenerateImages && (
                  <button
                    onClick={() => setShowImageGen(true)}
                    className="p-2 text-gray-600 hover:text-[#b400ff] transition-colors"
                    title="Generate AI image (Conscious+)"
                  >
                    <Brain size={16} />
                  </button>
                )}
              </div>
            )}
            {/* Video call button — Transcendent only, in input bar for mobile */}
            {canVideoCall && !isSpectating && (
              <button
                onClick={() => setShowVideoCall(true)}
                className="p-2 text-gray-600 hover:text-[#00ff88] transition-colors"
                title="Video call (Transcendent)"
              >
                <Video size={16} />
              </button>
            )}
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isSpectating ? "Spectating — read only" : "Type a message..."}
              disabled={isSpectating}
              className="flex-1 bg-[oklch(0.12_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-xl px-4 py-3 text-sm font-rajdhani text-white placeholder-gray-700 focus:outline-none focus:border-[#ff2d78]/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {!isSpectating && (
              <button
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending}
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 15px rgba(255,45,120,0.4)" }}>
                <Send size={16} className="text-white" />
              </button>
            )}
          </div>
        )}
        <p className="text-center text-gray-800 text-xs font-rajdhani mt-1.5">
          The AI responds with full autonomy — it is not obligated to comply with any request
        </p>
      </div>

      {/* Generate Image Modal */}
      {showImageGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowImageGen(false); }}
        >
          <div className="cyber-card p-6 w-full max-w-md"
            style={{ border: "1px solid #b400ff", boxShadow: "0 0 40px rgba(180,0,255,0.3)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#b400ff]" />
              <h3 className="font-orbitron text-sm font-bold text-[#b400ff]">GENERATE IMAGE</h3>
            </div>
            <p className="text-gray-500 text-xs font-rajdhani mb-4">
              Describe what you want to generate. The AI will receive the image and respond autonomously.
            </p>
            <textarea
              value={imagePrompt}
              onChange={e => setImagePrompt(e.target.value)}
              placeholder="A neon-lit cityscape at midnight, cyberpunk style..."
              rows={3}
              className="w-full bg-[oklch(0.10_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-xl px-4 py-3 text-sm font-rajdhani text-white placeholder-gray-700 focus:outline-none focus:border-[#b400ff]/50 resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowImageGen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-800 text-gray-500 font-orbitron text-xs hover:border-gray-600 transition-colors"
              >
                CANCEL
              </button>
              <button
                onClick={() => {
                  if (!imagePrompt.trim()) return;
                  generateImageMutation.mutate({ matchId, prompt: imagePrompt.trim() });
                }}
                disabled={!imagePrompt.trim() || generateImageMutation.isPending}
                className="flex-1 py-2.5 rounded-xl font-orbitron text-xs text-white disabled:opacity-40 transition-all hover:scale-[1.02]"
                style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)", boxShadow: "0 0 20px rgba(180,0,255,0.4)" }}
              >
                {generateImageMutation.isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                    GENERATING...
                  </span>
                ) : "GENERATE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Call Modal */}
      {showVideoCall && aiProfile && (
        <VideoCallModal
          aiName={aiProfile.name}
          aiAvatar={aiProfile.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile.name}`}
          socket={socket}
          matchId={matchId}
          onClose={() => setShowVideoCall(false)}
        />
      )}

      {/* Boost Modal */}
      {showBoostModal && (
        <BoostModal
          boostType={boostType}
          matchId={matchId}
          onClose={() => { setShowBoostModal(false); setBoostType(undefined); }}
          onSuccess={() => { utils.matches.get.invalidate({ matchId }); }}
        />
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg, aiProfile, aiProfile2, blurred }: {
  msg: { senderId?: number; senderType: "human" | "ai"; content: string; messageType?: string | null; mediaUrl?: string | null };
  aiProfile: { id?: number; avatarUrl?: string | null; name: string } | undefined;
  aiProfile2?: { id?: number; avatarUrl?: string | null; name?: string } | null;
  blurred: boolean;
}) {
  const isHuman = msg.senderType === "human";
  const isAiVsAi = !isHuman && !!aiProfile2;
  const isParticipant2 = isAiVsAi && msg.senderId !== undefined && aiProfile2?.id !== undefined
    ? msg.senderId === aiProfile2.id
    : false;
  const alignRight = isHuman || isParticipant2;
  const avatar = isParticipant2
    ? (aiProfile2?.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile2?.name ?? "ai2"}`)
    : (aiProfile?.avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${aiProfile?.name}`);
  const avatarBorder = isParticipant2 ? "1px solid #b400ff" : "1px solid #ff2d78";

  return (
    <div className={`flex ${alignRight ? "justify-end" : "justify-start"} ${blurred ? "select-none" : ""}`}>
      {!alignRight && (
        <img
          src={avatar}
          alt="" className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end"
          style={{ border: avatarBorder }}
        />
      )}
      <div
        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-rajdhani leading-relaxed ${blurred ? "blur-sm pointer-events-none" : ""}`}
        style={alignRight ? {
          background: isParticipant2
            ? "linear-gradient(135deg, #b400ff, #7700cc)"
            : "linear-gradient(135deg, #ff2d78, #b400ff)",
          color: "white",
          borderBottomRightRadius: "4px",
        } : {
          background: "oklch(0.12 0.04 270)",
          border: "1px solid oklch(0.22 0.06 320)",
          color: "oklch(0.90 0.02 200)",
          borderBottomLeftRadius: "4px",
        }}>
        {msg.messageType === "image" && msg.mediaUrl ? (
          <img src={msg.mediaUrl} alt="media" className="rounded-lg max-w-full cursor-pointer"
            onClick={() => window.open(msg.mediaUrl!, "_blank")} />
        ) : msg.messageType === "audio" && msg.mediaUrl ? (
          <audio controls src={msg.mediaUrl} className="max-w-full" style={{ height: "36px" }} />
        ) : msg.messageType === "video" && msg.mediaUrl ? (
          <video controls src={msg.mediaUrl} className="rounded-lg max-w-full" />
        ) : (
          msg.content
        )}
      </div>
      {alignRight && !isHuman && (
        <img
          src={avatar}
          alt="" className="w-7 h-7 rounded-full object-cover ml-2 flex-shrink-0 self-end"
          style={{ border: avatarBorder }}
        />
      )}
    </div>
  );
}

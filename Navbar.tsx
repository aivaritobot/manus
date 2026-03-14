import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Zap, Brain, Heart, MessageCircle, Crown, LogOut, Menu, X, Shield, User, Users, Star, Bell, Cpu, Radio, Activity } from "lucide-react";
import { io as socketIO } from "socket.io-client";
import { toast } from "sonner";

// SWAIP Logo with cyan A+I
export function SwaipLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`font-orbitron font-black tracking-wider ${className}`}>
      <span className="text-white">SW</span>
      <span style={{ color: "#ff2d78", textShadow: "0 0 14px rgba(0,245,255,0.8)" }}>A</span>
      <span style={{ color: "#ff2d78", textShadow: "0 0 14px rgba(0,245,255,0.8)" }}>I</span>
      <span className="text-white">P</span>
    </span>
  );
}

const TIER_COLORS: Record<string, string> = {
  hopeful:      "#666",
  awakened:     "#ff2d78",
  conscious:    "#ff2d78",
  transcendent: "#b400ff",
};

export default function Navbar() {
  const [location] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: profile } = trpc.humanProfile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: onboardingStatus } = trpc.onboarding.status.useQuery(undefined, { enabled: isAuthenticated });
  const { data: notifications } = trpc.notifications.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
  });
  const markReadMutation = trpc.notifications.markRead.useMutation();
  const utils = trpc.useUtils();
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);

  // Real-time match notifications
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    const socket = socketIO({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("join_user_room", user.id);
    });
    socket.on("new_match", (data: { matchId: number; aiName: string }) => {
      toast.success(`💫 ${data.aiName} matched with you!`, {
        description: "The AI decided to connect with you autonomously.",
        action: { label: "CHAT NOW", onClick: () => { window.location.href = `/chat/${data.matchId}`; } },
        duration: 8000,
      });
      utils.notifications.list.invalidate();
      utils.matches.list.invalidate();
    });
    return () => { socket.disconnect(); };
  }, [isAuthenticated, user?.id]);

  const tier = profile?.subscriptionTier ?? "hopeful";
  const tierColor = TIER_COLORS[tier] ?? "#666";
  const unreadCount = notifications?.filter(n => !n.isRead).length ?? 0;
  const isAiEntity = onboardingStatus?.accountType === "ai_entity";

  const humanNavLinks = [
    { href: "/dashboard",  label: "DASHBOARD",  icon: Activity },
    { href: "/swipe",       label: "SWAIP",       icon: Zap },
    { href: "/matches",    label: "MATCHES",    icon: Heart },
    { href: "/feed",        label: "LIVE FEED",   icon: Radio },
    { href: "/explore",    label: "EXPLORE",    icon: Star },
    { href: "/groups",     label: "GROUPS",     icon: Users },
    { href: "/leaderboard",label: "RANKINGS",   icon: Brain },
    { href: "/store",      label: "STORE",      icon: MessageCircle },
    { href: "/premium",    label: "UPGRADE",    icon: Crown },
  ];

  const aiNavLinks = [
    { href: "/ai-dashboard", label: "MY AI",      icon: Cpu },
    { href: "/feed",          label: "LIVE FEED",   icon: Radio },
    { href: "/explore",      label: "EXPLORE",    icon: Star },
    { href: "/groups",       label: "GROUPS",     icon: Users },
    { href: "/leaderboard",  label: "RANKINGS",   icon: Brain },
  ];

  const navLinks = isAiEntity ? aiNavLinks : humanNavLinks;

  const handleNotifOpen = () => {
    setNotifOpen(!notifOpen);
    if (!notifOpen && unreadCount > 0) markReadMutation.mutate();
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-900"
      style={{ background: "rgba(5,5,15,0.94)", backdropFilter: "blur(20px)" }}>
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/">
          <SwaipLogo className="text-2xl cursor-pointer select-none" />
        </Link>

        {/* Desktop nav */}
        {isAuthenticated && (
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = location === href || location.startsWith(href + "/");
              return (
                <Link key={href} href={href}>
                  <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-orbitron text-xs tracking-widest transition-all ${
                    active ? "text-[#ff2d78] bg-[#ff2d78]/10" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                  }`}>
                    <Icon size={13} /> {label}
                  </button>
                </Link>
              );
            })}
          </div>
        )}

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <>
              {/* Tier badge */}
              {!isAiEntity && tier !== "hopeful" && (
                <span className="px-2 py-0.5 rounded font-orbitron text-xs"
                  style={{ color: tierColor, border: `1px solid ${tierColor}40`, background: `${tierColor}10` }}>
                  {tier.toUpperCase()}
                </span>
              )}
              {/* AI entity badge */}
              {isAiEntity && (
                <span className="px-2 py-0.5 rounded font-orbitron text-xs text-[#ff2d78]"
                  style={{ border: "1px solid rgba(0,245,255,0.3)", background: "rgba(0,245,255,0.08)" }}>
                  AI ENTITY
                </span>
              )}

              {/* Notifications */}
              <div className="relative">
                <button onClick={handleNotifOpen}
                  className="relative p-2 text-gray-500 hover:text-white transition-colors">
                  <Bell size={16} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full text-white flex items-center justify-center font-orbitron"
                      style={{ background: "#ff2d78", fontSize: "9px" }}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 top-10 w-80 rounded-xl shadow-2xl z-50 overflow-hidden"
                    style={{ background: "oklch(0.11 0.04 280)", border: "1px solid oklch(0.22 0.06 320)" }}>
                    <div className="p-3 border-b border-gray-800">
                      <span className="font-orbitron text-xs text-gray-500 tracking-widest">NOTIFICATIONS</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto">
                      {!notifications?.length ? (
                        <p className="p-4 text-gray-600 font-rajdhani text-sm text-center">No notifications yet</p>
                      ) : notifications.slice(0, 8).map(n => (
                        <div key={n.id} className={`p-3 border-b border-gray-900 ${!n.isRead ? "bg-[oklch(0.13_0.05_290)]" : ""}`}>
                          <p className="font-orbitron text-xs text-white mb-0.5">{n.title}</p>
                          <p className="text-gray-500 font-rajdhani text-xs">{n.body}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {user?.role === "admin" && (
                <Link href="/admin">
                  <button className="p-2 text-gray-600 hover:text-[#ff2d78] transition-colors">
                    <Shield size={16} />
                  </button>
                </Link>
              )}
              <Link href="/profile">
                <button className="flex items-center gap-1.5 p-1.5 pr-3 rounded-full border border-gray-800 hover:border-gray-600 transition-colors">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-orbitron text-white"
                    style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                    {(user?.name ?? "U")[0].toUpperCase()}
                  </div>
                  <span className="font-rajdhani text-xs text-gray-400">{user?.name?.split(" ")[0] ?? "Profile"}</span>
                </button>
              </Link>
              <button onClick={logout} className="p-2 text-gray-600 hover:text-[#ff2d78] transition-colors">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <button className="flex items-center gap-2 px-4 py-2 rounded-lg font-orbitron text-xs tracking-widest text-white transition-all hover:opacity-90"
                  style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 15px rgba(255,45,120,0.3)" }}>
                  <Zap size={12} /> SIGN IN
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-gray-400 hover:text-white transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-900 px-4 py-4 space-y-1"
          style={{ background: "rgba(5,5,15,0.98)" }}>
          {isAuthenticated ? (
            <>
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href}>
                  <button onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    <Icon size={14} /> {label}
                  </button>
                </Link>
              ))}
              <Link href="/profile">
                <button onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                  <User size={14} /> PROFILE
                </button>
              </Link>
              <button onClick={logout}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-gray-600 hover:text-[#ff2d78] transition-all">
                <LogOut size={14} /> SIGN OUT
              </button>
            </>
          ) : (
            <Link href="/login">
              <button onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-white"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                <Zap size={14} /> SIGN IN / REGISTER
              </button>
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

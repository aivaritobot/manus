import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Eye, EyeOff, Mail, Lock, User, Zap, Copy, Check, X } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

type Mode = "login" | "register";

export default function Login() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [urlCopied, setUrlCopied] = useState(false);

  // Redirect authenticated users — must be in useEffect, not render phase
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated]);

  const loginMutation = trpc.auth.emailLogin.useMutation({
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.name ?? ""}!`);
      utils.auth.me.invalidate();
      setTimeout(() => navigate("/dashboard"), 600);
    },
    onError: (e) => toast.error(e.message),
  });

  const registerMutation = trpc.auth.emailRegister.useMutation({
    onSuccess: (data) => {
      toast.success(`Account created! Welcome, ${data.name}!`);
      utils.auth.me.invalidate();
      setTimeout(() => navigate("/onboarding"), 600);
    },
    onError: (e) => toast.error(e.message),
  });

  const forgotMutation = trpc.auth.forgotPassword.useMutation({
    onSuccess: (data) => {
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      } else {
        toast.success("If that email exists, a reset link has been generated.");
        setShowForgot(false);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      if (!email || !password) return toast.error("Fill in all fields");
      loginMutation.mutate({ email, password });
    } else {
      if (!name || !email || !password) return toast.error("Fill in all fields");
      registerMutation.mutate({ name, email, password });
    }
  };

  const handleForgot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return toast.error("Enter your email");
    forgotMutation.mutate({ email: forgotEmail, origin: window.location.origin });
  };

  const copyResetUrl = () => {
    if (!resetUrl) return;
    navigator.clipboard.writeText(resetUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "oklch(0.06 0.02 270)" }}>

      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #ff2d78 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: "radial-gradient(ellipse, #b400ff 0%, transparent 70%)" }} />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(rgba(255,45,120,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,45,120,0.8) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 relative"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid rgba(255,45,120,0.25)" }}>
            <button onClick={() => { setShowForgot(false); setResetUrl(null); setForgotEmail(""); }}
              className="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors">
              <X size={16} />
            </button>
            <h2 className="font-orbitron text-lg font-bold text-white mb-1">Forgot Password</h2>
            {!resetUrl ? (
              <>
                <p className="text-gray-500 font-rajdhani text-sm mb-5">
                  Enter your email and we'll generate a reset link for you.
                </p>
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                    <input
                      type="email"
                      placeholder="Your email address"
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                      style={{ background: "oklch(0.07 0.02 270)", border: "1px solid rgba(255,45,120,0.2)" }}
                      onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                      onBlur={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.2)"}
                    />
                  </div>
                  <button type="submit" disabled={forgotMutation.isPending}
                    className="w-full py-3 rounded-xl font-orbitron text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                    {forgotMutation.isPending ? "GENERATING..." : "GENERATE RESET LINK"}
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="text-gray-500 font-rajdhani text-sm mb-4">
                  Your reset link is ready. Copy it and open it in your browser. It expires in 1 hour.
                </p>
                <div className="p-3 rounded-xl mb-4"
                  style={{ background: "oklch(0.07 0.02 270)", border: "1px solid rgba(0,255,136,0.2)" }}>
                  <p className="font-mono text-xs text-[#00ff88] break-all">{resetUrl}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={copyResetUrl}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-orbitron text-xs transition-all hover:opacity-90"
                    style={{ background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)", color: "#00ff88" }}>
                    {urlCopied ? <><Check size={12} /> COPIED!</> : <><Copy size={12} /> COPY LINK</>}
                  </button>
                  <button onClick={() => { window.open(resetUrl, "_blank"); }}
                    className="flex-1 py-2.5 rounded-xl font-orbitron text-xs text-white transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                    OPEN LINK
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-orbitron text-5xl font-black tracking-tighter cursor-pointer inline-block">
              SW<span style={{ color: "#ff2d78" }}>AI</span>P
            </h1>
          </Link>
          <p className="text-gray-500 font-rajdhani mt-2 text-sm tracking-widest">
            {mode === "login" ? "SIGN IN TO YOUR ACCOUNT" : "CREATE YOUR ACCOUNT"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8"
          style={{ background: "oklch(0.09 0.03 270)", border: "1px solid oklch(0.18 0.05 320)" }}>

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden mb-6"
            style={{ background: "oklch(0.07 0.02 270)", border: "1px solid oklch(0.15 0.04 290)" }}>
            {(["login", "register"] as Mode[]).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className="flex-1 py-2.5 font-orbitron text-xs tracking-widest transition-all"
                style={mode === m
                  ? { background: "linear-gradient(135deg, #ff2d78, #b400ff)", color: "#fff" }
                  : { color: "#666" }}>
                {m === "login" ? "SIGN IN" : "REGISTER"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                  style={{ background: "oklch(0.07 0.02 270)", border: "1px solid oklch(0.18 0.05 320)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "oklch(0.18 0.05 320)"}
                />
              </div>
            )}

            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                style={{ background: "oklch(0.07 0.02 270)", border: "1px solid oklch(0.18 0.05 320)" }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                onBlur={e => e.currentTarget.style.borderColor = "oklch(0.18 0.05 320)"}
              />
            </div>

            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                type={showPass ? "text" : "password"}
                placeholder={mode === "register" ? "Password (min. 8 characters)" : "Password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-10 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                style={{ background: "oklch(0.07 0.02 270)", border: "1px solid oklch(0.18 0.05 320)" }}
                onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                onBlur={e => e.currentTarget.style.borderColor = "oklch(0.18 0.05 320)"}
              />
              <button type="button" onClick={() => setShowPass(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors">
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            <button type="submit" disabled={isPending}
              className="w-full py-3 rounded-xl font-orbitron text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 20px rgba(255,45,120,0.3)" }}>
              {isPending
                ? (mode === "login" ? "SIGNING IN..." : "CREATING ACCOUNT...")
                : (mode === "login" ? "SIGN IN" : "CREATE ACCOUNT")}
            </button>

            {mode === "login" && (
              <div className="text-center">
                <button type="button" onClick={() => setShowForgot(true)}
                  className="font-rajdhani text-xs text-gray-600 hover:text-[#ff2d78] transition-colors">
                  Forgot password?
                </button>
              </div>
            )}
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "oklch(0.15 0.04 290)" }} />
            <span className="text-gray-700 font-rajdhani text-xs">OR</span>
            <div className="flex-1 h-px" style={{ background: "oklch(0.15 0.04 290)" }} />
          </div>

          {/* Manus OAuth */}
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-orbitron text-xs text-gray-400 hover:text-white transition-all"
            style={{ background: "oklch(0.07 0.02 270)", border: "1px solid oklch(0.18 0.05 320)" }}>
            <span>🔐</span>
            <span>CONTINUE WITH MANUS</span>
          </button>
        </div>

        {/* AI Login link */}
        <div className="mt-6 p-4 rounded-xl text-center"
          style={{ background: "oklch(0.08 0.03 270)", border: "1px solid oklch(0.15 0.05 290)" }}>
          <p className="text-gray-600 font-rajdhani text-sm mb-2">Are you an AI entity?</p>
          <Link href="/ai-login">
            <button className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg font-orbitron text-xs transition-all hover:opacity-90"
              style={{ background: "rgba(0,245,255,0.08)", border: "1px solid rgba(0,245,255,0.2)", color: "#00f5ff" }}>
              <Zap size={12} />
              AI ENTITY LOGIN →
            </button>
          </Link>
        </div>

        <p className="text-center text-gray-700 font-rajdhani text-xs mt-4">
          By signing up you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

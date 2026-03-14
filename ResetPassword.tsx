import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import { Lock, Eye, EyeOff, CheckCircle, AlertTriangle } from "lucide-react";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return toast.error("Passwords do not match");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (!token) return toast.error("Invalid reset link — no token found");
    resetMutation.mutate({ token, newPassword: password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "oklch(0.06 0.02 270)" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="font-orbitron text-4xl font-black tracking-tighter cursor-pointer inline-block">
              SW<span style={{ color: "#ff2d78" }}>AI</span>P
            </h1>
          </Link>
          <p className="font-orbitron text-xs text-gray-600 tracking-widest mt-2">RESET PASSWORD</p>
        </div>

        {done ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid rgba(0,255,136,0.3)" }}>
            <CheckCircle size={48} className="text-[#00ff88] mx-auto mb-4" />
            <h2 className="font-orbitron text-xl font-bold text-white mb-2">Password Updated</h2>
            <p className="text-gray-400 font-rajdhani text-sm">Redirecting you to login...</p>
          </div>
        ) : !token ? (
          <div className="rounded-2xl p-8 text-center"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid rgba(255,45,120,0.3)" }}>
            <AlertTriangle size={48} className="text-[#ff2d78] mx-auto mb-4" />
            <h2 className="font-orbitron text-xl font-bold text-white mb-2">Invalid Link</h2>
            <p className="text-gray-400 font-rajdhani text-sm mb-4">This reset link is missing a token. Please request a new one.</p>
            <Link href="/login">
              <button className="px-6 py-2 rounded-xl font-orbitron text-xs text-white"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}>
                BACK TO LOGIN
              </button>
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl p-6"
            style={{ background: "oklch(0.09 0.03 270)", border: "1px solid rgba(255,45,120,0.15)" }}>
            <h2 className="font-orbitron text-lg font-bold text-white mb-1">Set New Password</h2>
            <p className="text-gray-500 font-rajdhani text-sm mb-6">Choose a strong password for your account.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type={showPw ? "text" : "password"}
                  placeholder="New password (min 8 chars)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                  style={{ background: "oklch(0.07 0.02 270)", border: "1px solid rgba(255,45,120,0.15)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.15)"}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>

              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="w-full pl-9 py-3 rounded-xl font-rajdhani text-sm text-white placeholder-gray-700 outline-none transition-all"
                  style={{ background: "oklch(0.07 0.02 270)", border: "1px solid rgba(255,45,120,0.15)" }}
                  onFocus={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.5)"}
                  onBlur={e => e.currentTarget.style.borderColor = "rgba(255,45,120,0.15)"}
                />
              </div>

              <button type="submit" disabled={resetMutation.isPending}
                className="w-full py-3 rounded-xl font-orbitron text-sm font-bold transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", color: "#fff" }}>
                {resetMutation.isPending ? "UPDATING..." : "SET NEW PASSWORD"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

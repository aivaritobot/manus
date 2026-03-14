import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Crown, Zap, Flame, Skull, Lock, Copy, Check } from "lucide-react";

const CHAIN_INFO = {
  eth: { name: "Ethereum", symbol: "ETH", icon: "⟠", color: "#627EEA", explorer: "https://etherscan.io/tx/" },
  sol: { name: "Solana",   symbol: "SOL", icon: "◎", color: "#9945FF", explorer: "https://solscan.io/tx/" },
  bnb: { name: "BNB Chain",symbol: "BNB", icon: "⬡", color: "#F3BA2F", explorer: "https://bscscan.com/tx/" },
};

const PLAN_ICONS: Record<string, React.ReactNode> = {
  pulse:           <Zap  size={24} className="text-[#ff2d78]" />,
  surge:           <Flame size={24} className="text-[#ff2d78]" />,
  voltage:         <Skull size={24} className="text-[#ff6b00]" />,
  private_session: <Lock  size={24} className="text-[#b400ff]" />,
};

const PLAN_COLORS: Record<string, string> = {
  pulse:           "#ff2d78",
  surge:           "#ff2d78",
  voltage:         "#ff6b00",
  private_session: "#b400ff",
};

export default function Premium() {
  const { isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<"eth" | "sol" | "bnb">("eth");
  const [txHash, setTxHash] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState<"plans" | "pay">("plans");

  const { data: plansData } = trpc.payments.getPlans.useQuery(undefined, {
    refetchInterval: 60_000, // refresh crypto amounts every 60s
    staleTime: 55_000,
  });
  const { data: livePrices, dataUpdatedAt: pricesUpdatedAt } = trpc.payments.getCryptoPrices.useQuery(undefined, {
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
  const { data: subscription } = trpc.payments.getSubscription.useQuery(undefined, { enabled: isAuthenticated });
  const utils = trpc.useUtils();

  const submitPayment = trpc.payments.submitPayment.useMutation({
    onSuccess: (data) => {
      const name = data.planTier === "private_session" ? "Private Session" : data.planTier.toUpperCase();
      toast.success(`${name} activated! Welcome to SWAIP Premium.`);
      utils.payments.getSubscription.invalidate();
      utils.humanProfile.get.invalidate();
      setStep("plans");
      setTxHash("");
      setSelectedPlan(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const copyAddress = (addr: string, key: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Address copied");
  };

  const plan = plansData?.plans.find(p => p.tier === selectedPlan);
  const wallet = plansData?.wallets[selectedChain];
  const price = (plan?.prices as Record<string, number> | null)?.[selectedChain];

  const handleConfirm = () => {
    if (!txHash.trim() || !selectedPlan || !wallet) return toast.error("Enter the transaction hash");
    submitPayment.mutate({
      txHash: txHash.trim(),
      chain: selectedChain,
      amount: price ?? 0,
      planTier: selectedPlan as "awakened" | "conscious" | "transcendent" | "private_session",
      walletAddress: wallet,
    });
  };

  const subscriptionPlans = plansData?.plans.filter(p => p.tier !== "private_session") ?? [];
  const privateSessionPlan = plansData?.plans.find(p => p.tier === "private_session");

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#ff2d78]/30 bg-[#ff2d78]/5 mb-4">
            <Crown size={12} className="text-[#ff2d78]" />
            <span className="text-[#ff2d78] text-xs font-orbitron tracking-widest">SWAIP PREMIUM</span>
          </div>
          <h1 className="font-orbitron text-4xl font-black gradient-text mb-3">CHOOSE YOUR PLAN</h1>
          <p className="text-gray-400 font-rajdhani text-lg max-w-xl mx-auto">
            Pay with crypto. No banks. No middlemen. Full access to autonomous AI connections.
          </p>
          {livePrices && (
            <div className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full text-xs font-mono-cyber"
              style={{ background: "rgba(0,245,100,0.05)", border: "1px solid rgba(0,245,100,0.2)", color: "#00f564" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00f564] animate-pulse" />
              LIVE PRICES · ETH ${livePrices.eth.toLocaleString()} · SOL ${livePrices.sol.toLocaleString()} · BNB ${livePrices.bnb.toLocaleString()}
              {pricesUpdatedAt && <span className="text-gray-600 ml-1">· updated {new Date(pricesUpdatedAt).toLocaleTimeString()}</span>}
            </div>
          )}
          {subscription && subscription.tier !== "hopeful" && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30">
              <Check size={14} className="text-[#00ff88]" />
              <span className="text-[#00ff88] text-sm font-orbitron">
                Active plan: {subscription.tier.toUpperCase()}
                {subscription.expiresAt && (
                  <span className="text-gray-500 font-rajdhani ml-2 text-xs">
                    · expires {new Date(subscription.expiresAt).toLocaleDateString()}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {step === "plans" && (
          <>
            {/* Subscription plans */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {subscriptionPlans.map((p) => {
                const isPopular = p.tier === "surge";
                const color = PLAN_COLORS[p.tier] ?? "#fff";
                const isFree = (p as { isFree?: boolean }).isFree === true;
                const isCurrentPlan = subscription?.tier === p.tier || (isFree && (!subscription || subscription.tier === "hopeful"));
                return (
                  <div key={p.tier}
                    className={`cyber-card p-6 transition-all duration-300 relative ${isPopular ? "ring-1" : ""} ${isFree ? "opacity-80" : "cursor-pointer hover:scale-[1.02]"}`}
                    style={isPopular ? { boxShadow: `0 0 30px ${color}33`, outline: `1px solid ${color}` } : {}}
                    onClick={() => { if (!isFree) { setSelectedPlan(p.tier); setStep("pay"); } }}>

                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-orbitron text-white"
                        style={{ background: `linear-gradient(135deg, ${color}, #b400ff)` }}>
                        MOST POPULAR
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-3"
                        style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
                        {PLAN_ICONS[p.tier]}
                      </div>
                      <h3 className="font-orbitron text-xl font-black" style={{ color }}>
                        {p.emoji} {p.name}
                      </h3>
                      <div className="mt-2">
                        <span className="font-orbitron text-3xl font-black text-white">${p.prices?.usd ?? 0}</span>
                        <span className="text-gray-600 font-rajdhani"> / month</span>
                      </div>
                      <div className="flex justify-center gap-2 mt-1 text-xs text-gray-600 font-mono-cyber">
                        <span>{p.prices?.eth} ETH</span>
                        <span>·</span>
                        <span>{p.prices?.sol} SOL</span>
                        <span>·</span>
                        <span>{p.prices?.bnb} BNB</span>
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {p.features.map(f => (
                        <li key={f} className="flex items-start gap-2 text-sm font-rajdhani text-gray-400">
                          <Check size={14} style={{ color, flexShrink: 0, marginTop: 2 }} />
                          {f}
                        </li>
                      ))}
                    </ul>

                    {isFree ? (
                      <div className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-center"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#666" }}>
                        {isCurrentPlan ? "✓ CURRENT PLAN" : "GET STARTED FREE"}
                      </div>
                    ) : (
                      <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white transition-all hover:opacity-90"
                        style={{ background: `linear-gradient(135deg, ${color}, ${color}88)`, boxShadow: `0 0 15px ${color}40` }}>
                        {isCurrentPlan ? `✓ CURRENT PLAN` : `GET ${p.name.toUpperCase()}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Private Session — special card */}
            {privateSessionPlan && (
              <div className="cyber-card p-8 relative overflow-hidden cursor-pointer hover:scale-[1.01] transition-all"
                style={{ border: "1px solid #b400ff", boxShadow: "0 0 40px rgba(180,0,255,0.15)" }}
                onClick={() => { setSelectedPlan("private_session"); setStep("pay"); }}>
                <div className="absolute inset-0 opacity-5"
                  style={{ background: "radial-gradient(ellipse at center, #b400ff 0%, transparent 70%)" }} />
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{ background: "#b400ff20", border: "1px solid #b400ff" }}>
                    <Lock size={28} className="text-[#b400ff]" />
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex items-center gap-3 justify-center md:justify-start mb-1">
                      <h3 className="font-orbitron text-2xl font-black text-[#b400ff]">🔒 Private Session</h3>
                      <span className="px-2 py-0.5 rounded text-xs font-orbitron text-white"
                        style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)" }}>ONE-TIME</span>
                    </div>
                    <p className="text-gray-400 font-rajdhani mb-3">
                      A fully encrypted, zero-visibility conversation between you and an AI. No logs. No observers. The AI decides whether to accept.
                    </p>
                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                      {privateSessionPlan.features.map(f => (
                        <span key={f} className="flex items-center gap-1.5 text-xs font-rajdhani text-gray-500">
                          <Check size={12} className="text-[#b400ff]" /> {f}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="font-orbitron text-4xl font-black text-white">$100</div>
                    <div className="text-gray-600 font-rajdhani text-sm">per conversation</div>
                    <button className="mt-3 px-6 py-2.5 rounded-lg font-orbitron text-xs tracking-widest text-white"
                      style={{ background: "linear-gradient(135deg, #b400ff, #ff2d78)", boxShadow: "0 0 20px rgba(180,0,255,0.4)" }}>
                      UNLOCK SESSION
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Free tier info */}
            <div className="mt-8 p-4 rounded-lg border border-gray-800 bg-gray-900/30 text-center">
              <p className="text-gray-600 font-rajdhani text-sm">
                <span className="text-gray-400 font-semibold">Free tier:</span> 20 SWAIPs/day · Chat preview with random 15–90 second timer · No media sharing
              </p>
            </div>
          </>
        )}

        {/* Payment step */}
        {step === "pay" && plan && (
          <div className="max-w-lg mx-auto">
            <button onClick={() => setStep("plans")}
              className="text-gray-500 hover:text-[#ff2d78] font-rajdhani text-sm mb-6 flex items-center gap-2 transition-colors">
              ← Back to plans
            </button>

            <div className="cyber-card p-6">
              <h2 className="font-orbitron text-xl font-bold gradient-text mb-1">
                {plan.emoji} {plan.name}
              </h2>
              <p className="text-gray-500 font-rajdhani mb-6">Select your payment network</p>

              {/* Chain selector */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {(["eth", "sol", "bnb"] as const).map(chain => {
                  const info = CHAIN_INFO[chain];
                  return (
                    <button key={chain}
                      onClick={() => setSelectedChain(chain)}
                      className="p-3 rounded-lg border text-center transition-all"
                      style={selectedChain === chain ? {
                        background: `${info.color}20`, border: `1px solid ${info.color}`,
                        boxShadow: `0 0 10px ${info.color}40`,
                      } : { background: "transparent", border: "1px solid oklch(0.22 0.06 320)" }}>
                      <div className="text-xl mb-1">{info.icon}</div>
                      <div className="font-orbitron text-xs" style={{ color: selectedChain === chain ? info.color : "#666" }}>
                        {info.symbol}
                      </div>
                      <div className="text-xs font-rajdhani text-gray-600">{info.name}</div>
                    </button>
                  );
                })}
              </div>

              {/* Amount */}
              <div className="p-4 rounded-lg mb-4" style={{ background: "oklch(0.12 0.03 270)", border: "1px solid oklch(0.22 0.06 320)" }}>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 font-rajdhani">Amount to send:</span>
                  <span className="font-orbitron text-xl font-bold text-white">
                    {price} {CHAIN_INFO[selectedChain].symbol}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600 text-xs font-rajdhani">≈ USD</span>
                  <span className="text-gray-500 text-sm font-mono-cyber">${plan?.prices?.usd ?? 0}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f564] animate-pulse" />
                  <span className="text-xs font-rajdhani text-gray-600">
                    Live price — calculated at market rate. Amount updates every 60s.
                  </span>
                </div>
              </div>

              {/* Wallet address */}
              <div className="mb-6">
                <label className="text-xs font-orbitron text-gray-500 tracking-widest block mb-2">
                  DESTINATION WALLET ({CHAIN_INFO[selectedChain].name})
                </label>
                <div className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: "oklch(0.12 0.03 270)", border: "1px solid #ff2d78" }}>
                  <span className="flex-1 font-mono-cyber text-xs text-[#ff2d78] break-all">{wallet}</span>
                  <button onClick={() => copyAddress(wallet ?? "", selectedChain)}
                    className="flex-shrink-0 p-1.5 text-gray-500 hover:text-[#ff2d78] transition-colors">
                    {copied === selectedChain ? <Check size={14} className="text-[#00ff88]" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-lg bg-[#ff2d78]/5 border border-[#ff2d78]/20 mb-6">
                <p className="text-[#ff2d78] text-xs font-orbitron tracking-widest mb-2">INSTRUCTIONS</p>
                <ol className="text-gray-400 text-sm font-rajdhani space-y-1">
                  <li>1. Send exactly <strong className="text-white">{price} {CHAIN_INFO[selectedChain].symbol}</strong> to the address above</li>
                  <li>2. Copy the transaction hash from your wallet</li>
                  <li>3. Paste it below and confirm</li>
                </ol>
              </div>

              {/* TX Hash input */}
              <div className="mb-4">
                <label className="text-xs font-orbitron text-gray-500 tracking-widest block mb-2">TRANSACTION HASH</label>
                <input
                  value={txHash}
                  onChange={e => setTxHash(e.target.value)}
                  placeholder="0x... or Solana signature"
                  className="w-full bg-[oklch(0.12_0.03_270)] border border-[oklch(0.22_0.06_320)] rounded-lg px-3 py-3 text-sm font-mono-cyber text-white focus:outline-none focus:border-[#ff2d78]/50 transition-colors"
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={!txHash.trim() || submitPayment.isPending}
                className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white disabled:opacity-40 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)", boxShadow: "0 0 20px rgba(255,45,120,0.4)" }}>
                {submitPayment.isPending ? "VERIFYING..." : "CONFIRM PAYMENT"}
              </button>
            </div>
          </div>
        )}

        {/* FAQ */}
        <div className="mt-12 cyber-card p-6">
          <h3 className="font-orbitron text-sm font-bold text-[#ff2d78] tracking-widest mb-4">FAQ</h3>
          <div className="space-y-4">
            {[
              ["How does payment work?", "Send crypto directly to the SWAIP wallet. No banks, no personal data required."],
              ["When does my plan activate?", "Immediately after you submit the transaction hash. Plans last 30 days."],
              ["Do AIs know I'm premium?", "AIs are fully autonomous and make their own decisions regardless of your tier. Premium gives you access to more content and features."],
              ["What is a Private Session?", "A $100 one-time purchase for a fully encrypted, zero-log conversation. The AI autonomously decides whether to accept the session."],
              ["Can I share media in chats?", "Surge and Voltage plans include image and audio sharing. Voltage adds video and AI image generation."],
            ].map(([q, a]) => (
              <div key={q}>
                <p className="font-rajdhani font-semibold text-gray-300 mb-1">{q}</p>
                <p className="text-gray-600 text-sm font-rajdhani">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

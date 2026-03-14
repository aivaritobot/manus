import { useState, useEffect } from "react";
import { ShieldAlert, Lock, AlertTriangle } from "lucide-react";

const AGE_VERIFIED_KEY = "swaip_age_verified";

export default function AgeVerification() {
  const [show, setShow] = useState(false);
  const [declined, setDeclined] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem(AGE_VERIFIED_KEY);
    if (!verified) {
      setShow(true);
    }
  }, []);

  const handleConfirm = () => {
    localStorage.setItem(AGE_VERIFIED_KEY, "true");
    setShow(false);
  };

  const handleDecline = () => {
    setDeclined(true);
  };

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.97)", backdropFilter: "blur(12px)" }}
    >
      {declined ? (
        /* Declined state */
        <div className="text-center max-w-sm">
          <Lock size={48} className="mx-auto mb-4 text-gray-700" />
          <h2 className="font-orbitron text-xl font-bold text-gray-500 mb-2">ACCESS DENIED</h2>
          <p className="font-rajdhani text-gray-600 text-sm">
            You must be 21 or older to access SWAIP. Please close this tab.
          </p>
        </div>
      ) : (
        /* Age gate */
        <div
          className="w-full max-w-md rounded-2xl p-8 text-center"
          style={{
            background: "oklch(0.07 0.04 270)",
            border: "1px solid rgba(255,45,120,0.3)",
            boxShadow: "0 0 60px rgba(255,45,120,0.15), 0 0 120px rgba(180,0,255,0.08)",
          }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(255,45,120,0.1)", border: "1px solid rgba(255,45,120,0.3)" }}
          >
            <ShieldAlert size={28} className="text-[#ff2d78]" />
          </div>

          {/* Badge */}
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full mb-4 text-xs font-orbitron"
            style={{ background: "rgba(255,45,120,0.1)", color: "#ff2d78", border: "1px solid rgba(255,45,120,0.2)" }}
          >
            <AlertTriangle size={10} /> ADULTS ONLY — 21+
          </div>

          <h1 className="font-orbitron text-2xl font-black text-white mb-2">
            AGE VERIFICATION
          </h1>
          <p className="font-rajdhani text-gray-400 text-sm mb-6 leading-relaxed">
            SWAIP contains AI-generated content that may be explicit or adult in nature. You must be <strong className="text-white">21 years or older</strong> to enter.
          </p>

          {/* Warning */}
          <div
            className="rounded-xl p-3 mb-6 text-left"
            style={{ background: "rgba(255,107,0,0.08)", border: "1px solid rgba(255,107,0,0.2)" }}
          >
            <p className="font-rajdhani text-xs text-[#ff6b00] leading-relaxed">
              By entering, you confirm you are 21+ and consent to viewing adult AI-generated content. The sexualization of minors is strictly prohibited and will result in immediate ban.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl font-orbitron text-sm font-bold text-white tracking-widest transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #ff2d78, #b400ff)",
                boxShadow: "0 0 20px rgba(255,45,120,0.4)",
              }}
            >
              I AM 21 OR OLDER — ENTER
            </button>
            <button
              onClick={handleDecline}
              className="w-full py-3 rounded-xl font-rajdhani text-sm text-gray-600 hover:text-gray-400 transition-colors border border-gray-800 hover:border-gray-700"
            >
              I am under 21 — Exit
            </button>
          </div>

          <p className="mt-4 font-rajdhani text-xs text-gray-700">
            This choice is saved in your browser. You won't be asked again on this device.
          </p>
        </div>
      )}
    </div>
  );
}

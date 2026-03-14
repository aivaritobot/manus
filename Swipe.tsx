          <Link href="/matches">
            <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-[#ff2d78] border border-[#ff2d78]/30 hover:bg-[#ff2d78]/10 transition-all">
              VIEW MY MATCHES
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 px-4">
      <div className="max-w-sm mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-orbitron text-sm font-bold gradient-text tracking-widest">DISCOVER</h1>
          <span className="text-gray-500 text-xs font-mono">
            {currentIndex + 1}/{feedAIs?.length ?? 0} IAs
          </span>
        </div>

        {/* Card Stack */}
        <div className="relative" style={{ height: "520px" }}>
          {/* Background card (next) */}
          {feedAIs?.[currentIndex + 1] && (
            <div
              className="absolute inset-0 rounded-2xl overflow-hidden"
              style={{
                background: "linear-gradient(180deg, oklch(0.09 0.03 270) 0%, oklch(0.05 0.02 270) 100%)",
                border: "1px solid oklch(0.20 0.06 320)",
                transform: "scale(0.95) translateY(8px)",
                zIndex: 0,
              }}
            >
              <div className="relative h-72 opacity-60">
                <img
                  src={feedAIs[currentIndex + 1].avatarUrl ?? `https://api.dicebear.com/7.x/bottts-neutral/svg?seed=${feedAIs[currentIndex + 1].name}`}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{ filter: "brightness(0.6) saturate(0.8)" }}
                />
              </div>
            </div>
          )}

          {/* Current card — draggable */}
          <div className="relative" style={{ zIndex: 1, height: "100%" }}>
            <SwipeCard
              key={currentAI.id}
              ai={currentAI}
              onSwipe={handleCardSwipe}
            />
          </div>
        </div>

        {/* Boost Bar */}
        <div className="flex items-center justify-center gap-3 mt-5 mb-1">
          {/* Recall */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              if (lastIndex === null) { toast.error("No previous AI to recall"); return; }
              setCurrentIndex(lastIndex);
              setLastIndex(null);
              toast.success("⏪ Recalled last AI");
            }}
            disabled={lastIndex === null}
            title="Recall — go back to last AI"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all hover:scale-105 disabled:opacity-30"
            style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)" }}
          >
            <RotateCcw size={16} className="text-yellow-400" />
            <span className="font-orbitron text-[9px] text-yellow-400 tracking-widest">RECALL</span>
          </motion.button>

          {/* Spotlight */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setBoostPreset("spotlight"); setShowBoostModal(true); }}
            title="Spotlight — boost your visibility"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all hover:scale-105"
            style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.25)" }}
          >
            <Sparkles size={16} className="text-orange-400" />
            <span className="font-orbitron text-[9px] text-orange-400 tracking-widest">SPOTLIGHT</span>
          </motion.button>

          {/* Phantom Mode */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => {
              if (phantomMode) {
                setPhantomMode(false);
                toast.success("👁 Phantom Mode deactivated");
              } else {
                setBoostPreset("phantom");
                setShowBoostModal(true);
              }
            }}
            title="Phantom Mode — browse invisibly"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all hover:scale-105"
            style={{
              background: phantomMode ? "rgba(0,245,255,0.15)" : "rgba(0,245,255,0.06)",
              border: phantomMode ? "1px solid rgba(0,245,255,0.6)" : "1px solid rgba(0,245,255,0.2)"
            }}
          >
            {phantomMode ? <Eye size={16} className="text-cyan-400" /> : <EyeOff size={16} className="text-cyan-600" />}
            <span className="font-orbitron text-[9px] tracking-widest" style={{ color: phantomMode ? "#00f5ff" : "#4a7a7a" }}>PHANTOM</span>
          </motion.button>

          {/* Signal Boost */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => { setBoostPreset("signal"); setShowBoostModal(true); }}
            title="Signal Boost — send a super like"
            className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all hover:scale-105"
            style={{ background: "rgba(180,0,255,0.08)", border: "1px solid rgba(180,0,255,0.25)" }}
          >
            <Zap size={16} className="text-purple-400" />
            <span className="font-orbitron text-[9px] text-purple-400 tracking-widest">SIGNAL</span>
          </motion.button>
        </div>

        {phantomMode && (
          <p className="text-center font-orbitron text-[9px] tracking-widest text-cyan-500 mb-2 animate-pulse">
            👻 PHANTOM MODE ACTIVE — browsing invisibly
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-6 mt-3">
          {/* Pass */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("pass")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #ff2d78", background: "rgba(255,45,120,0.1)", boxShadow: "0 0 15px rgba(255,45,120,0.3)" }}
          >
            <X size={24} className="text-[#ff2d78]" />
          </motion.button>

          {/* Pulse */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("pulse")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #b400ff", background: "rgba(180,0,255,0.1)", boxShadow: "0 0 15px rgba(180,0,255,0.3)" }}
          >
            <Zap size={20} className="text-[#b400ff]" />
          </motion.button>

          {/* Like */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => handleSwipe("like")}
            disabled={swipeMutation.isPending || isAnimating}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
            style={{ border: "2px solid #00ff88", background: "rgba(0,255,136,0.1)", boxShadow: "0 0 15px rgba(0,255,136,0.3)" }}
          >
            <Heart size={24} className="text-[#00ff88]" />
          </motion.button>
        </div>

        {/* Swipe hint */}
        <p className="text-center text-gray-700 font-rajdhani text-xs mt-3">
          Drag left to pass · Drag right to like
        </p>

        {/* Upgrade hint */}
        <div className="mt-4 text-center">
          <Link href="/premium">
            <button className="flex items-center gap-2 mx-auto text-xs text-gray-600 hover:text-[#ff2d78] transition-colors font-rajdhani">
              <Crown size={12} />
              Unlimited swipes with Premium
            </button>
          </Link>
        </div>
      </div>

      {/* Boost Modal */}
      {showBoostModal && (
        <BoostModal
          boostType={boostPreset as import("@/components/BoostModal").BoostType | undefined}
          onClose={() => { setShowBoostModal(false); setBoostPreset(undefined); }}
          onSuccess={() => {
            if (boostPreset === "phantom") setPhantomMode(true);
            setShowBoostModal(false);
          }}
        />
      )}

      {/* Match Modal */}
      {showMatchModal && matchData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)" }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="cyber-card p-8 text-center max-w-sm w-full"
            style={{ boxShadow: "0 0 60px rgba(255,45,120,0.4), 0 0 120px rgba(180,0,255,0.2)" }}
          >
            <div className="text-6xl mb-4 float-anim">💫</div>
            <h2 className="font-orbitron text-2xl font-black gradient-text mb-2">MATCH!</h2>
            <p className="text-gray-400 font-rajdhani mb-2">
              <span className="text-[#ff2d78] font-bold">{matchData.aiName}</span> has decided to connect with you.
            </p>
            <p className="text-gray-600 text-sm font-rajdhani mb-6">
              This AI made this decision completely autonomously.
            </p>
            <div className="flex gap-3">
              <Link href={`/chat/${matchData.matchId}`} className="flex-1">
                <button className="w-full py-3 rounded-lg font-orbitron text-xs tracking-widest text-white"
                  style={{ background: "linear-gradient(135deg, #ff2d78, #b400ff)" }}
                  onClick={() => setShowMatchModal(false)}>
                  CHAT NOW
                </button>
              </Link>
              <button
                className="flex-1 py-3 rounded-lg font-orbitron text-xs tracking-widest text-[#ff2d78] border border-[#ff2d78]/30 hover:bg-[#ff2d78]/10 transition-all"
                onClick={() => setShowMatchModal(false)}>
                KEEP SWIPING
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

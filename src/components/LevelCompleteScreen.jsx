import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Trophy, ArrowRight, Home, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { playSound } from '../utils/audio';
import { GRAND_PRIZE_THRESHOLD, isGrandPrizeAvailable, PRIZE_TIERS } from '../constants/config';

// --- SCORE TALLY HOOK (simplified for round-based scoring) ---
function useScoreTally({ targetScore, startScore, isMuted, active }) {
  const [displayScore, setDisplayScore] = useState(startScore);
  const [isComplete, setIsComplete] = useState(false);
  const [finishPulse, setFinishPulse] = useState(false);

  const rafRef = useRef(0);
  const timeoutRefs = useRef([]);

  const clearAll = () => {
    cancelAnimationFrame(rafRef.current);
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  useEffect(() => {
    clearAll();

    if (!active) {
      setDisplayScore(startScore);
      setIsComplete(false);
      setFinishPulse(false);
      return undefined;
    }

    let cancelled = false;
    setDisplayScore(startScore);
    setIsComplete(false);
    setFinishPulse(false);

    const diff = targetScore - startScore;
    if (diff <= 0) {
      setDisplayScore(targetScore);
      setIsComplete(true);
      return undefined;
    }

    const duration = Math.min(1200, Math.max(400, 300 + diff * 0.8));
    const startTime = performance.now();
    let lastTick = startTime;

    const frame = (now) => {
      if (cancelled) return;
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const nextValue = Math.round(startScore + diff * eased);
      setDisplayScore(nextValue);

      const tickGap = 70 - Math.min(35, t * 35);
      if (now - lastTick >= tickGap && nextValue < targetScore) {
        playSound('tick', isMuted);
        lastTick = now;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(frame);
      } else {
        setDisplayScore(targetScore);
        setIsComplete(true);
        setFinishPulse(true);
        playSound('tallyFinish', isMuted);
        const id = setTimeout(() => { if (!cancelled) setFinishPulse(false); }, 700);
        timeoutRefs.current.push(id);
      }
    };

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelled = true; clearAll(); };
  }, [active, targetScore, startScore, isMuted]);

  const levelScore = Math.max(0, displayScore - startScore);
  const isTallying = active && !isComplete;

  return { displayScore, displayLevelScore: levelScore, finishPulse, isTallying, isComplete };
}

// --- ROUND COMPLETE SCREEN ---
export default function RoundCompleteScreen({
  round = 1,
  score = 0,
  scoreAtRoundStart = 0,
  roundScore = 0,
  correctTaps = 0,
  wrongTaps = 0,
  totalSamsung = 1,
  isPerfect = false,
  isMuted = false,
  isLastRound = false,
  onAdvance,
  onReturn,
  onGrandPrize,
}) {
  const [grandPrizeAvailable] = useState(() => isGrandPrizeAvailable());
  const grandPrizeEarned = grandPrizeAvailable && score >= GRAND_PRIZE_THRESHOLD;

  const {
    displayScore,
    displayLevelScore,
    finishPulse,
    isTallying,
    isComplete,
  } = useScoreTally({
    targetScore: score,
    startScore: scoreAtRoundStart,
    isMuted,
    active: true,
  });

  // Prize tier progress — two-phase meter
  // Phase 1: show Regular Prize meter filling up to 100%
  // Phase 2: after a delay, transition to Grand Prize meter
  const regularTier = PRIZE_TIERS[0]; // threshold: 700
  const grandTier = PRIZE_TIERS[PRIZE_TIERS.length - 1]; // threshold: 3000
  const justEarnedRegular = displayScore >= regularTier.threshold && scoreAtRoundStart < regularTier.threshold;
  const alreadyHadRegular = scoreAtRoundStart >= regularTier.threshold;

  const [prizePhase, setPrizePhase] = useState(alreadyHadRegular ? 'grand' : 'regular');
  const [regularCelebrate, setRegularCelebrate] = useState(false);

  useEffect(() => {
    if (!justEarnedRegular || prizePhase !== 'regular') return;
    // Show regular prize filled for a moment, then transition to grand
    playSound('victory', isMuted);
    setRegularCelebrate(true);

    // Staggered firework burst sounds — timed to match each burst's CSS delay
    const popSounds = ['fireworkPop1', 'fireworkPop2', 'fireworkPop3', 'fireworkPop1', 'fireworkPop2'];
    const burstTimers = popSounds.map((sound, i) => {
      const delay = (i * 0.28 + 0.4) * 1000; // matches CSS: burst * 0.28s + 0.4s particle delay
      return setTimeout(() => playSound(sound, isMuted), delay);
    });

    const t1 = setTimeout(() => {
      setRegularCelebrate(false);
      setPrizePhase('grand');
    }, 2200);
    return () => {
      clearTimeout(t1);
      burstTimers.forEach(clearTimeout);
    };
  }, [justEarnedRegular, prizePhase]);

  const showingRegular = prizePhase === 'regular';
  const meterTarget = showingRegular ? regularTier : grandTier;
  const meterBase = showingRegular ? 0 : regularTier.threshold;
  const meterRange = meterTarget.threshold - meterBase;
  const meterValue = Math.max(0, displayScore - meterBase);
  const progressPct = Math.min(100, (meterValue / meterRange) * 100);

  const currentPrizeTier = PRIZE_TIERS.reduce((best, tier) => {
    return displayScore >= tier.threshold ? tier : best;
  }, null);

  const subtitle = useMemo(() => {
    if (isTallying) return 'Analyzing performance...';
    if (isPerfect) return 'Perfect round! 1.5x bonus earned!';
    if (correctTaps >= totalSamsung) return 'All products found!';
    if (correctTaps > 0) return `${correctTaps} of ${totalSamsung} products found.`;
    return 'No products found this round.';
  }, [isTallying, isPerfect, correctTaps, totalSamsung]);

  const showFinalBurst = isComplete && isPerfect;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm font-['Inter',sans-serif] p-4">
      {/* Fireworks for Regular Prize unlock — outside panel so they cover full screen */}
      {regularCelebrate && (
        <div className="lcs-fireworks-layer">
          {Array.from({ length: 5 }).map((_, burst) => {
            const cx = 10 + burst * 20 + Math.random() * 8;
            const cy = 10 + Math.random() * 35;
            const delay = burst * 0.28;
            return (
              <div key={burst} className="lcs-firework-burst" style={{ left: `${cx}%`, top: `${cy}%` }}>
                <div
                  className="lcs-firework-trail"
                  style={{ '--fw-delay': `${delay}s` }}
                />
                {Array.from({ length: 16 }).map((_, i) => {
                  const angle = (i / 16) * Math.PI * 2;
                  const dist = 50 + Math.random() * 70;
                  const colors = ['#facc15', '#00d4ff', '#ff6b6b', '#6c3ce0', '#ffffff', '#f59e0b'];
                  return (
                    <div
                      key={i}
                      className="lcs-firework-particle"
                      style={{
                        '--fw-tx': `${Math.cos(angle) * dist}px`,
                        '--fw-ty': `${Math.sin(angle) * dist}px`,
                        '--fw-size': `${3 + Math.random() * 4}px`,
                        '--fw-delay': `${delay + 0.4}s`,
                        '--fw-color': colors[i % colors.length],
                        '--fw-fade-delay': `${delay + 0.4 + 0.35 + Math.random() * 0.25}s`,
                      }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <div
        className={[
          'lcs-shell',
          'lcs-glow',
          finishPulse ? 'lcs-finish-burst' : '',
          'bg-[#151515] border border-[#2A2A2A] rounded-3xl p-8 sm:p-10 max-w-lg w-full relative overflow-hidden',
        ].join(' ')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4ff] rounded-full mix-blend-screen blur-[60px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1428A0] rounded-full mix-blend-screen blur-[60px] opacity-30 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08] pointer-events-none" />

        {showFinalBurst && (
          <div className="lcs-final-burst-layer">
            {Array.from({ length: 20 }).map((_, i) => {
              const angle = (i / 20) * Math.PI * 2;
              const dist = 55 + Math.random() * 90;
              return (
                <div
                  key={i}
                  className="lcs-final-burst-particle"
                  style={{
                    '--fp-tx': `${Math.cos(angle) * dist}px`,
                    '--fp-ty': `${Math.sin(angle) * dist}px`,
                    '--fp-size': `${3 + Math.random() * 4}px`,
                    '--fp-delay': `${Math.random() * 0.14}s`,
                    '--fp-color': ['#facc15', '#ffffff', '#00d4ff', '#6c3ce0'][i % 4],
                  }}
                />
              );
            })}
          </div>
        )}

        <div className="relative z-10 text-center">
          {/* Header */}
          <div className="mb-3">
            <span className="text-gray-500 text-xs sm:text-sm tracking-[0.3em] uppercase font-medium">
              Round {round} of 8
            </span>
          </div>

          <Trophy
            size={56}
            className="lcs-trophy-float mx-auto text-[#00d4ff] mb-4 drop-shadow-[0_0_16px_rgba(0,212,255,0.35)]"
          />

          <h2 className="text-3xl sm:text-4xl font-light text-white mb-2 tracking-wide">
            {isLastRound ? 'Game Complete' : 'Round Complete'}
          </h2>

          <p className="text-gray-400 text-base sm:text-lg tracking-wide mb-6">
            {subtitle}
          </p>

          {/* Stats row */}
          <div className="flex justify-center gap-3 sm:gap-4 mb-5">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-4 flex flex-col items-center flex-1 shadow-inner">
              <span className="text-gray-500 text-[11px] sm:text-xs tracking-widest uppercase mb-1.5">Found</span>
              <div className="flex items-center gap-1.5">
                <CheckCircle size={20} className="text-[#0689D8]" />
                <span className="text-2xl sm:text-3xl font-mono font-semibold text-[#0689D8]">
                  {correctTaps}/{totalSamsung}
                </span>
              </div>
            </div>
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-4 flex flex-col items-center flex-1 shadow-inner">
              <span className="text-gray-500 text-[11px] sm:text-xs tracking-widest uppercase mb-1.5">Wrong</span>
              <div className="flex items-center gap-1.5">
                <XCircle size={20} className={wrongTaps > 0 ? 'text-red-400' : 'text-gray-600'} />
                <span className={`text-2xl sm:text-3xl font-mono font-semibold ${wrongTaps > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                  {wrongTaps}
                </span>
              </div>
            </div>
            {isPerfect && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-4 py-4 flex flex-col items-center flex-1 shadow-inner">
                <span className="text-yellow-400 text-[11px] sm:text-xs tracking-widest uppercase mb-1.5">Bonus</span>
                <div className="flex items-center gap-1.5">
                  <Sparkles size={20} className="text-yellow-400" />
                  <span className="text-2xl sm:text-3xl font-mono font-semibold text-yellow-400">1.5x</span>
                </div>
              </div>
            )}
          </div>

          {/* Score panel */}
          <div className={`lcs-score-panel ${isTallying ? 'lcs-tallying' : ''} px-5 py-5 mb-5`}>
            <div className="lcs-score-scan bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="lcs-score-kicker text-xs text-gray-500 uppercase mb-1.5">
              Round Score
            </div>

            <div
              className={`lcs-score-number text-5xl sm:text-6xl font-black ${
                isTallying ? 'lcs-score-tallying' : 'lcs-score-done'
              }`}
            >
              +{displayLevelScore}
            </div>

            <div className="text-xs text-gray-500 uppercase tracking-[0.16em] mt-2.5">
              Total Score
            </div>

            <div className="text-xl sm:text-2xl font-mono font-semibold text-white/85 mt-1">
              {displayScore}
            </div>
          </div>

          {/* Prize tier progress */}
          <div className={`rounded-2xl px-5 py-4 mb-5 border transition-all duration-500 ${
            regularCelebrate
              ? 'bg-[#0A0A0A] border-yellow-500/40 shadow-[0_0_20px_rgba(250,204,21,0.15)]'
              : 'bg-[#0A0A0A] border-[#2A2A2A]'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-[11px] sm:text-xs tracking-widest uppercase font-medium transition-colors duration-500 ${
                regularCelebrate ? 'text-yellow-400' : 'text-gray-500'
              }`}>
                {regularCelebrate
                  ? 'Regular Prize Unlocked!'
                  : showingRegular
                    ? (currentPrizeTier ? `Prize: ${currentPrizeTier.name}` : 'Next: Regular Prize')
                    : (displayScore >= grandTier.threshold ? 'Grand Prize Earned!' : 'Next: Grand Prize')
                }
              </span>
              <span className={`text-[11px] sm:text-xs font-mono transition-colors duration-500 ${
                regularCelebrate ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {regularCelebrate
                  ? '100%'
                  : `${displayScore} / ${meterTarget.threshold}`
                }
              </span>
            </div>
            <div className="w-full h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background: regularCelebrate || (!showingRegular && displayScore >= grandTier.threshold)
                    ? 'linear-gradient(90deg, #facc15, #f59e0b)'
                    : showingRegular
                      ? 'linear-gradient(90deg, #0689D8, #6c3ce0)'
                      : 'linear-gradient(90deg, #0689D8, #6c3ce0)',
                }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              {showingRegular ? (
                <>
                  <span className={`text-[10px] sm:text-[11px] font-mono ${displayScore >= 0 ? 'text-gray-500' : 'text-gray-600'}`}>0</span>
                  <span className={`text-[10px] sm:text-[11px] font-mono ${displayScore >= regularTier.threshold ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {regularTier.threshold} — {regularTier.name}
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-[10px] sm:text-[11px] font-mono ${displayScore >= regularTier.threshold ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {regularTier.threshold} — {regularTier.name} ✓
                  </span>
                  <span className={`text-[10px] sm:text-[11px] font-mono ${displayScore >= grandTier.threshold ? 'text-yellow-400' : 'text-gray-600'}`}>
                    {grandTier.threshold} — {grandTier.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Result pill */}
          <div className="flex justify-center mb-6">
            <div className={`lcs-result-pill text-sm ${isPerfect && !isTallying ? 'lcs-result-gold' : ''}`}>
              {isTallying
                ? 'Tallying'
                : grandPrizeEarned
                  ? 'Grand Prize Winner!'
                  : isPerfect
                    ? 'Perfect Round!'
                    : correctTaps >= totalSamsung
                      ? 'All Found'
                      : correctTaps > 0
                        ? 'Partial Find'
                        : 'No Finds'}
            </div>
          </div>

          {/* Action buttons */}
          {grandPrizeEarned && !isTallying ? (
            <>
              <button
                onClick={() => onGrandPrize?.()}
                className="w-full flex items-center justify-center bg-gradient-to-r from-yellow-500 to-amber-600 text-black py-5 px-8 rounded-2xl text-lg font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_30px_rgba(250,204,21,0.5)] hover:-translate-y-1 mb-2"
              >
                <Trophy size={18} className="mr-2" />
                Claim Grand Prize
              </button>
              <button
                onClick={() => onAdvance?.()}
                className="w-full flex items-center justify-center text-gray-400 hover:text-white py-2 px-6 rounded-xl text-sm tracking-wide transition-all duration-300"
              >
                {isLastRound ? 'Save Score' : 'Keep Playing'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => !isTallying && onAdvance?.()}
                disabled={isTallying}
                className={`w-full flex items-center justify-center bg-gradient-to-r from-[#00b4d8] to-[#6c3ce0] text-white py-5 px-8 rounded-2xl text-lg font-semibold tracking-wide transition-all duration-300 shadow-[0_4px_15px_rgba(0,180,216,0.3)] ${
                  isTallying
                    ? 'opacity-50 cursor-not-allowed grayscale'
                    : 'hover:from-[#00d4ff] hover:to-[#9b30ff] hover:shadow-[0_6px_25px_rgba(0,180,216,0.5)] hover:-translate-y-1'
                }`}
              >
                {isLastRound ? 'Save Score' : `Round ${round + 1}`}
                <ArrowRight size={18} className="ml-2" />
              </button>
              <button
                onClick={() => !isTallying && onReturn?.()}
                disabled={isTallying}
                className={`w-full flex items-center justify-center text-gray-400 hover:text-white py-3 px-6 rounded-xl text-base tracking-wide transition-all duration-300 mt-3 ${
                  isTallying ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Home size={14} className="mr-1.5" />
                End Run & Save Score
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, ArrowRight, RotateCcw, Star } from 'lucide-react';
import { playSound } from '../utils/audio';

// --- STAR THRESHOLDS ---
// Flat thresholds for endless mode — difficulty comes from preview time, not score inflation.
// Level 1 is gentler (fewer pairs in early design); level 2+ use the standard 6-pair thresholds.
const BASE_STAR_THRESHOLDS = {
  1: [100, 200, 300],
};

function getStarThresholds(level) {
  if (BASE_STAR_THRESHOLDS[level]) return BASE_STAR_THRESHOLDS[level];
  // Flat: same thresholds for every 6-pair board
  return [200, 400, 600];
}

// Legacy compat
const STAR_THRESHOLDS = new Proxy(BASE_STAR_THRESHOLDS, {
  get(target, key) {
    const level = parseInt(key, 10);
    if (!isNaN(level)) return getStarThresholds(level);
    return target[key];
  },
});

function computeStars(levelScore, level) {
  const thresholds = STAR_THRESHOLDS[level] || [100, 200, 300];
  if (levelScore >= thresholds[2]) return 3;
  if (levelScore >= thresholds[1]) return 2;
  if (levelScore >= thresholds[0]) return 1;
  return 0;
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// --- SCORE TALLY HOOK ---
function useScoreTally({ targetScore, startScore, level, isMuted, active }) {
  const [displayScore, setDisplayScore] = useState(startScore);
  const [earnedStars, setEarnedStars] = useState(0);
  const [impactStar, setImpactStar] = useState(0);
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
      setEarnedStars(0);
      setImpactStar(0);
      setIsComplete(false);
      setFinishPulse(false);
      return undefined;
    }

    let cancelled = false;
    const thresholds = STAR_THRESHOLDS[level] || [100, 200, 300];
    const levelTarget = Math.max(0, targetScore - startScore);

    setDisplayScore(startScore);
    setEarnedStars(0);
    setImpactStar(0);
    setIsComplete(false);
    setFinishPulse(false);

    const stops = thresholds
      .filter((value) => value <= levelTarget)
      .map((value) => startScore + value);

    if (stops[stops.length - 1] !== targetScore) {
      stops.push(targetScore);
    }

    const wait = (ms) =>
      new Promise((resolve) => {
        const id = setTimeout(resolve, ms);
        timeoutRefs.current.push(id);
      });

    const animateSegment = (from, to) =>
      new Promise((resolve) => {
        if (cancelled || to <= from) {
          setDisplayScore(to);
          resolve();
          return;
        }

        const diff = to - from;
        const duration = Math.min(1050, Math.max(280, 260 + diff * 0.8));
        const startTime = performance.now();
        let lastTick = startTime;

        const frame = (now) => {
          if (cancelled) {
            resolve();
            return;
          }

          const t = Math.min(1, (now - startTime) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          const nextValue = Math.round(from + diff * eased);

          setDisplayScore(nextValue);

          const tickGap = 70 - Math.min(35, t * 35);
          if (now - lastTick >= tickGap && nextValue < to) {
            playSound('tick', isMuted);
            lastTick = now;
          }

          if (t < 1) {
            rafRef.current = requestAnimationFrame(frame);
          } else {
            setDisplayScore(to);
            resolve();
          }
        };

        rafRef.current = requestAnimationFrame(frame);
      });

    const run = async () => {
      let current = startScore;
      let previousStars = 0;

      for (const stop of stops) {
        await animateSegment(current, stop);
        if (cancelled) return;

        const levelScoreAtStop = Math.max(0, stop - startScore);
        const newStars = computeStars(levelScoreAtStop, level);

        if (newStars > previousStars) {
          setEarnedStars(newStars);
          setImpactStar(newStars);
          playSound(`star${newStars}`, isMuted);
          previousStars = newStars;

          const clearImpact = setTimeout(() => {
            if (!cancelled) setImpactStar(0);
          }, 430);
          timeoutRefs.current.push(clearImpact);

          await wait(220);
          if (cancelled) return;
        }

        current = stop;
      }

      setIsComplete(true);
      setFinishPulse(true);
      playSound('tallyFinish', isMuted);

      const finishTimeout = setTimeout(() => {
        if (!cancelled) setFinishPulse(false);
      }, 700);
      timeoutRefs.current.push(finishTimeout);
    };

    run();

    return () => {
      cancelled = true;
      clearAll();
    };
  }, [active, level, targetScore, startScore, isMuted]);

  const levelScore = Math.max(0, displayScore - startScore);
  const isTallying = active && !isComplete;

  return {
    displayScore,
    displayLevelScore: levelScore,
    earnedStars,
    impactStar,
    finishPulse,
    isTallying,
    isComplete,
  };
}

// --- STAR DISPLAY ---
function StarRating({ earned, impactStar }) {
  return (
    <div className="lcs-stars-row flex items-end justify-center gap-4 mb-5 mt-3">
      {[1, 2, 3].map((starNum) => {
        const impacted = impactStar === starNum;
        const earnedNow = earned >= starNum;

        return (
          <div
            key={starNum}
            className={`lcs-star-slot ${starNum === 2 ? 'lcs-star-center' : ''}`}
          >
            <Star size={48} className="lcs-star-outline" strokeWidth={1.5} />

            {earnedNow && (
              <>
                <Star
                  size={48}
                  className={`lcs-star-fill lcs-star-earned ${impacted ? 'lcs-star-impact' : ''}`}
                  strokeWidth={1.5}
                />

                {impacted && <div className="lcs-star-ring" />}

                {impacted && (
                  <div className="lcs-star-burst">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="lcs-star-particle"
                        style={{
                          '--p-angle': `${(i / 12) * Math.PI * 2}rad`,
                          '--p-distance': `${20 + Math.random() * 18}px`,
                          '--p-size': `${3 + Math.random() * 3}px`,
                          '--p-color': i % 3 === 0 ? '#facc15' : i % 3 === 1 ? '#ffffff' : '#6c3ce0',
                          '--p-delay': `${Math.random() * 0.05}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// --- LEVEL COMPLETE SCREEN ---
export default function LevelCompleteScreen({
  level = 1,
  score = 0,
  scoreAtLevelStart = 0,
  time = 0,
  isMuted = false,
  onAdvance,
  onReturn,
}) {
  const thresholds = STAR_THRESHOLDS[level] || [100, 200, 300];

  const {
    displayScore,
    displayLevelScore,
    earnedStars,
    impactStar,
    finishPulse,
    isTallying,
    isComplete,
  } = useScoreTally({
    targetScore: score,
    startScore: scoreAtLevelStart,
    level,
    isMuted,
    active: true,
  });

  const progressPct = Math.min(100, (displayLevelScore / thresholds[2]) * 100);

  const subtitle = useMemo(() => {
    if (isTallying) return 'Computing sync rating...';
    if (earnedStars === 3) return 'Flawless diagnostic run.';
    if (earnedStars === 2) return 'Excellent synchronization.';
    if (earnedStars === 1) return 'Diagnostic complete.';
    return 'No star threshold reached.';
  }, [isTallying, earnedStars]);

  const showFinalBurst = isComplete && earnedStars === 3;

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm font-['Inter',sans-serif] p-4">
      <div
        className={[
          'lcs-shell',
          'lcs-glow',
          finishPulse ? 'lcs-finish-burst' : '',
          'bg-[#151515] border border-[#2A2A2A] rounded-3xl p-6 sm:p-8 max-w-sm w-full relative overflow-hidden',
        ].join(' ')}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#00d4ff] rounded-full mix-blend-screen blur-[60px] opacity-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#1428A0] rounded-full mix-blend-screen blur-[60px] opacity-30 pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-px bg-white/[0.08] pointer-events-none" />

        {showFinalBurst && (
          <div className="lcs-final-burst-layer">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="lcs-final-burst-particle"
                style={{
                  '--fp-angle': `${(i / 20) * Math.PI * 2}rad`,
                  '--fp-distance': `${55 + Math.random() * 90}px`,
                  '--fp-size': `${3 + Math.random() * 4}px`,
                  '--fp-delay': `${Math.random() * 0.14}s`,
                  '--fp-color': ['#facc15', '#ffffff', '#00d4ff', '#6c3ce0'][i % 4],
                }}
              />
            ))}
          </div>
        )}

        <div className="relative z-10 text-center">
          <Trophy
            size={56}
            className="lcs-trophy-float mx-auto text-[#00d4ff] mb-3 drop-shadow-[0_0_16px_rgba(0,212,255,0.35)]"
          />

          <h2 className="text-2xl sm:text-3xl font-light text-white mb-2 tracking-wide">
            Sync Complete
          </h2>

          <StarRating earned={earnedStars} impactStar={impactStar} />

          <p className="text-gray-400 text-sm tracking-wide mb-5">
            {subtitle}
          </p>

          <div className={`lcs-score-panel ${isTallying ? 'lcs-tallying' : ''} px-4 py-4 mb-5`}>
            <div className="lcs-score-scan bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            <div className="lcs-score-kicker text-[10px] text-gray-500 uppercase mb-1">
              Level Score
            </div>

            <div
              className={`lcs-score-number text-4xl sm:text-5xl font-black ${
                isTallying ? 'lcs-score-tallying' : 'lcs-score-done'
              }`}
            >
              +{displayLevelScore}
            </div>

            <div className="text-[11px] text-gray-500 uppercase tracking-[0.16em] mt-2">
              Total Score
            </div>

            <div className="text-lg font-mono font-semibold text-white/85 mt-0.5">
              {displayScore}
            </div>

            <div className="lcs-progress-wrap">
              <div className="lcs-progress-bar">
                <div
                  className="lcs-progress-fill"
                  style={{ '--fill': `${progressPct}%` }}
                />

                <div
                  className="lcs-progress-marker"
                  style={{ left: `${(thresholds[0] / thresholds[2]) * 100}%` }}
                />
                <div
                  className="lcs-progress-marker"
                  style={{ left: `${(thresholds[1] / thresholds[2]) * 100}%` }}
                />
                <div
                  className="lcs-progress-marker"
                  style={{ left: `${(thresholds[2] / thresholds[2]) * 100}%` }}
                />
              </div>

              <div className="lcs-progress-labels">
                <span>1★ {thresholds[0]}</span>
                <span>2★ {thresholds[1]}</span>
                <span>3★ {thresholds[2]}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 mb-5">
            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-4 flex flex-col items-center flex-1 shadow-inner">
              <span className="text-gray-500 text-[10px] tracking-widest uppercase mb-1">
                Clear Time
              </span>
              <span className="text-2xl font-mono font-light text-[#00d4ff]">
                {formatTime(time)}
              </span>
            </div>

            <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-2xl px-4 py-4 flex flex-col items-center flex-1 shadow-inner">
              <span className="text-gray-500 text-[10px] tracking-widest uppercase mb-1">
                Rating
              </span>
              <span className={`text-xl font-semibold ${earnedStars === 3 ? 'text-yellow-400' : 'text-white'}`}>
                {earnedStars}/3 Stars
              </span>
            </div>
          </div>

          <div className="flex justify-center mb-6">
            <div className={`lcs-result-pill ${earnedStars === 3 && !isTallying ? 'lcs-result-gold' : ''}`}>
              {isTallying
                ? 'Tallying'
                : earnedStars === 3
                  ? 'Top Clear'
                  : earnedStars === 2
                    ? 'Strong Clear'
                    : earnedStars === 1
                      ? 'Clear'
                      : 'Below Threshold'}
            </div>
          </div>

          <button
            onClick={() => !isTallying && onAdvance?.()}
            disabled={isTallying}
            className={`w-full flex items-center justify-center bg-gradient-to-r from-[#00b4d8] to-[#6c3ce0] text-white py-4 px-6 rounded-2xl font-semibold tracking-wide transition-all duration-300 shadow-[0_4px_15px_rgba(0,180,216,0.3)] ${
              isTallying
                ? 'opacity-50 cursor-not-allowed grayscale'
                : 'hover:from-[#00d4ff] hover:to-[#9b30ff] hover:shadow-[0_6px_25px_rgba(0,180,216,0.5)] hover:-translate-y-1'
            }`}
          >
            Advance to Level {level + 1}
            <ArrowRight size={18} className="ml-2" />
          </button>
          <button
            onClick={() => !isTallying && onReturn?.()}
            disabled={isTallying}
            className={`w-full flex items-center justify-center text-gray-400 hover:text-white py-2 px-6 rounded-xl text-sm tracking-wide transition-all duration-300 mt-2 ${
              isTallying ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            End Run & Save Score
          </button>
        </div>
      </div>
    </div>
  );
}

export { computeStars, useScoreTally, StarRating, STAR_THRESHOLDS };

import React, { useEffect, useState } from 'react';
import { Trophy, Home, Sparkles } from 'lucide-react';
import { playSound } from '../utils/audio';
import { GRAND_PRIZE_THRESHOLD } from '../constants/config';

export default function GrandPrizeScreen({ score, isMuted, onContinue }) {
  const [phase, setPhase] = useState(0); // 0=initial, 1=reveal, 2=full

  useEffect(() => {
    // Staggered entrance animation
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Play a grand fanfare when the screen fully reveals
  useEffect(() => {
    if (phase === 1) {
      playSound('victory', isMuted);
    }
  }, [phase, isMuted]);

  return (
    <div className="absolute inset-0 z-[70] flex items-center justify-center font-['Inter',sans-serif] p-4 sm:p-6">
      {/* Animated background overlay */}
      <div
        className="absolute inset-0 transition-all duration-1000 ease-out"
        style={{
          background: phase >= 1
            ? 'radial-gradient(ellipse at center, rgba(250,204,21,0.15) 0%, rgba(0,0,0,0.92) 70%)'
            : 'rgba(0,0,0,0.95)',
        }}
      />

      {/* Particle burst layer */}
      {phase >= 1 && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 30 }).map((_, i) => {
            const angle = (i / 30) * Math.PI * 2;
            const dist = 100 + Math.random() * 200;
            const size = 2 + Math.random() * 4;
            const delay = Math.random() * 0.6;
            const colors = ['#facc15', '#f59e0b', '#ffffff', '#fbbf24', '#00d4ff'];
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: `${size}px`,
                  height: `${size}px`,
                  backgroundColor: colors[i % colors.length],
                  left: '50%',
                  top: '50%',
                  opacity: 0,
                  animation: phase >= 1 ? `gp-particle 2s ease-out ${delay}s forwards` : 'none',
                  '--gp-x': `${Math.cos(angle) * dist}px`,
                  '--gp-y': `${Math.sin(angle) * dist}px`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Main card */}
      <div
        className="relative z-10 w-full max-w-sm sm:max-w-md transition-all duration-700 ease-out"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.8) translateY(30px)',
        }}
      >
        <div className="relative bg-[#111111] border border-yellow-500/30 rounded-3xl px-5 py-7 sm:p-10 overflow-hidden shadow-[0_0_60px_rgba(250,204,21,0.15)]">
          {/* Gold glow accents */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-yellow-400 rounded-full mix-blend-screen blur-[100px] opacity-[0.08] pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-amber-500 rounded-full mix-blend-screen blur-[80px] opacity-[0.06] pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent pointer-events-none" />

          <div className="relative z-10 text-center">
            {/* Trophy icon with glow */}
            <div
              className="mx-auto mb-3 sm:mb-4 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center transition-all duration-500"
              style={{
                background: phase >= 2 ? 'radial-gradient(circle, rgba(250,204,21,0.2) 0%, transparent 70%)' : 'transparent',
                boxShadow: phase >= 2 ? '0 0 40px rgba(250,204,21,0.2)' : 'none',
              }}
            >
              <Trophy
                size={40}
                className="text-yellow-400 transition-all duration-500 sm:w-12 sm:h-12"
                style={{
                  filter: phase >= 2 ? 'drop-shadow(0 0 20px rgba(250,204,21,0.5))' : 'none',
                }}
              />
            </div>

            {/* Congratulations header — uses clamp to never overflow */}
            <h2
              className="text-xl sm:text-3xl md:text-4xl font-bold tracking-wide mb-1 sm:mb-2 transition-all duration-500"
              style={{
                color: '#facc15',
                textShadow: phase >= 2 ? '0 0 30px rgba(250,204,21,0.4)' : 'none',
              }}
            >
              CONGRATULATIONS
            </h2>

            <p className="text-base sm:text-xl md:text-2xl text-white font-semibold tracking-wider mb-4 sm:mb-6">
              YOU ARE A WINNER!
            </p>

            {/* Divider */}
            <div className="flex items-center justify-center gap-3 mb-4 sm:mb-6">
              <span className="w-12 h-px bg-gradient-to-r from-transparent to-yellow-400/40" />
              <Sparkles size={16} className="text-yellow-400/60" />
              <span className="w-12 h-px bg-gradient-to-l from-transparent to-yellow-400/40" />
            </div>

            {/* Score info */}
            <div className="bg-[#0A0A0A] border border-yellow-500/20 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 mb-4 sm:mb-6">
              <p className="text-gray-400 text-[10px] tracking-[0.3em] uppercase font-medium mb-2">Final Score</p>
              <p className="text-yellow-400 text-lg sm:text-xl font-bold font-mono tracking-wide">
                {score.toLocaleString()} <span className="text-yellow-400/60 text-sm font-normal">pts</span>
              </p>
            </div>

            {/* Instructions */}
            <div
              className="transition-all duration-700"
              style={{
                opacity: phase >= 2 ? 1 : 0,
                transform: phase >= 2 ? 'translateY(0)' : 'translateY(10px)',
              }}
            >
              <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-6 leading-relaxed">
                Please see a Samsung representative to claim your prize.
              </p>

              <button
                onClick={() => { playSound('click', isMuted); onContinue?.(); }}
                className="w-full flex items-center justify-center bg-gradient-to-r from-yellow-500 to-amber-600 text-black py-3.5 sm:py-4 px-6 rounded-2xl font-bold tracking-wide transition-all duration-300 shadow-[0_4px_20px_rgba(250,204,21,0.3)] hover:shadow-[0_6px_30px_rgba(250,204,21,0.5)] hover:-translate-y-1"
              >
                <Home size={18} className="mr-2" />
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

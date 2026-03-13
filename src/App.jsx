import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Play, RotateCcw, Volume2, VolumeX, Home, Settings, X, Music, Zap, Heart, Shield } from 'lucide-react';
import SpaceBackground from './components/background/SpaceBackground';
import LevelCompleteScreen from './components/LevelCompleteScreen';
import { ALL_ICONS, LEVEL_CONFIG, GAME_MODES, getLevelConfig } from './constants/config';
import { playSound, initAudio, startMusic, stopMusic, setMusicVolume, setSfxVolume } from './utils/audio';
import { shuffleArray, formatTime } from './utils/helpers';
import samsungLogo from './assets/logo/Samsung_Orig_Wordmark_WHITE_RGB.png';

export default function App() {
  const [gameState, setGameState] = useState('SPLASH');
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState([]);
  const [flippedIndices, setFlippedIndices] = useState([]);
  const [mismatchedIndices, setMismatchedIndices] = useState([]);
  const [matches, setMatches] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isFlippingDown, setIsFlippingDown] = useState(false);
  const [previewCountdown, setPreviewCountdown] = useState(null);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isScattering, setIsScattering] = useState(false);
  const [scoreAtLevelStart, setScoreAtLevelStart] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [musicVol, setMusicVol] = useState(0.75);
  const [sfxVol, setSfxVol] = useState(0.7);
  const [audioReady, setAudioReady] = useState(false);
  const [gameMode, setGameMode] = useState(GAME_MODES.ENDLESS);
  const [leaderboardTab, setLeaderboardTab] = useState(GAME_MODES.ENDLESS);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [tookDamage, setTookDamage] = useState(false);

  const timerRef = useRef(null);
  const mismatchTimeoutRef = useRef(null);
  const enterKeyRef = useRef(0);
  const bgRef = useRef(null);
  const scatterDirsRef = useRef([]);

  const generateScatterDirs = (count) => {
    scatterDirsRef.current = Array.from({ length: count }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist = 180 + Math.random() * 120;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 60,
      };
    });
  };

  const saveScore = useCallback((finalScore, mode, lvl) => {
    setLeaderboard(prev => {
      const entry = {
        score: finalScore,
        date: new Date().toLocaleDateString(),
        mode: mode || GAME_MODES.ENDLESS,
        level: lvl || 1,
      };
      return [...prev, entry].sort((a, b) => b.score - a.score);
    });
  }, []);

  const triggerTransition = useCallback((actionFn, warpType) => {
    setIsTransitioning(true);
    if (warpType === 'start') bgRef.current?.startGame();
    else if (warpType === 'next') bgRef.current?.nextRound();
    else if (warpType === 'menu') bgRef.current?.returnToMenu();
    setTimeout(() => { actionFn(); }, 650);
    setTimeout(() => { setIsTransitioning(false); }, 1300);
  }, []);

  const setupLevel = useCallback((targetLevel, mode) => {
    const activeMode = mode ?? gameMode;
    initAudio();
    setAudioReady(true);
    if (mismatchTimeoutRef.current) clearTimeout(mismatchTimeoutRef.current);
    const config = getLevelConfig(targetLevel, activeMode);
    // Pick random icons each level for variety
    const selectedIcons = shuffleArray([...ALL_ICONS]).slice(0, config.pairs);
    const newDeck = shuffleArray([...selectedIcons, ...selectedIcons])
      .map((item) => ({ ...item, id: Math.random(), isMatched: false, isFlipped: true }));
    setLevel(targetLevel);
    setDeck(newDeck);
    setFlippedIndices([]);
    setMismatchedIndices([]);
    setMatches(0);
    setTime(0);
    setIsLocked(true);
    setIsEntering(true);
    setIsFlippingDown(false);
    setPreviewCountdown(null);
    enterKeyRef.current += 1;
    if (activeMode === GAME_MODES.SURVIVOR) {
      setMaxHealth(config.maxHealth ?? 100);
      if (targetLevel === 1) setHealth(config.maxHealth ?? 100);
    }
    setGameState('PREVIEW');
  }, [gameMode]);

  useEffect(() => {
    if (!isEntering) return;
    const config = LEVEL_CONFIG[level];
    const cardCount = config.pairs * 2;
    const enterDuration = (cardCount * 60) + 500 + 100;
    const timer = setTimeout(() => {
      setIsEntering(false);
    }, enterDuration);
    return () => clearTimeout(timer);
  }, [isEntering, level]);

  useEffect(() => {
    if (gameState !== 'PREVIEW' || isEntering) return;
    const config = LEVEL_CONFIG[level];
    const totalSeconds = Math.round(config.previewTime / 1000);
    setPreviewCountdown(totalSeconds);
    const interval = setInterval(() => {
      setPreviewCountdown(prev => {
        if (prev === null) return null;
        const next = prev - 1;
        if (next > 0) {
          playSound('countdown', isMuted);
          return next;
        }
        clearInterval(interval);
        return 0;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameState, isEntering, level, isMuted]);

  useEffect(() => {
    if (previewCountdown !== 0 || gameState !== 'PREVIEW') return;
    playSound('go', isMuted);
    const delayTimer = setTimeout(() => {
      setIsFlippingDown(true);
      const flipTimer = setTimeout(() => {
        setDeck(prev => prev.map(card => ({ ...card, isFlipped: false })));
        setIsFlippingDown(false);
        setPreviewCountdown(null);
        setIsLocked(false);
        setGameState('PLAYING');
      }, 300);
      return () => clearTimeout(flipTimer);
    }, 1500);
    return () => clearTimeout(delayTimer);
  }, [previewCountdown, gameState, isMuted]);

  // --- Splash screen dismiss: unlocks audio + transitions to menu with music ---
  const handleSplashDismiss = useCallback(() => {
    initAudio();
    setAudioReady(true);
    setGameState('MENU');
    if (!isMuted) startMusic('menu');
  }, [isMuted]);

  // --- Music management: menu ambient plays on MENU/LEADERBOARD, stops in-game ---
  useEffect(() => {
    if (!audioReady) return;
    if (isMuted) {
      stopMusic();
      return;
    }

    const isInGame = gameState === 'PREVIEW' || gameState === 'PLAYING' ||
      gameState === 'LEVEL_COMPLETE' || gameState === 'SCATTERING' || gameState === 'GAME_OVER';

    if (isInGame) {
      startMusic('ingame');
    } else {
      startMusic('menu');
    }
  }, [gameState, isMuted, audioReady]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !isCelebrating) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, isCelebrating]);

  useEffect(() => {
    if (flippedIndices.length === 2 && !isLocked) {
      setIsLocked(true);
      const [firstIndex, secondIndex] = flippedIndices;
      if (deck[firstIndex].name === deck[secondIndex].name) {
        playSound('match', isMuted);
        bgRef.current?.correct();
        // Combo sound escalation
        const nextCombo = combo + 1;
        if (nextCombo === 2) setTimeout(() => playSound('combo2', isMuted), 200);
        else if (nextCombo === 3) setTimeout(() => playSound('combo3', isMuted), 200);
        else if (nextCombo >= 4) setTimeout(() => playSound('combo4plus', isMuted), 200);
        const speedBonus = Math.max(0, 50 - (time * 2));
        const pointsEarned = 100 + (combo * 50) + speedBonus;
        setScore(s => s + pointsEarned);
        setCombo(c => c + 1);
        setMatches(m => m + 1);
        setDeck(prev => {
          const newDeck = [...prev];
          newDeck[firstIndex].isMatched = true;
          newDeck[firstIndex].isFlipped = true;
          newDeck[secondIndex].isMatched = true;
          newDeck[secondIndex].isFlipped = true;
          return newDeck;
        });
        setFlippedIndices([]);
        setIsLocked(false);
      } else {
        playSound('mismatch', isMuted);
        bgRef.current?.wrong();
        setCombo(0);
        setScore(s => Math.max(0, s - 20));
        setMismatchedIndices([firstIndex, secondIndex]);
        if (gameMode === GAME_MODES.SURVIVOR) {
          const config = getLevelConfig(level, gameMode);
          const damage = config.damagePerMiss ?? 15;
          setHealth(prev => Math.max(0, prev - damage));
          setTookDamage(true);
          setTimeout(() => setTookDamage(false), 180);
        }
        mismatchTimeoutRef.current = setTimeout(() => {
          setDeck(prev => {
            const newDeck = [...prev];
            if (newDeck[firstIndex]) newDeck[firstIndex].isFlipped = false;
            if (newDeck[secondIndex]) newDeck[secondIndex].isFlipped = false;
            return newDeck;
          });
          setFlippedIndices([]);
          setMismatchedIndices([]);
          setIsLocked(false);
        }, 1400);
      }
    }
  }, [flippedIndices, deck, combo, time, isMuted, isLocked]);

  useEffect(() => {
    if (gameState === 'PLAYING' && matches > 0 && matches === LEVEL_CONFIG[level].pairs && !isCelebrating && !isScattering) {
      setIsCelebrating(true);
      playSound('victory', isMuted);
      bgRef.current?.celebrate();
      setIsLocked(true);
      setTimeout(() => {
        setGameState('LEVEL_COMPLETE');
        setIsCelebrating(false);
      }, 2500);
    }
  }, [matches, level, gameState, score, saveScore, isMuted, isCelebrating, isScattering]);

  // Survivor Mode: game over when health hits 0
  useEffect(() => {
    if (gameMode !== GAME_MODES.SURVIVOR) return;
    if (health > 0 || gameState !== 'PLAYING') return;
    setIsLocked(true);
    bgRef.current?.gameOver?.();
    setTimeout(() => {
      if (score > 0) saveScore(score, gameMode, level);
      triggerTransition(() => {
        setGameState('GAME_OVER');
      }, 'menu');
    }, 800);
  }, [health, gameMode, gameState, score, saveScore, triggerTransition]);

  const handleCardClick = (index) => {
    if (isLocked || flippedIndices.length >= 2 || deck[index].isFlipped || deck[index].isMatched) return;
    playSound('flip', isMuted);
    setDeck(prev => {
      const newDeck = [...prev];
      newDeck[index].isFlipped = true;
      return newDeck;
    });
    setFlippedIndices(prev => [...prev, index]);
  };

  const renderSplash = () => (
    <div className="start-screen" onClick={handleSplashDismiss} style={{ cursor: 'pointer' }}>
      <div className="start-screen__content splash-content">
        <img
          src={samsungLogo}
          alt="Samsung"
          className="h-6 sm:h-8 w-auto opacity-80 drop-shadow-[0_0_20px_rgba(255,255,255,0.15)]"
        />
        <div className="splash-divider" />
        <p className="text-[10px] sm:text-[11px] text-gray-500 leading-relaxed text-center max-w-sm tracking-wide">
          GALAXY SYNC is a demonstration product developed for Samsung Semiconductor.
          All product imagery, trademarks, and branding are property of Samsung Electronics Co., Ltd.
          This application is provided as-is for promotional and educational purposes only.
        </p>
        <p className="text-[9px] sm:text-[10px] text-gray-600 text-center tracking-widest uppercase mt-2">
          &copy; 2026 Samsung Electronics &bull; All Rights Reserved
        </p>
        <div className="splash-continue">
          <span className="text-[10px] sm:text-[11px] text-gray-400 tracking-[0.25em] uppercase animate-pulse">
            Click anywhere to continue
          </span>
        </div>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="start-screen">
      <div className="start-screen__content">
        <div className="start-screen__brand" aria-hidden="true">
          <img
            src={samsungLogo}
            alt="Samsung"
            className="h-5 sm:h-6 md:h-7 w-auto opacity-70 hover:opacity-90 transition-opacity drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          />
        </div>
        <div className="start-screen__title-section">
          <h1 className="start-screen__title">
            <span className="start-screen__title-game">GALAXY</span>
            <span className="start-screen__title-flip">SYNC</span>
          </h1>
          <p className="start-screen__subtitle">
            Test your memory, beat the clock
          </p>
        </div>
        <div className="start-screen__divider" aria-hidden="true">
          <span className="start-screen__divider-line" />
          <span className="start-screen__divider-dot" />
          <span className="start-screen__divider-line" />
        </div>
        <div className="start-screen__menu">
          <button
            className="start-screen__btn start-screen__btn--primary"
            onClick={() => { playSound('menuSelect', isMuted); setGameMode(GAME_MODES.ENDLESS); triggerTransition(() => { setScore(0); setCombo(0); setScoreAtLevelStart(0); setHealth(100); setMaxHealth(100); setupLevel(1, GAME_MODES.ENDLESS); }, 'start'); }}
          >
            <span className="start-screen__btn-glow" aria-hidden="true" />
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true">
                <Play size={18} fill="currentColor" />
              </span>
              ENDLESS MODE
            </span>
          </button>
          <button
            className="start-screen__btn start-screen__btn--survivor"
            onClick={() => { playSound('menuSelect', isMuted); setGameMode(GAME_MODES.SURVIVOR); triggerTransition(() => { setScore(0); setCombo(0); setScoreAtLevelStart(0); setHealth(100); setMaxHealth(100); setupLevel(1, GAME_MODES.SURVIVOR); }, 'start'); }}
          >
            <span className="start-screen__btn-glow" aria-hidden="true" />
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true">
                <Shield size={18} />
              </span>
              SURVIVOR MODE
            </span>
          </button>
          <button className="start-screen__btn start-screen__btn--secondary" onClick={() => { playSound('click', isMuted); initAudio(); setAudioReady(true); triggerTransition(() => setGameState('LEADERBOARD'), 'none'); }}>
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true">
                <Trophy size={18} />
              </span>
              Leaderboard
            </span>
          </button>
        </div>
        <div className="start-screen__footer">
          <p className="start-screen__hint">Tap to flip cards &bull; Find matching pairs &bull; Build your combo</p>
          <div className="start-screen__badges">
            <span className="start-screen__badge">2 Modes</span>
            <span className="start-screen__badge">Endless Levels</span>
            <span className="start-screen__badge">Offline Play</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLeaderboard = () => {
    const filtered = leaderboard
      .filter(e => (e.mode || GAME_MODES.ENDLESS) === leaderboardTab)
      .slice(0, 5);
    const isEndless = leaderboardTab === GAME_MODES.ENDLESS;
    const isSurvivor = leaderboardTab === GAME_MODES.SURVIVOR;

    return (
      <div className="start-screen">
        <div className="start-screen__content z-10 w-full max-w-md">
          <div className="text-center mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-wide mb-2">
              Top <span className="text-[#0689D8] font-bold">Diagnostics</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm tracking-widest uppercase">Ecosystem Leaders</p>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4 sm:mb-5 w-full">
            <button
              onClick={() => { playSound('click', isMuted); setLeaderboardTab(GAME_MODES.ENDLESS); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase transition-all duration-200 border ${
                isEndless
                  ? 'bg-[#0689D8]/15 border-[#0689D8]/30 text-[#0689D8]'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
              }`}
            >
              Endless
            </button>
            <button
              onClick={() => { playSound('click', isMuted); setLeaderboardTab(GAME_MODES.SURVIVOR); }}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] sm:text-xs font-semibold tracking-[0.15em] uppercase transition-all duration-200 border ${
                isSurvivor
                  ? 'bg-red-500/15 border-red-500/30 text-red-400'
                  : 'bg-white/[0.03] border-white/[0.06] text-gray-500 hover:bg-white/[0.06] hover:text-gray-300'
              }`}
            >
              Survivor
            </button>
          </div>

          <div className="w-full bg-[#1A1A1A]/80 border border-[#2A2A2A] backdrop-blur-md rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 shadow-2xl">
            {filtered.length > 0 ? (
              <div className="space-y-3 sm:space-y-4">
                {filtered.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center text-xs sm:text-sm border-b border-white/5 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center text-gray-400">
                      <span className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center mr-2 sm:mr-3 font-bold text-[10px] sm:text-xs ${i === 0 ? 'bg-yellow-500/20 text-yellow-500' : i === 1 ? 'bg-gray-400/20 text-gray-300' : i === 2 ? 'bg-amber-700/20 text-amber-600' : 'bg-white/5 text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <span className="flex flex-col">
                        <span>{entry.date}</span>
                        {isSurvivor && entry.level && (
                          <span className="text-[9px] text-gray-600">Level {entry.level}</span>
                        )}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-white tracking-wider text-xs sm:text-sm">{entry.score} <span className="text-[10px] sm:text-xs font-normal text-gray-500">pts</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6 sm:py-8 text-sm">
                No {isSurvivor ? 'Survivor' : 'Endless'} scores yet.
              </div>
            )}
          </div>
          <button className="start-screen__btn start-screen__btn--secondary w-full" onClick={() => { playSound('click', isMuted); triggerTransition(() => setGameState('MENU'), 'none'); }}>
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><RotateCcw size={18} /></span>
              Back to Main Menu
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderHUD = () => {
    const config = LEVEL_CONFIG[level];
    const cardCount = (config?.pairs || 0) * 2;
    const hudDelay = isEntering ? `${(cardCount * 60) + 200}ms` : '0ms';
    return (
      <header
        key={`hud-${enterKeyRef.current}`}
        className={`game-grid-wrapper flex items-center justify-between mb-4 sm:mb-6 md:mb-8 z-10 relative ${isEntering ? 'animate-hud-enter' : ''}`}
        data-level={level}
        style={isEntering ? { animationDelay: hudDelay } : {}}
      >
        <div className="flex flex-col">
          <span className="text-gray-400 text-[10px] sm:text-xs tracking-widest uppercase mb-1">Status</span>
          <span className="text-base sm:text-lg md:text-xl font-semibold">
            {gameState === 'PREVIEW' ? 'Analyzing...' : `Level ${level}`}
          </span>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-gray-400 text-[10px] sm:text-xs tracking-widest uppercase mb-1">
            {gameState === 'PREVIEW' && previewCountdown !== null ? 'Memorize' : 'Time'}
          </span>
          {gameState === 'PREVIEW' && previewCountdown !== null ? (
            <span
              className="text-lg sm:text-xl md:text-2xl font-mono font-light tracking-wider text-[#00d4ff]"
              style={{
                textShadow: '0 0 12px rgba(0,212,255,0.7), 0 2px 8px rgba(0,0,0,0.8)',
                opacity: previewCountdown === 0 ? 0 : 1,
                transition: 'opacity 0.6s ease-out',
              }}
            >
              {previewCountdown > 0 ? previewCountdown : '0'}
            </span>
          ) : (
            <span
              className="text-lg sm:text-xl md:text-2xl font-mono font-light tracking-wider text-[#0689D8]"
              style={{
                animation: gameState === 'PLAYING' && time === 0 ? 'clockFadeIn 0.6s ease-out forwards' : undefined,
              }}
            >
              {formatTime(time)}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end">
          <span className="text-gray-400 text-[10px] sm:text-xs tracking-widest uppercase mb-1">Score</span>
          <span className="text-base sm:text-lg md:text-xl font-mono font-semibold">{score}</span>
        </div>
      </header>
    );
  };

  const renderGrid = () => {
    const config = LEVEL_CONFIG[level];
    const cameraSize = 'w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4';
    return (
      <div
        key={`grid-${enterKeyRef.current}`}
        className={`game-grid-wrapper ${isFlippingDown ? 'animate-flip-down' : ''}`}
        data-level={level}
      >
        <div
          className={`grid ${config?.gridClass || ''} ${isCelebrating ? 'gap-3 sm:gap-5' : 'gap-2 sm:gap-3'} transition-all duration-700 ease-out`}
          style={{ perspective: '800px' }}
        >
          {deck.map((card, index) => {
            const isMismatched = mismatchedIndices.includes(index);
            const scatterDir = isScattering ? scatterDirsRef.current[index] : null;
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={isLocked || card.isMatched ? -1 : 0}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleCardClick(index)}
                className={`perspective-1000 w-full cursor-pointer outline-none focus:ring-2 focus:ring-[#0689D8] rounded-xl group relative ${isCelebrating && !isScattering ? 'celebrate-pop' : ''} ${isEntering ? 'animate-card-enter' : ''} ${isScattering ? 'pointer-events-none' : ''}`}
                data-aspect="card"
                style={{
                  ...(isCelebrating && !isScattering ? { animationDelay: `${(index % 4) * 0.1}s` } : {}),
                  ...(isEntering ? { animationDelay: `${index * 60}ms` } : {}),
                  ...(isScattering && scatterDir ? {
                    transform: `translate(${scatterDir.x * 0.5}vw, ${scatterDir.y * 0.5}vh) rotateX(-75deg) rotate(${scatterDir.rot}deg) scale(2.5)`,
                    opacity: 0,
                    transition: `transform 1.4s cubic-bezier(0.16, 1, 0.3, 1) ${index * 50}ms, opacity 1.2s ease ${index * 50 + 400}ms`,
                  } : {})
                }}
                onClick={() => handleCardClick(index)}
              >
                <div
                  className={`relative w-full h-full transform-style-3d breeze-transition
                    ${card.isFlipped ? 'rotate-y-180' : ''}
                    ${isMismatched ? 'animate-mismatch' : ''}
                    ${!card.isFlipped && !isLocked ? 'group-hover:-translate-y-1' : ''}
                  `}
                >
                  {/* Card Front — Samsung phone face-down */}
                  <div className="absolute inset-0 w-full h-full backface-hidden bg-[#151515] rounded-xl border border-[#2A2A2A] shadow-md flex flex-col overflow-hidden transition-colors duration-300 group-hover:border-[#444] group-hover:bg-[#1A1A1A]">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
                    <div className="absolute top-2 left-2 flex flex-col gap-1 opacity-70">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`${cameraSize} rounded-full border border-gray-600 bg-[#0A0A0A] shadow-inner`}></div>
                      ))}
                    </div>
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-[#333] text-[10px] sm:text-[12px] md:text-[14px] font-bold tracking-[0.3em] select-none rotate-90 sm:rotate-0">GALAXY</div>
                    </div>
                  </div>
                  {/* Card Back — Galaxy S26 screen with icon reveal */}
                  <div className={`absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-xl border flex flex-col items-center justify-center breeze-transition bg-black overflow-hidden
                    ${card.isMatched ? 'bg-[#0A1A2A]' : ''}
                    ${isCelebrating && card.isMatched ? 'celebrate-glow' : card.isMatched ? 'border-[#0689D8] shadow-[0_0_15px_rgba(6,137,216,0.2)]' : 'border-[#333]'}
                  `}>
                    {/* Glossy screen reflection */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/[0.03] pointer-events-none"></div>
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent pointer-events-none" style={{ clipPath: 'polygon(0 0, 100% 0, 60% 50%, 0 80%)' }}></div>
                    {/* Inner edge highlight */}
                    <div className="absolute inset-[1px] rounded-xl border border-white/[0.05] pointer-events-none"></div>
                    {/* Front camera punch-hole */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[#111] border border-[#222]"></div>
                    {/* Icon on screen */}
                    <img
                      src={card.icon}
                      alt={card.name}
                      className={`card-icon relative z-10 ${card.isMatched ? 'scale-110' : ''} ${isMismatched ? 'opacity-60' : ''}`}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPreviewOverlay = () => {
    return null;
  };

  const renderSyncBar = () => {
    const totalPairs = LEVEL_CONFIG[level]?.pairs || 0;
    const progressPercent = (matches / totalPairs) * 100;
    const config = LEVEL_CONFIG[level];
    const cardCount = (config?.pairs || 0) * 2;
    const barDelay = isEntering ? `${(cardCount * 60) + 400}ms` : '0ms';
    if (gameState !== 'PLAYING' && gameState !== 'PREVIEW') return null;
    return (
      <div
        key={`syncbar-${enterKeyRef.current}`}
        className={`fixed left-3 sm:left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-3 ${isEntering ? 'animate-footer-enter' : ''}`}
        style={isEntering ? { animationDelay: barDelay } : {}}
      >
        <span className="text-[9px] sm:text-[10px] text-gray-500 font-medium tracking-widest uppercase writing-mode-vertical">
          Synced
        </span>
        <div className="w-1 sm:w-1.5 h-32 sm:h-40 md:h-48 bg-[#1A1A1A] rounded-full overflow-hidden relative">
          <div
            className="absolute bottom-0 left-0 w-full bg-[#0689D8] rounded-full transition-all duration-700 ease-out"
            style={{ height: `${progressPercent}%` }}
          />
        </div>
        <span className="text-[10px] sm:text-xs text-gray-500 font-mono font-medium">
          {matches}/{totalPairs}
        </span>
        {combo > 1 && (
          <span className="text-[9px] sm:text-[10px] text-[#0689D8] font-bold animate-pulse">
            {combo}x
          </span>
        )}
      </div>
    );
  };

  const renderHealthBar = () => {
    if (gameMode !== GAME_MODES.SURVIVOR) return null;
    if (gameState !== 'PLAYING' && gameState !== 'PREVIEW') return null;
    const config = getLevelConfig(level, gameMode);
    const cardCount = (config?.pairs || 0) * 2;
    const barDelay = isEntering ? `${(cardCount * 60) + 400}ms` : '0ms';
    return (
      <div
        key={`healthbar-${enterKeyRef.current}`}
        className={`survivor-health-wrap ${isEntering ? 'animate-footer-enter' : ''}`}
        style={isEntering ? { animationDelay: barDelay } : {}}
      >
        <span className="survivor-health-label">Health</span>
        <div className="survivor-health-bar">
          <div
            className={`survivor-health-fill ${
              health <= maxHealth * 0.25
                ? 'critical'
                : health <= maxHealth * 0.5
                  ? 'warning'
                  : ''
            }`}
            style={{ height: `${(health / maxHealth) * 100}%` }}
          />
        </div>
        <span className="survivor-health-value">
          {Math.ceil(health)}
        </span>
        <Heart size={14} className={`text-red-400 ${health <= maxHealth * 0.25 ? 'animate-pulse' : 'opacity-60'}`} />
      </div>
    );
  };

  const renderGameOver = () => (
    <div className="start-screen">
      <div className="start-screen__content z-10 w-full max-w-md">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 mb-4">
            <Heart size={32} className="text-red-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-light text-white tracking-wide mb-2">
            <span className="text-red-400 font-bold">Game Over</span>
          </h2>
          <p className="text-gray-400 text-xs sm:text-sm tracking-widest uppercase">Survivor Mode — Level {level}</p>
        </div>
        <div className="w-full bg-[#1A1A1A]/80 border border-[#2A2A2A] backdrop-blur-md rounded-2xl p-4 sm:p-6 mb-6 shadow-2xl">
          <div className="flex justify-between items-center mb-3">
            <span className="text-gray-400 text-xs tracking-widest uppercase">Final Score</span>
            <span className="font-mono font-bold text-white text-lg sm:text-xl">{score}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-xs tracking-widest uppercase">Level Reached</span>
            <span className="font-mono font-bold text-white text-lg sm:text-xl">{level}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            className="start-screen__btn start-screen__btn--survivor w-full"
            onClick={() => { playSound('menuSelect', isMuted); setGameMode(GAME_MODES.SURVIVOR); triggerTransition(() => { setScore(0); setCombo(0); setScoreAtLevelStart(0); setHealth(100); setMaxHealth(100); setupLevel(1, GAME_MODES.SURVIVOR); }, 'start'); }}
          >
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><RotateCcw size={18} /></span>
              Try Again
            </span>
          </button>
          <button
            className="start-screen__btn start-screen__btn--secondary w-full"
            onClick={() => { playSound('click', isMuted); triggerTransition(() => setGameState('MENU'), 'menu'); }}
          >
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><Home size={18} /></span>
              Main Menu
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const handleAdvanceLevel = () => {
    generateScatterDirs(deck.length);
    setGameState('SCATTERING');
    setIsScattering(true);
    playSound('scatter', isMuted);
    playSound('levelTransition', isMuted);
    setTimeout(() => {
      setIsTransitioning(true);
      bgRef.current?.nextRound();
      setTimeout(() => {
        setIsScattering(false);
        setScoreAtLevelStart(score);
        setupLevel(level + 1);
      }, 650);
      setTimeout(() => { setIsTransitioning(false); }, 1300);
    }, 1800);
  };

  const handleReturnToDashboard = () => {
    if (score > 0) saveScore(score, gameMode, level);
    generateScatterDirs(deck.length);
    setGameState('SCATTERING');
    setIsScattering(true);
    playSound('scatter', isMuted);
    bgRef.current?.gameOver();
    setTimeout(() => {
      setIsTransitioning(true);
      bgRef.current?.returnToMenu();
      setTimeout(() => {
        setIsScattering(false);
        setGameState('MENU');
      }, 650);
      setTimeout(() => { setIsTransitioning(false); }, 1300);
    }, 1800);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#05060a] flex flex-col items-center justify-center relative overflow-hidden">
      <SpaceBackground ref={bgRef} />
      <div className={`relative z-10 w-full h-full min-h-screen min-h-[100dvh] flex flex-col items-center justify-center py-4 sm:py-6 transition-opacity duration-[650ms] ease-[cubic-bezier(.22,1,.36,1)] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* Fixed buttons — z-40 to stay below modal z-60 */}
        {gameState !== 'MENU' && gameState !== 'LEADERBOARD' && gameState !== 'SPLASH' && (
          <button
            onClick={() => { playSound('click', isMuted); if (score > 0) saveScore(score, gameMode, level); triggerTransition(() => setGameState('MENU'), 'menu'); }}
            className="fixed top-3 left-3 sm:top-4 sm:left-4 md:left-6 z-40 p-2 text-gray-500 hover:text-white transition-colors flex items-center group"
            aria-label="Back to Menu"
          >
            <Home size={18} className="sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
            <span className="ml-2 sm:ml-3 text-[9px] sm:text-[10px] font-semibold tracking-[0.2em] uppercase opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
              Main Menu
            </span>
          </button>
        )}
        {/* Settings gear */}
        {gameState !== 'SPLASH' && (
          <button
            onClick={() => { playSound('click', isMuted); setShowSettings(s => !s); }}
            className="fixed top-3 right-3 sm:top-4 sm:right-4 md:right-6 z-40 p-2 text-gray-500 hover:text-white transition-all duration-300"
            aria-label="Settings"
            style={{ opacity: showSettings ? 1 : 0.4 }}
          >
            <Settings size={18} className={`sm:w-5 sm:h-5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
          </button>
        )}

        {/* Settings panel */}
        {showSettings && (
          <div className="fixed top-12 right-3 sm:top-14 sm:right-4 md:right-6 z-50 w-56 sm:w-64 bg-[#131313]/95 border border-[#2A2A2A] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden settings-panel-enter">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-[10px] sm:text-[11px] text-gray-400 tracking-[0.2em] uppercase font-semibold">Audio</span>
              <button onClick={() => setShowSettings(false)} className="text-gray-500 hover:text-white transition-colors p-0.5">
                <X size={14} />
              </button>
            </div>

            <div className="px-4 pb-4 space-y-4">
              {/* Master mute */}
              <button
                onClick={() => {
                  if (!isMuted) playSound('toggleOff', false);
                  setIsMuted(!isMuted);
                  if (isMuted) setTimeout(() => playSound('toggleOn', false), 50);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${isMuted
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-white/[0.03] border-white/[0.06] text-gray-300 hover:bg-white/[0.06]'
                  }`}
              >
                {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
                <span className="text-xs font-medium tracking-wide">{isMuted ? 'Muted' : 'Sound On'}</span>
              </button>

              {/* Music volume */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-400">
                  <Music size={13} />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-medium">Music</span>
                  <span className="text-[10px] text-gray-600 ml-auto font-mono">{Math.round(musicVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(musicVol * 100)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) / 100;
                    setMusicVol(v);
                    setMusicVolume(v);
                  }}
                  className="settings-slider w-full"
                  disabled={isMuted}
                />
              </div>

              {/* SFX volume */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-gray-400">
                  <Zap size={13} />
                  <span className="text-[10px] tracking-[0.15em] uppercase font-medium">SFX</span>
                  <span className="text-[10px] text-gray-600 ml-auto font-mono">{Math.round(sfxVol * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(sfxVol * 100)}
                  onChange={(e) => {
                    const v = parseInt(e.target.value) / 100;
                    setSfxVol(v);
                    setSfxVolume(v);
                  }}
                  className="settings-slider w-full"
                  disabled={isMuted}
                />
              </div>
            </div>
          </div>
        )}
        {gameState === 'SPLASH' && renderSplash()}
        {gameState === 'MENU' && renderMenu()}
        {gameState === 'LEADERBOARD' && renderLeaderboard()}
        {gameState !== 'MENU' && gameState !== 'LEADERBOARD' && gameState !== 'SPLASH' && (
          <>
            {renderSyncBar()}
            {renderHealthBar()}
            {gameMode === GAME_MODES.SURVIVOR && tookDamage && (
              <div className="survivor-damage-flash" />
            )}
            <div className="flex flex-col items-center w-full h-full relative px-2 sm:px-4">
              {renderHUD()}
              <div className="flex-1 flex items-center justify-center w-full relative">
                {renderGrid()}
                {renderPreviewOverlay()}
              </div>
            </div>
          </>
        )}
        {gameState === 'GAME_OVER' && renderGameOver()}
        {gameState === 'LEVEL_COMPLETE' && (
          <LevelCompleteScreen
            level={level}
            score={score}
            scoreAtLevelStart={scoreAtLevelStart}
            time={time}
            isMuted={isMuted}
            onAdvance={handleAdvanceLevel}
            onReturn={handleReturnToDashboard}
          />
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback, useRef } from 'react';
import { Trophy, Play, Volume2, VolumeX, Home, Settings, X, Music, Zap, Heart, Shield } from 'lucide-react';
import SpaceBackground from './components/background/SpaceBackground';
import LevelCompleteScreen from './components/LevelCompleteScreen';
import { ALL_ICONS, LEVEL_CONFIG, GAME_MODES, getLevelConfig, GRAND_PRIZE_THRESHOLD, isGrandPrizeAvailable, addGrandPrizeWinner, resetGrandPrizeToday, isGrandPrizeDisabled, setGrandPrizeDisabled, getGrandPrizeWinnersToday, GRAND_PRIZE_DAILY_MAX } from './constants/config';
import GrandPrizeScreen from './components/GrandPrizeScreen';
import { playSound, initAudio, startMusic, stopMusic, setMusicVolume, setSfxVolume, distortAndStopMusic, playGameOverJingle } from './utils/audio';
import { shuffleArray, formatTime } from './utils/helpers';
import samsungLogo from './assets/logo/Samsung_Orig_Wordmark_WHITE_RGB.png';
import cardMetallicBase from './assets/cards/card-metallic-base.svg';
import cardMetallicSheen from './assets/cards/card-metallic-sheen.webm';
import cardSemiconductorGold from './assets/cards/card-semiconductor-gold.svg';

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
  const [leaderboard, setLeaderboard] = useState(() => {
    try {
      const saved = localStorage.getItem('galaxy-sync-leaderboard');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isScattering, setIsScattering] = useState(false);
  const [scoreAtLevelStart, setScoreAtLevelStart] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [musicVol, setMusicVol] = useState(0.75);
  const [sfxVol, setSfxVol] = useState(0.7);
  const [audioReady, setAudioReady] = useState(false);
  const [gameMode, setGameMode] = useState(GAME_MODES.TIMED);
  const [leaderboardTab, setLeaderboardTab] = useState(GAME_MODES.TIMED);
  const [health, setHealth] = useState(100);
  const [maxHealth, setMaxHealth] = useState(100);
  const [tookDamage, setTookDamage] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [rankRevealData, setRankRevealData] = useState(null);
  const [displayRank, setDisplayRank] = useState(0);
  const [gpDisabled, setGpDisabled] = useState(() => isGrandPrizeDisabled());
  const [gpWinnersToday, setGpWinnersToday] = useState(() => getGrandPrizeWinnersToday().length);

  const timerRef = useRef(null);
  const mismatchTimeoutRef = useRef(null);
  const rankAnimRef = useRef(null);
  const enterKeyRef = useRef(0);
  const bgRef = useRef(null);
  const scatterDirsRef = useRef([]);
  const pendingScoreRef = useRef(null);
  const playerRowRef = useRef(null);
  const prefersReducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

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

  const MAX_LEADERBOARD_ENTRIES = 500;

  const saveScore = useCallback((finalScore, mode, lvl, name) => {
    setLeaderboard(prev => {
      const entry = {
        name: name || 'Anonymous',
        score: finalScore,
        date: new Date().toLocaleDateString(),
        mode: mode || GAME_MODES.TIMED,
        level: lvl || 1,
      };
      return [...prev, entry].sort((a, b) => b.score - a.score).slice(0, MAX_LEADERBOARD_ENTRIES);
    });
  }, []);

  const triggerTransition = useCallback((actionFn, warpType) => {
    setIsTransitioning(true);
    if (warpType === 'start') bgRef.current?.startGame();
    else if (warpType === 'next') bgRef.current?.nextRound();
    else if (warpType === 'menu') bgRef.current?.returnToMenu();
    // Stop menu music immediately when starting the game
    if (warpType === 'start') stopMusic();
    // Play deep woosh when warp shader accelerates (not on menu return)
    if (warpType === 'start' || warpType === 'next') {
      playSound('warpWoosh', isMuted);
    }
    setTimeout(() => { actionFn(); }, 650);
    setTimeout(() => { setIsTransitioning(false); }, 1300);
  }, [isMuted]);

  const setupLevel = useCallback((targetLevel, mode) => {
    const activeMode = mode ?? gameMode;
    initAudio();
    setAudioReady(true);
    if (mismatchTimeoutRef.current) { clearTimeout(mismatchTimeoutRef.current); mismatchTimeoutRef.current = null; }
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
    setCombo(0);
    setTime(config.timeLimit ?? 60);
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
    setIsFlippingDown(true);
    const flipTimer = setTimeout(() => {
      setDeck(prev => prev.map(card => ({ ...card, isFlipped: false })));
      setIsFlippingDown(false);
      setPreviewCountdown(null);
      setIsLocked(false);
      setGameState('PLAYING');
    }, 300);
    return () => clearTimeout(flipTimer);
  }, [previewCountdown, gameState, isMuted]);

  // --- Persist leaderboard to localStorage ---
  useEffect(() => {
    try {
      localStorage.setItem('galaxy-sync-leaderboard', JSON.stringify(leaderboard));
    } catch (e) {
      console.warn('Failed to save leaderboard to localStorage:', e.message);
    }
  }, [leaderboard]);

  // --- Rank reveal count-up animation ---
  useEffect(() => {
    if (gameState !== 'RANK_REVEAL' || !rankRevealData) return;
    const targetRank = rankRevealData.rank;
    if (targetRank <= 1) { setDisplayRank(targetRank); return; }
    const duration = Math.min(600 + targetRank * 4, 1500);
    const start = performance.now();
    let lastSound = 0;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.max(1, Math.round(eased * targetRank));
      setDisplayRank(current);
      if (now - lastSound > 80 && current < targetRank) {
        lastSound = now;
      }
      if (progress < 1) {
        rankAnimRef.current = requestAnimationFrame(animate);
      } else {
        rankAnimRef.current = null;
        playSound('correct', isMuted);
      }
    };
    rankAnimRef.current = requestAnimationFrame(animate);
    return () => { if (rankAnimRef.current) cancelAnimationFrame(rankAnimRef.current); };
  }, [gameState, rankRevealData, isMuted]);

  // --- Auto-scroll to player's row in rank reveal ---
  useEffect(() => {
    if (gameState !== 'RANK_REVEAL' || !rankRevealData || rankRevealData.rank > 50) return;
    const timer = setTimeout(() => {
      playerRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 1200);
    return () => clearTimeout(timer);
  }, [gameState, rankRevealData]);

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

    // Silent screens — stop any leftover music, don't start new
    if (gameState === 'GAME_OVER' || gameState === 'NAME_INPUT' || gameState === 'RANK_REVEAL') {
      stopMusic();
      return;
    }

    const isInGame = gameState === 'PREVIEW' || gameState === 'PLAYING' ||
      gameState === 'LEVEL_COMPLETE' || gameState === 'SCATTERING' ||
      gameState === 'GRAND_PRIZE';

    if (isInGame) {
      startMusic('ingame');
    } else {
      startMusic('menu');
    }
  }, [gameState, isMuted, audioReady]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !isCelebrating) {
      timerRef.current = setInterval(() => setTime(t => Math.max(0, t - 1)), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, isCelebrating]);

  // Keep refs for values needed in game-over to avoid stale closures
  const scoreRef = useRef(score);
  const gameModeRef = useRef(gameMode);
  const levelRef = useRef(level);
  useEffect(() => { scoreRef.current = score; }, [score]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { levelRef.current = level; }, [level]);

  // Time's up — game over
  useEffect(() => {
    if (gameState !== 'PLAYING' || time > 0 || isCelebrating) return;
    if (mismatchTimeoutRef.current) { clearTimeout(mismatchTimeoutRef.current); mismatchTimeoutRef.current = null; }
    setIsLocked(true);
    bgRef.current?.gameOver?.();
    // Distort & slow the music, then play loser jingle and transition
    distortAndStopMusic(() => {
      playGameOverJingle(isMuted);
      setTimeout(() => {
        pendingScoreRef.current = { score: scoreRef.current, mode: gameModeRef.current, level: levelRef.current };
        triggerTransition(() => {
          setIsLocked(false);
          setGameState('GAME_OVER');
        }, 'menu');
      }, 800);
    });
  }, [time, gameState, isCelebrating, triggerTransition, isMuted]);

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
        const speedBonus = Math.min(30, Math.round(time * 0.8));
        const comboBonus = Math.min(combo * 30, 120);
        const pointsEarned = 100 + comboBonus + speedBonus;
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
        setScore(s => Math.max(0, s - 50));
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
    if (mismatchTimeoutRef.current) { clearTimeout(mismatchTimeoutRef.current); mismatchTimeoutRef.current = null; }
    setIsLocked(true);
    bgRef.current?.gameOver?.();
    // Distort & slow the music, then play loser jingle and transition
    distortAndStopMusic(() => {
      playGameOverJingle(isMuted);
      setTimeout(() => {
        pendingScoreRef.current = { score: scoreRef.current, mode: gameModeRef.current, level: levelRef.current };
        triggerTransition(() => {
          setIsLocked(false);
          setGameState('GAME_OVER');
        }, 'menu');
      }, 800);
    });
  }, [health, gameMode, gameState, triggerTransition]);

  const flippedCountRef = useRef(0);
  useEffect(() => { flippedCountRef.current = flippedIndices.length; }, [flippedIndices]);

  const handleCardClick = (index) => {
    if (isLocked || flippedCountRef.current >= 2 || flippedIndices.length >= 2 || deck[index].isFlipped || deck[index].isMatched) return;
    flippedCountRef.current += 1;
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
          className="h-8 sm:h-10 md:h-12 w-auto opacity-90 drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]"
        />
        <div className="splash-continue mt-12 sm:mt-16">
          <span className="text-[11px] sm:text-xs text-gray-400 tracking-[0.3em] uppercase animate-pulse">
            Touch Screen to Begin
          </span>
        </div>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="start-screen">
      <div className="start-screen__content">
        <div className="start-screen__brand mb-1" aria-hidden="true">
          <img
            src={samsungLogo}
            alt="Samsung"
            className="h-5 sm:h-6 md:h-7 w-auto opacity-70 hover:opacity-90 transition-opacity drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          />
        </div>
        <div className="start-screen__title-section">
          <h1 className="start-screen__title">
            <span className="start-screen__title-game">MEMORY</span>
            <span className="start-screen__title-flip">FLIP</span>
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
            onClick={() => { playSound('menuSelect', isMuted); setGameMode(GAME_MODES.TIMED); triggerTransition(() => { setScore(0); setCombo(0); setScoreAtLevelStart(0); setHealth(100); setMaxHealth(100); setupLevel(1, GAME_MODES.TIMED); }, 'start'); }}
          >
            <span className="start-screen__btn-glow" aria-hidden="true" />
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true">
                <Play size={18} fill="currentColor" />
              </span>
              TIMED MODE
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
                <Trophy size={18} className="text-[#0689D8] drop-shadow-[0_0_6px_rgba(6,137,216,0.5)]" />
              </span>
              Leaderboard
            </span>
          </button>
        </div>
        <div className="start-screen__footer">
          <p className="start-screen__hint">Tap to flip cards &bull; Find matching pairs &bull; Build your combo</p>
          <div className="start-screen__badges">
            <span className="start-screen__badge">2 Modes</span>
            <span className="start-screen__badge">Timed Levels</span>
            <span className="start-screen__badge">Offline Play</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPodium = (entries) => {
    const top3 = entries.slice(0, 3);
    if (top3.length === 0) return null;
    const medals = [
      { border: 'border-yellow-400/40', bg: 'podium-card-gold', text: 'text-yellow-400', glow: 'podium-gold', label: '1st', icon: '👑' },
      { border: 'border-gray-300/30', bg: 'podium-card-silver', text: 'text-gray-300', glow: 'podium-silver', label: '2nd', icon: '' },
      { border: 'border-amber-500/30', bg: 'podium-card-bronze', text: 'text-amber-500', glow: 'podium-bronze', label: '3rd', icon: '' },
    ];
    const order = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0];
    return (
      <div className="flex items-end justify-center gap-3 sm:gap-4 mb-5 sm:mb-6 rank-reveal-podium">
        {order.map(idx => {
          const entry = top3[idx];
          const medal = medals[idx];
          if (!entry) return null;
          const isFirst = idx === 0;
          return (
            <div key={idx} className={`podium-card flex flex-col items-center justify-end ${isFirst ? 'w-28 sm:w-32 md:w-36' : 'w-22 sm:w-26 md:w-28'} ${isFirst ? 'podium-card--first' : ''} ${medal.bg} border ${medal.border} rounded-2xl ${medal.glow} p-3 sm:p-4 transition-all`}
              style={{ minHeight: isFirst ? '140px' : idx === 1 ? '115px' : '100px' }}
            >
              {isFirst && <span className="text-xl mb-1">{medal.icon}</span>}
              <span className={`text-xs sm:text-sm font-bold ${medal.text} mb-1.5 tracking-wider`}>{medal.label}</span>
              <span className="text-white text-xs sm:text-sm font-semibold truncate w-full text-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">{entry.name || 'Anonymous'}</span>
              <span className="text-gray-300 text-[10px] sm:text-xs font-mono mt-1 tracking-wide">{entry.score} <span className="text-gray-500 text-[9px]">pts</span></span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLeaderboardEntry = (entry, i, isSurvivor, highlightEntry = null) => {
    const isPlayer = highlightEntry && entry.name === highlightEntry.name && entry.score === highlightEntry.score && entry.date === highlightEntry.date;
    return (
      <div
        key={`${i}-${entry.name}`}
        ref={isPlayer ? playerRowRef : undefined}
        className={`lb-row flex justify-between items-center text-xs sm:text-sm py-3 px-3 sm:px-4 rounded-xl transition-colors ${
          isPlayer ? 'lb-row--player' : i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'
        }`}
      >
        <div className="flex items-center min-w-0 gap-2.5 sm:gap-3">
          <span className={`lb-rank-badge shrink-0 ${
            i === 0 ? 'lb-rank--gold' : i === 1 ? 'lb-rank--silver' : i === 2 ? 'lb-rank--bronze' : ''
          }`}>
            {i + 1}
          </span>
          <span className="flex flex-col min-w-0">
            <span className="text-white/90 font-semibold truncate flex items-center gap-2 text-xs sm:text-sm">
              {entry.name || 'Anonymous'}
              {isPlayer && <span className="lb-you-pill shrink-0">YOU</span>}
            </span>
            <span className="text-[10px] sm:text-[11px] text-gray-500 mt-0.5">{entry.date}{isSurvivor && entry.level ? ` · Level ${entry.level}` : ''}</span>
          </span>
        </div>
        <span className="font-mono font-bold text-white tracking-wider text-sm sm:text-base shrink-0 ml-3">{entry.score}<span className="text-[10px] sm:text-xs font-normal text-gray-500 ml-1">pts</span></span>
      </div>
    );
  };

  const renderLeaderboard = () => {
    const allFiltered = leaderboard.filter(e => (e.mode || GAME_MODES.TIMED) === leaderboardTab);
    const filtered = allFiltered.slice(0, 50);
    const isTimed = leaderboardTab === GAME_MODES.TIMED;
    const isSurvivor = leaderboardTab === GAME_MODES.SURVIVOR;

    return (
      <div className="start-screen">
        <div className="start-screen__content z-10 w-full max-w-lg lb-screen">
          {/* Header */}
          <div className="text-center mb-5 sm:mb-6">
            <div className="lb-title-icon mb-3">
              <Trophy size={28} className="text-[#0689D8]" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wide mb-2">
              Top <span className="text-[#0689D8]">Scores</span>
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm tracking-[0.25em] uppercase font-medium">Ecosystem Leaders</p>
          </div>

          {/* Tab switcher */}
          <div className="lb-tab-switcher mb-5 sm:mb-6">
            <button
              onClick={() => { playSound('click', isMuted); setLeaderboardTab(GAME_MODES.TIMED); }}
              className={`lb-tab ${isTimed ? 'lb-tab--active-timed' : ''}`}
            >
              <Zap size={14} className="shrink-0" />
              Timed
            </button>
            <button
              onClick={() => { playSound('click', isMuted); setLeaderboardTab(GAME_MODES.SURVIVOR); }}
              className={`lb-tab ${isSurvivor ? 'lb-tab--active-survivor' : ''}`}
            >
              <Shield size={14} className="shrink-0" />
              Survivor
            </button>
          </div>

          {renderPodium(allFiltered)}

          {/* List panel */}
          <div className="lb-list-panel mb-5 sm:mb-6">
            {filtered.length > 3 ? (
              <div className="max-h-[45vh] sm:max-h-[380px] overflow-y-auto leaderboard-scroll space-y-1 p-1">
                {filtered.slice(3).map((entry, i) => renderLeaderboardEntry(entry, i + 3, isSurvivor))}
              </div>
            ) : filtered.length > 0 ? (
              <div className="text-center text-gray-400 py-5 sm:py-6 text-sm">
                All scores shown on the podium above.
              </div>
            ) : (
              <div className="text-center py-8 sm:py-10">
                <div className="text-gray-600 text-2xl mb-3">🏆</div>
                <p className="text-gray-400 text-sm font-medium mb-1">No {isSurvivor ? 'Survivor' : 'Timed'} scores yet</p>
                <p className="text-gray-600 text-xs">Play a round to claim your spot!</p>
              </div>
            )}
            {allFiltered.length > 50 && (
              <p className="text-gray-500 text-[10px] text-center mt-3 tracking-wider font-mono">{allFiltered.length} total entries</p>
            )}
          </div>

          {/* CTA */}
          <button className="start-screen__btn start-screen__btn--secondary w-full" onClick={() => { playSound('click', isMuted); triggerTransition(() => setGameState('MENU'), 'none'); }}>
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><Home size={18} /></span>
              Back to Main Menu
            </span>
          </button>
        </div>
      </div>
    );
  };

  const renderRankReveal = () => {
    if (!rankRevealData) return null;
    const { rank, entry, mode } = rankRevealData;
    const isSurvivor = mode === GAME_MODES.SURVIVOR;
    const allForMode = leaderboard.filter(e => (e.mode || GAME_MODES.TIMED) === mode);
    const top50 = allForMode.slice(0, 50);
    const inTop50 = rank <= 50;
    const accentColor = isSurvivor ? '#ef4444' : '#0689D8';

    return (
      <div className="start-screen">
        <div className="start-screen__content z-10 w-full max-w-lg lb-screen">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-5">
            <p className="text-gray-400 text-[10px] sm:text-xs tracking-[0.3em] uppercase font-medium mb-2">
              {isSurvivor ? 'Survivor' : 'Timed'} Mode
            </p>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wide">
              Your <span style={{ color: accentColor }}>Ranking</span>
            </h2>
          </div>

          {/* Rank number hero */}
          <div className="rank-reveal-number rank-hero-card mb-5 sm:mb-6" style={{ '--accent': accentColor }}>
            <p className="text-gray-400 text-[10px] sm:text-xs tracking-[0.3em] uppercase mb-2 font-medium">Your Rank</p>
            <p className="rank-hero-number font-mono" style={{ color: accentColor }}>
              #{displayRank || rank}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-white/80 text-sm sm:text-base font-semibold">{entry.name || 'Anonymous'}</span>
              <span className="text-gray-500 text-xs">·</span>
              <span className="text-gray-400 text-xs sm:text-sm font-mono">{entry.score} pts</span>
            </div>
          </div>

          {renderPodium(allForMode)}

          {/* Scrollable list if in top 50, otherwise motivational message */}
          {inTop50 ? (
            <div className="lb-list-panel mb-5 sm:mb-6 rank-reveal-list">
              <div className="max-h-[35vh] sm:max-h-[300px] overflow-y-auto rank-reveal-scroll space-y-1 p-1">
                {top50.map((e, i) => renderLeaderboardEntry(e, i, isSurvivor, entry))}
              </div>
            </div>
          ) : (
            <div className="lb-list-panel mb-5 sm:mb-6 rank-reveal-list text-center py-6 sm:py-8">
              <p className="text-gray-400 text-sm font-medium mb-2">Keep playing to climb the ranks!</p>
              <p className="text-gray-500 text-xs mb-4">You need a top 50 score to appear on the board.</p>
              <button
                className="text-xs tracking-[0.2em] uppercase font-semibold transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5"
                style={{ color: accentColor }}
                onClick={() => { setLeaderboardTab(mode); setRankRevealData(null); triggerTransition(() => setGameState('LEADERBOARD'), 'none'); }}
              >
                View Top 50
              </button>
            </div>
          )}

          <button
            className="start-screen__btn start-screen__btn--primary w-full"
            onClick={() => { playSound('click', isMuted); setRankRevealData(null); triggerTransition(() => setGameState('MENU'), 'menu'); }}
          >
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><Home size={18} /></span>
              Continue
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
        className={`fixed top-0 left-0 right-0 flex items-center justify-between px-3 sm:px-6 md:px-8 py-3 sm:py-4 z-40 bg-black/50 backdrop-blur-md border-b border-white/[0.06] ${isEntering ? 'animate-hud-enter' : ''}`}
        data-level={level}
        style={isEntering ? { animationDelay: hudDelay } : {}}
      >
        {/* Left: Home + Status */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={() => { playSound('click', isMuted); if (mismatchTimeoutRef.current) { clearTimeout(mismatchTimeoutRef.current); mismatchTimeoutRef.current = null; } setIsLocked(false); if (score > 0) { pendingScoreRef.current = { score, mode: gameMode, level }; setGameState('NAME_INPUT'); } else { triggerTransition(() => setGameState('MENU'), 'menu'); } }}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/[0.06] shrink-0"
            aria-label="Back to Menu"
          >
            <Home size={18} className="sm:w-5 sm:h-5" />
          </button>
          <div className="w-px h-6 sm:h-7 bg-white/10 shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-gray-400 text-[9px] sm:text-[10px] tracking-widest uppercase leading-tight mb-0.5">Status</span>
            <span className="text-sm sm:text-base md:text-lg font-semibold truncate">
              {gameState === 'PREVIEW' ? 'Analyzing...' : `Level ${level}`}
            </span>
          </div>
        </div>

        {/* Center: Timer/Memorize */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
          <span className="text-gray-400 text-[9px] sm:text-[10px] tracking-widest uppercase leading-tight mb-0.5">
            {gameState === 'PREVIEW' && previewCountdown !== null ? 'Memorize' : 'Time'}
          </span>
          {gameState === 'PREVIEW' && previewCountdown !== null ? (
            <span
              className="text-base sm:text-lg md:text-xl font-mono font-light tracking-wider text-[#00d4ff]"
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
              className={`text-base sm:text-lg md:text-xl font-mono font-light tracking-wider ${time <= 5 && gameState === 'PLAYING' ? 'text-red-500' : 'text-[#0689D8]'}`}
            >
              {formatTime(time)}
            </span>
          )}
        </div>

        {/* Right: Score + Settings */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div className="flex flex-col items-end min-w-0">
            <span className="text-gray-400 text-[9px] sm:text-[10px] tracking-widest uppercase leading-tight mb-0.5">Score</span>
            <span className="text-sm sm:text-base md:text-lg font-mono font-semibold">{score}</span>
          </div>
          <div className="w-px h-6 sm:h-7 bg-white/10 shrink-0" />
          <button
            onClick={() => { playSound('click', isMuted); setShowSettings(s => { if (!s) { setGpWinnersToday(getGrandPrizeWinnersToday().length); setGpDisabled(isGrandPrizeDisabled()); } return !s; }); }}
            className="p-2 sm:p-2.5 text-gray-400 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/[0.06] shrink-0"
            aria-label="Settings"
            style={{ opacity: showSettings ? 1 : undefined }}
          >
            <Settings size={18} className={`sm:w-5 sm:h-5 transition-transform duration-300 ${showSettings ? 'rotate-90' : ''}`} />
          </button>
        </div>
      </header>
    );
  };

  const renderGrid = () => {
    const config = LEVEL_CONFIG[level];

    return (
      <div
        key={`grid-${enterKeyRef.current}`}
        className={`game-grid-wrapper ${isFlippingDown ? 'animate-flip-down' : ''}`}
        data-level={Math.min(level, 5)}
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
                className={`perspective-1000 w-full cursor-pointer outline-none focus:ring-2 focus:ring-[#0689D8] group relative ${isCelebrating && !isScattering ? 'celebrate-pop' : ''} ${isEntering ? 'animate-card-enter' : ''} ${isScattering ? 'pointer-events-none' : ''}`}
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
                  {/* Card Front — Metallic base face-down */}
                  <div className="absolute inset-0 w-full h-full backface-hidden card-front-face overflow-hidden">
                    {prefersReducedMotion.current ? (
                      <img src={cardMetallicBase} alt="Card back" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                    ) : (
                      <>
                        <video
                          src={cardMetallicSheen}
                          autoPlay
                          loop
                          muted
                          playsInline
                          preload="metadata"
                          className="absolute inset-0 w-full h-full object-cover"
                          draggable={false}
                          onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'block'; }}
                        />
                        <img src={cardMetallicBase} alt="Card back" className="absolute inset-0 w-full h-full object-cover" style={{ display: 'none' }} draggable={false} />
                      </>
                    )}
                    {/* Samsung logo overlay */}
                    <img
                      src={samsungLogo}
                      alt="Samsung"
                      className="absolute inset-0 m-auto w-[60%] z-10 pointer-events-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      draggable={false}
                    />
                  </div>
                  {/* Card Back — Semiconductor gold with icon reveal */}
                  <div className={`absolute inset-0 w-full h-full backface-hidden card-back-face overflow-hidden flex items-center justify-center breeze-transition
                    ${isCelebrating && card.isMatched ? 'celebrate-glow' : card.isMatched ? 'shadow-[0_0_15px_rgba(212,162,58,0.3)]' : ''}
                  `}>
                    <img src={cardSemiconductorGold} alt="Card face" className="absolute inset-0 w-full h-full object-cover" draggable={false} />
                    {/* Icon on card */}
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
        <div className="w-2 sm:w-2.5 h-48 sm:h-56 md:h-64 bg-[#1A1A1A] rounded-full overflow-hidden relative">
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
    <div className="start-screen game-over-screen">
      <div className="start-screen__content z-10 w-full max-w-md">
        <div className="text-center mb-5 sm:mb-6">
          <div className="game-over-icon-ring mb-4">
            <Heart size={36} className="text-red-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-wide mb-2">
            <span className="text-red-400">Game Over</span>
          </h2>
          <p className="text-gray-300 text-xs sm:text-sm tracking-[0.25em] uppercase font-medium">
            {gameMode === GAME_MODES.SURVIVOR ? 'Survivor' : 'Timed'} Mode — Level {level}
          </p>
        </div>
        <div className="game-over-stats-panel mb-6 sm:mb-8">
          <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
            <span className="text-gray-400 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium">Final Score</span>
            <span className="font-mono font-bold text-white text-xl sm:text-2xl">{score}</span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-gray-400 text-xs sm:text-sm tracking-[0.2em] uppercase font-medium">Level Reached</span>
            <span className="font-mono font-bold text-white text-xl sm:text-2xl">{level}</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
          <button
            className="start-screen__btn start-screen__btn--survivor w-full"
            onClick={() => { playSound('click', isMuted); setGameState('NAME_INPUT'); }}
          >
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><Trophy size={18} /></span>
              Save Score
            </span>
          </button>
          <button
            className="start-screen__btn start-screen__btn--secondary w-full"
            onClick={() => { playSound('click', isMuted); pendingScoreRef.current = null; triggerTransition(() => setGameState('MENU'), 'menu'); }}
          >
            <span className="start-screen__btn-inner">
              <span className="start-screen__btn-icon" aria-hidden="true"><Home size={18} /></span>
              Skip & Main Menu
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  const handleNameSubmit = () => {
    const pending = pendingScoreRef.current;
    if (pending) {
      const name = playerName.trim() || 'Anonymous';
      const newEntry = { name, score: pending.score, date: new Date().toLocaleDateString(), mode: pending.mode, level: pending.level };
      // Calculate rank BEFORE saving so we use the current leaderboard + new entry
      const modeEntries = [...leaderboard, newEntry].filter(e => (e.mode || GAME_MODES.TIMED) === pending.mode).sort((a, b) => b.score - a.score);
      const rank = modeEntries.findIndex(e => e === newEntry) + 1;
      saveScore(pending.score, pending.mode, pending.level, name);
      setRankRevealData({ rank, entry: newEntry, mode: pending.mode });
      pendingScoreRef.current = null;
      setPlayerName('');
      triggerTransition(() => setGameState('RANK_REVEAL'), 'none');
    } else {
      // No pending score — go straight to menu
      setPlayerName('');
      triggerTransition(() => setGameState('MENU'), 'menu');
    }
  };

  const renderNameInput = () => {
    const kbRows = [
      ['Q','W','E','R','T','Y','U','I','O','P'],
      ['A','S','D','F','G','H','J','K','L'],
      ['Z','X','C','V','B','N','M'],
    ];
    const handleKey = (key) => {
      playSound('click', isMuted);
      if (key === 'DEL') {
        setPlayerName(prev => prev.slice(0, -1));
      } else if (key === 'SPACE') {
        setPlayerName(prev => prev.length < 16 ? prev + ' ' : prev);
      } else {
        setPlayerName(prev => prev.length < 16 ? prev + key : prev);
      }
    };

    return (
      <div className="start-screen">
        <div className="start-screen__content z-10 w-full max-w-lg px-3">
          <div className="text-center mb-3 sm:mb-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-light text-white tracking-wide mb-1">
              <span className="text-[#0689D8] font-bold">Save Score</span>
            </h2>
            <p className="text-gray-400 text-[10px] sm:text-xs tracking-widest uppercase">
              {pendingScoreRef.current?.score || 0} pts — Level {pendingScoreRef.current?.level || 1}
            </p>
          </div>

          {/* Name display */}
          <div className="w-full bg-[#0A0A0A] border border-[#333] rounded-xl px-4 py-3 mb-4 min-h-[52px] flex items-center justify-center">
            {playerName ? (
              <span className="text-white text-xl sm:text-2xl font-mono tracking-[0.2em] text-center">{playerName}<span className="animate-pulse text-[#0689D8]">|</span></span>
            ) : (
              <span className="text-gray-600 text-lg font-mono tracking-wider">Tap to enter name</span>
            )}
          </div>

          {/* On-screen keyboard */}
          <div className="w-full bg-[#1A1A1A]/80 border border-[#2A2A2A] backdrop-blur-md rounded-2xl p-2 sm:p-3 mb-4 shadow-2xl">
            {kbRows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-[5px] sm:gap-1.5 mb-[5px] sm:mb-1.5">
                {row.map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKey(key)}
                    className="w-[30px] h-[40px] sm:w-[38px] sm:h-[46px] md:w-[42px] md:h-[50px] bg-[#252525] hover:bg-[#333] active:bg-[#0689D8] active:scale-95 border border-[#3a3a3a] rounded-lg text-white text-sm sm:text-base font-semibold transition-all duration-100 select-none touch-manipulation"
                  >
                    {key}
                  </button>
                ))}
              </div>
            ))}
            {/* Bottom row: delete, space, done */}
            <div className="flex justify-center gap-[5px] sm:gap-1.5">
              <button
                onClick={() => handleKey('DEL')}
                className="h-[40px] sm:h-[46px] md:h-[50px] px-3 sm:px-4 bg-[#302020] hover:bg-[#443030] active:bg-red-500 active:scale-95 border border-[#3a3a3a] rounded-lg text-red-400 active:text-white text-xs sm:text-sm font-semibold tracking-wider transition-all duration-100 select-none touch-manipulation"
              >
                DEL
              </button>
              <button
                onClick={() => handleKey('SPACE')}
                className="flex-1 h-[40px] sm:h-[46px] md:h-[50px] bg-[#252525] hover:bg-[#333] active:bg-[#0689D8] active:scale-95 border border-[#3a3a3a] rounded-lg text-gray-400 text-xs sm:text-sm font-semibold tracking-widest transition-all duration-100 select-none touch-manipulation"
              >
                SPACE
              </button>
              <button
                onClick={handleNameSubmit}
                className="h-[40px] sm:h-[46px] md:h-[50px] px-4 sm:px-6 bg-[#0689D8] hover:bg-[#07a0f5] active:bg-[#0560a0] active:scale-95 border border-[#0689D8]/50 rounded-lg text-white text-xs sm:text-sm font-bold tracking-wider transition-all duration-100 select-none touch-manipulation shadow-[0_0_15px_rgba(6,137,216,0.3)]"
              >
                SAVE
              </button>
            </div>
          </div>

          {/* Skip button */}
          <button
            className="w-full text-center text-gray-500 hover:text-gray-300 text-xs sm:text-sm tracking-widest uppercase py-2 transition-colors touch-manipulation"
            onClick={() => { playSound('click', isMuted); pendingScoreRef.current = null; setPlayerName(''); triggerTransition(() => setGameState('MENU'), 'menu'); }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  };

  const handleAdvanceLevel = () => {
    generateScatterDirs(deck.length);
    setGameState('SCATTERING');
    setIsScattering(true);
    playSound('scatter', isMuted);
    playSound('levelTransition', isMuted);
    setTimeout(() => {
      setIsTransitioning(true);
      bgRef.current?.nextRound();
      playSound('warpWoosh', isMuted);
      setTimeout(() => {
        setIsScattering(false);
        setScoreAtLevelStart(score);
        setupLevel(level + 1);
      }, 650);
      setTimeout(() => { setIsTransitioning(false); }, 1300);
    }, 1800);
  };

  const handleReturnToDashboard = () => {
    if (mismatchTimeoutRef.current) { clearTimeout(mismatchTimeoutRef.current); mismatchTimeoutRef.current = null; }
    if (score > 0) {
      pendingScoreRef.current = { score, mode: gameMode, level };
    }
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
        if (pendingScoreRef.current) {
          setGameState('NAME_INPUT');
        } else {
          setGameState('MENU');
        }
      }, 650);
      setTimeout(() => { setIsTransitioning(false); }, 1300);
    }, 1800);
  };

  const handleGrandPrize = () => {
    // Record the winner and show the congratulations screen
    addGrandPrizeWinner(playerName || 'Winner');
    bgRef.current?.celebrate?.();
    setGameState('GRAND_PRIZE');
  };

  const handleGrandPrizeContinue = () => {
    // After grand prize screen, go to name input to save score
    pendingScoreRef.current = { score, mode: gameMode, level };
    triggerTransition(() => setGameState('NAME_INPUT'), 'menu');
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#05060a] flex flex-col items-center justify-center relative overflow-hidden">
      <SpaceBackground ref={bgRef} />
      <div className={`relative z-10 w-full h-full min-h-screen min-h-[100dvh] flex flex-col items-center justify-center py-4 sm:py-6 transition-opacity duration-[650ms] ease-[cubic-bezier(.22,1,.36,1)] ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}>
        {/* Settings gear — shown on menu/leaderboard screens (in-game settings is in the HUD) */}
        {(gameState === 'MENU' || gameState === 'LEADERBOARD') && (
          <button
            onClick={() => { playSound('click', isMuted); setShowSettings(s => { if (!s) { setGpWinnersToday(getGrandPrizeWinnersToday().length); setGpDisabled(isGrandPrizeDisabled()); } return !s; }); }}
            className="fixed top-3 right-3 sm:top-4 sm:right-4 md:right-6 z-40 p-2 text-gray-400 hover:text-white transition-all duration-300 rounded-lg hover:bg-white/[0.06]"
            aria-label="Settings"
            style={{ opacity: showSettings ? 1 : undefined }}
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

              {/* Grand Prize divider */}
              <div className="border-t border-white/[0.06] pt-3 mt-1">
                <span className="text-[10px] sm:text-[11px] text-gray-400 tracking-[0.2em] uppercase font-semibold">Grand Prize</span>
              </div>

              {/* Grand Prize toggle */}
              <button
                onClick={() => {
                  const next = !gpDisabled;
                  setGrandPrizeDisabled(next);
                  setGpDisabled(next);
                  playSound('click', isMuted);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 ${gpDisabled
                    ? 'bg-red-500/10 border-red-500/20 text-red-400'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}
              >
                <Trophy size={15} />
                <span className="text-xs font-medium tracking-wide">{gpDisabled ? 'Disabled' : 'Enabled'}</span>
              </button>

              {/* Daily winners count + reset */}
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 tracking-wider uppercase font-medium">Today's Winners</span>
                  <span className="text-xs text-white font-mono mt-0.5">{gpWinnersToday} / {GRAND_PRIZE_DAILY_MAX}</span>
                </div>
                <button
                  onClick={() => {
                    resetGrandPrizeToday();
                    setGpWinnersToday(0);
                    playSound('click', isMuted);
                  }}
                  className="text-[10px] tracking-wider uppercase font-semibold text-yellow-400 hover:text-yellow-300 px-3 py-1.5 rounded-lg border border-yellow-400/20 hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
        {gameState === 'SPLASH' && renderSplash()}
        {gameState === 'MENU' && renderMenu()}
        {gameState === 'LEADERBOARD' && renderLeaderboard()}
        {gameState !== 'MENU' && gameState !== 'LEADERBOARD' && gameState !== 'SPLASH' && gameState !== 'NAME_INPUT' && gameState !== 'RANK_REVEAL' && gameState !== 'GRAND_PRIZE' && (
          <>
            {renderSyncBar()}
            {renderHealthBar()}
            {gameMode === GAME_MODES.SURVIVOR && tookDamage && (
              <div className="survivor-damage-flash" />
            )}
            {renderHUD()}
            <div className="flex flex-col items-center w-full h-full relative px-2 sm:px-4" style={{ paddingTop: 'var(--hud-h, 4.5rem)' }}>
              <div className="flex-1 flex items-center justify-center w-full relative">
                {renderGrid()}
                {renderPreviewOverlay()}
              </div>
            </div>
          </>
        )}
        {gameState === 'GAME_OVER' && renderGameOver()}
        {gameState === 'NAME_INPUT' && renderNameInput()}
        {gameState === 'RANK_REVEAL' && renderRankReveal()}
        {gameState === 'LEVEL_COMPLETE' && (
          <LevelCompleteScreen
            level={level}
            score={score}
            scoreAtLevelStart={scoreAtLevelStart}
            time={time}
            isMuted={isMuted}
            onAdvance={handleAdvanceLevel}
            onReturn={handleReturnToDashboard}
            onGrandPrize={handleGrandPrize}
          />
        )}
        {gameState === 'GRAND_PRIZE' && (
          <GrandPrizeScreen
            score={score}
            isMuted={isMuted}
            onContinue={handleGrandPrizeContinue}
          />
        )}
      </div>
    </div>
  );
}

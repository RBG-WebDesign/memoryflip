// ============================================================
// Samsung Memory Flip — SNES-style David Wise chiptune audio engine
// All audio is procedural via Web Audio API (no samples)
// ============================================================

let audioCtx = null;
let masterGain = null;
let musicGain = null;
let sfxGain = null;
let currentMusic = null; // { stop(), id }
let onUnlockCallback = null;

// --- Init ---
export const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1.0;
    masterGain.connect(audioCtx.destination);

    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.75;
    musicGain.connect(masterGain);

    sfxGain = audioCtx.createGain();
    sfxGain.gain.value = 0.7;
    sfxGain.connect(masterGain);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      preloadSfxSamples();
      if (onUnlockCallback) {
        const cb = onUnlockCallback;
        onUnlockCallback = null;
        cb();
      }
    });
  }
};

export const onAudioUnlock = (cb) => { onUnlockCallback = cb; };
export const isAudioRunning = () => audioCtx && audioCtx.state === 'running';

// --- Utility: create oscillator routed through SFX bus ---
const createOsc = (type, freq, startTime, duration, volume, destination) => {
  if (!audioCtx) return null;
  const dest = destination || sfxGain;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration);
  return { osc, gain };
};

// --- Utility: noise burst for percussion (used by SFX) ---
const playNoise = (startTime, duration, volume, highpass, dest) => {
  if (!audioCtx) return;
  const target = dest || sfxGain;
  const bufferSize = audioCtx.sampleRate * duration;
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass || 7000;

  const env = audioCtx.createGain();
  env.gain.setValueAtTime(volume, startTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  noise.connect(filter);
  filter.connect(env);
  env.connect(target);
  noise.start(startTime);
  noise.stop(startTime + duration + 0.01);
};

// --- Utility: kick drum (used by SFX) ---
const playKick = (startTime, volume, dest) => {
  if (!audioCtx) return;
  const target = dest || sfxGain;
  const osc = audioCtx.createOscillator();
  const env = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, startTime);
  osc.frequency.exponentialRampToValueAtTime(30, startTime + 0.12);
  env.gain.setValueAtTime(volume, startTime);
  env.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
  osc.connect(env);
  env.connect(target);
  osc.start(startTime);
  osc.stop(startTime + 0.2);
};

// ============================================================
// MUSIC — Two MP3 tracks: ambient (menu) + chiptune (in-game)
// ============================================================
import chiptuneUrl from '../assets/hitslab-chiptune-video-game-games-music-457939.mp3';
import ambientUrl from '../assets/monume-space-ambient-498030.mp3';
import wooshUrl from '../assets/sfx/woosh.mp3';
import woosh2Url from '../assets/sfx/woosh2.mp3';

const trackUrls = {
  menu: ambientUrl,
  ingame: chiptuneUrl,
};

// ============================================================
// SFX SAMPLES — One-shot MP3 samples (woosh transitions)
// ============================================================
const sfxSampleUrls = {
  woosh: wooshUrl,
  woosh2: woosh2Url,
};
const sfxSampleBuffers = {};
const sfxSampleLoading = {};

// Trim silence from start and end of an AudioBuffer (threshold in linear amplitude)
function trimAudioBuffer(buffer, threshold = 0.005) {
  const channels = buffer.numberOfChannels;
  const length = buffer.length;
  const rate = buffer.sampleRate;
  let start = length, end = 0;

  // Scan all channels to find first/last sample above threshold
  for (let ch = 0; ch < channels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      if (Math.abs(data[i]) > threshold) {
        start = Math.min(start, i);
        break;
      }
    }
    for (let i = length - 1; i >= 0; i--) {
      if (Math.abs(data[i]) > threshold) {
        end = Math.max(end, i);
        break;
      }
    }
  }

  if (start >= end) return buffer; // nothing to trim

  // Add a tiny fade margin (5ms) to avoid clicks
  const margin = Math.round(rate * 0.005);
  start = Math.max(0, start - margin);
  end = Math.min(length - 1, end + margin);

  const trimmedLength = end - start + 1;
  const trimmed = audioCtx.createBuffer(channels, trimmedLength, rate);
  for (let ch = 0; ch < channels; ch++) {
    trimmed.getChannelData(ch).set(buffer.getChannelData(ch).subarray(start, end + 1));
  }
  return trimmed;
}

async function loadSfxSample(id) {
  if (sfxSampleBuffers[id]) return sfxSampleBuffers[id];
  if (sfxSampleLoading[id]) return sfxSampleLoading[id];
  sfxSampleLoading[id] = (async () => {
    try {
      const response = await fetch(sfxSampleUrls[id]);
      const arrayBuf = await response.arrayBuffer();
      const decoded = await audioCtx.decodeAudioData(arrayBuf);
      sfxSampleBuffers[id] = trimAudioBuffer(decoded);
    } catch (e) {
      console.warn(`Failed to load SFX sample ${id}:`, e);
    }
    sfxSampleLoading[id] = null;
    return sfxSampleBuffers[id];
  })();
  return sfxSampleLoading[id];
}

function playSfxSample(id, volume = 0.5) {
  if (!audioCtx) return;
  const buf = sfxSampleBuffers[id];
  if (!buf) {
    // Load and play on first use (slight delay first time only)
    loadSfxSample(id).then(b => {
      if (!b) return;
      const src = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      gain.gain.value = volume;
      src.buffer = b;
      src.connect(gain);
      gain.connect(sfxGain);
      src.start(0);
    });
    return;
  }
  const src = audioCtx.createBufferSource();
  const gain = audioCtx.createGain();
  gain.gain.value = volume;
  src.buffer = buf;
  src.connect(gain);
  gain.connect(sfxGain);
  src.start(0);
}

// Preload woosh samples so they're ready when needed
function preloadSfxSamples() {
  if (!audioCtx) return;
  Object.keys(sfxSampleUrls).forEach(id => loadSfxSample(id));
}

const trackBuffers = {};   // { menu: AudioBuffer, ingame: AudioBuffer }
const trackLoading = {};   // { menu: Promise, ingame: Promise }
let musicSource = null;     // current BufferSourceNode
let pendingTrackId = null;  // guard against concurrent startMusic calls

async function loadTrackBuffer(trackId) {
  if (trackBuffers[trackId]) return trackBuffers[trackId];
  if (trackLoading[trackId]) return trackLoading[trackId];
  trackLoading[trackId] = (async () => {
    try {
      const response = await fetch(trackUrls[trackId]);
      const arrayBuf = await response.arrayBuffer();
      trackBuffers[trackId] = await audioCtx.decodeAudioData(arrayBuf);
    } catch (e) {
      console.warn(`Failed to load ${trackId} MP3:`, e);
    }
    trackLoading[trackId] = null;
    return trackBuffers[trackId];
  })();
  return trackLoading[trackId];
}

function stopMusicSource() {
  if (musicSource) {
    try { musicSource.stop(); } catch (_) { /* already stopped */ }
    musicSource.disconnect();
    musicSource = null;
  }
}

// ============================================================
// Music control API
// ============================================================

export const startMusic = async (trackId) => {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    try { await audioCtx.resume(); } catch (_) { /* ignore */ }
  }

  // Don't restart if the same logical track is already playing or pending
  if ((currentMusic && currentMusic.id === trackId) || pendingTrackId === trackId) return;

  // Don't start music while distortion is running (game-over sequence)
  if (isDistorting) return;

  stopMusic();
  pendingTrackId = trackId;

  const buf = await loadTrackBuffer(trackId);

  // Another call may have changed the target while we were loading
  if (pendingTrackId !== trackId) return;
  // Re-check distortion — it may have started while we were loading
  if (isDistorting) { pendingTrackId = null; return; }
  pendingTrackId = null;

  if (!buf) return;

  // Stop any source that snuck in
  stopMusicSource();

  const source = audioCtx.createBufferSource();
  source.buffer = buf;
  source.loop = true;
  source.connect(musicGain);
  source.start(0);
  musicSource = source;

  currentMusic = {
    id: trackId,
    stop: () => {
      if (musicSource === source) {
        stopMusicSource();
      }
    },
  };
};

export const stopMusic = () => {
  pendingTrackId = null;
  cleanupDistortion();
  if (currentMusic) {
    currentMusic.stop();
    currentMusic = null;
  }
};

// ============================================================
// Game Over — distort + slow current music, then play loser jingle
// ============================================================
let distortFilter = null;
let distortGainNode = null;
let isDistorting = false;

function cleanupDistortion() {
  if (distortFilter) {
    try { distortFilter.disconnect(); } catch (_) {}
    distortFilter = null;
  }
  if (distortGainNode) {
    try { distortGainNode.disconnect(); } catch (_) {}
    distortGainNode = null;
  }
  if (musicSource && isDistorting) {
    try { musicSource.playbackRate.cancelScheduledValues(0); } catch (_) {}
  }
  isDistorting = false;
}

export const distortAndStopMusic = (onComplete) => {
  if (!audioCtx || !musicSource) {
    if (onComplete) onComplete();
    return;
  }
  isDistorting = true;
  const t = audioCtx.currentTime;

  // Insert a lowpass filter between musicSource and musicGain
  distortFilter = audioCtx.createBiquadFilter();
  distortFilter.type = 'lowpass';
  distortFilter.frequency.setValueAtTime(8000, t);
  distortFilter.frequency.exponentialRampToValueAtTime(200, t + 1.8);
  distortFilter.Q.value = 4;

  // Fade the music volume down
  distortGainNode = audioCtx.createGain();
  distortGainNode.gain.setValueAtTime(1.0, t);
  distortGainNode.gain.linearRampToValueAtTime(0.0, t + 2.2);

  // Reroute: source -> filter -> distortGain -> musicGain
  try { musicSource.disconnect(); } catch (_) {}
  musicSource.connect(distortFilter);
  distortFilter.connect(distortGainNode);
  distortGainNode.connect(musicGain);

  // Slow down playback rate
  musicSource.playbackRate.setValueAtTime(1.0, t);
  musicSource.playbackRate.linearRampToValueAtTime(0.35, t + 2.0);

  // After distortion completes, stop and clean up
  setTimeout(() => {
    stopMusic();
    if (onComplete) onComplete();
  }, 2200);
};

export const playGameOverJingle = (isMuted) => {
  if (isMuted || !audioCtx) return;
  initAudio();
  const t = audioCtx.currentTime;

  // Sad descending minor jingle — dark, final-sounding
  const notes = [
    // Slow descending minor phrase
    { freq: 392, time: 0, dur: 0.4, vol: 0.1, type: 'sine' },       // G4
    { freq: 349, time: 0.35, dur: 0.4, vol: 0.1, type: 'sine' },    // F4
    { freq: 311, time: 0.7, dur: 0.4, vol: 0.09, type: 'sine' },    // Eb4
    { freq: 294, time: 1.05, dur: 0.6, vol: 0.08, type: 'sine' },   // D4
    // Low octave doubles for weight
    { freq: 196, time: 0, dur: 0.4, vol: 0.06, type: 'triangle' },  // G3
    { freq: 175, time: 0.35, dur: 0.4, vol: 0.06, type: 'triangle' },// F3
    { freq: 156, time: 0.7, dur: 0.4, vol: 0.05, type: 'triangle' },// Eb3
    { freq: 147, time: 1.05, dur: 0.8, vol: 0.05, type: 'triangle' },// D3
    // Final minor chord (Dm) — somber resolve
    { freq: 147, time: 1.8, dur: 1.2, vol: 0.07, type: 'sine' },    // D3
    { freq: 175, time: 1.8, dur: 1.2, vol: 0.06, type: 'sine' },    // F3
    { freq: 220, time: 1.8, dur: 1.2, vol: 0.05, type: 'sine' },    // A3
    { freq: 294, time: 1.8, dur: 1.2, vol: 0.04, type: 'triangle' },// D4
  ];

  notes.forEach(n => {
    createOsc(n.type, n.freq, t + n.time, n.dur, n.vol, sfxGain);
  });

  // Mournful vibrato on the final chord
  const vibOsc = audioCtx.createOscillator();
  const vibGain = audioCtx.createGain();
  vibOsc.type = 'sine';
  vibOsc.frequency.setValueAtTime(262, t + 1.8); // C4
  vibGain.gain.setValueAtTime(0.04, t + 1.8);
  vibGain.gain.exponentialRampToValueAtTime(0.001, t + 3.2);
  vibOsc.connect(vibGain);
  vibGain.connect(sfxGain);
  vibOsc.start(t + 1.8);
  vibOsc.stop(t + 3.3);

  // Add LFO for vibrato feel
  const lfo = audioCtx.createOscillator();
  const lfoGain = audioCtx.createGain();
  lfo.frequency.value = 5;
  lfoGain.gain.value = 4;
  lfo.connect(lfoGain);
  lfoGain.connect(vibOsc.frequency);
  lfo.start(t + 1.8);
  lfo.stop(t + 3.3);
};

export const setMusicVolume = (vol) => {
  if (musicGain) musicGain.gain.value = vol;
};

export const setSfxVolume = (vol) => {
  if (sfxGain) sfxGain.gain.value = vol;
};

// ============================================================
// SOUND EFFECTS — Enhanced SNES-style
// ============================================================

export const playSound = (type, isMuted) => {
  if (isMuted) return;
  initAudio();
  const t = audioCtx.currentTime;

  switch (type) {
    // --- Card flip: satisfying "click" with pitch character ---
    case 'flip': {
      createOsc('sine', 1200, t, 0.04, 0.08, sfxGain);
      createOsc('triangle', 600, t, 0.03, 0.04, sfxGain);
      // Tiny noise click
      playNoise(t, 0.015, 0.03, 12000, sfxGain);
      break;
    }

    // --- Card match: triumphant two-note chime ---
    case 'match': {
      createOsc('sine', 523, t, 0.12, 0.12, sfxGain);
      createOsc('triangle', 523, t, 0.12, 0.06, sfxGain);
      createOsc('sine', 784, t + 0.1, 0.18, 0.12, sfxGain);
      createOsc('triangle', 784, t + 0.1, 0.18, 0.06, sfxGain);
      // Sparkle overtone
      createOsc('sine', 1568, t + 0.15, 0.15, 0.04, sfxGain);
      break;
    }

    // --- Mismatch: buzzy wrong sound (DKC-style "bonk") ---
    case 'mismatch': {
      createOsc('square', 180, t, 0.15, 0.07, sfxGain);
      createOsc('square', 140, t + 0.05, 0.12, 0.05, sfxGain);
      createOsc('sawtooth', 90, t, 0.18, 0.04, sfxGain);
      playNoise(t, 0.04, 0.04, 3000, sfxGain);
      break;
    }

    // --- Victory: triumphant ascending fanfare ---
    case 'victory': {
      const notes = [523, 659, 784, 1047, 1319, 1568];
      notes.forEach((freq, i) => {
        createOsc('square', freq, t + i * 0.1, 0.25, 0.1, sfxGain);
        createOsc('sine', freq, t + i * 0.1, 0.3, 0.06, sfxGain);
      });
      // Resolve chord
      [1047, 1319, 1568].forEach(freq => {
        createOsc('sine', freq, t + 0.65, 0.6, 0.06, sfxGain);
      });
      break;
    }

    // --- Countdown tick ---
    case 'countdown': {
      createOsc('triangle', 880, t, 0.06, 0.06, sfxGain);
      createOsc('sine', 440, t, 0.08, 0.03, sfxGain);
      break;
    }

    // --- Go! Ready sound ---
    case 'go': {
      createOsc('square', 784, t, 0.08, 0.1, sfxGain);
      createOsc('square', 1047, t + 0.08, 0.08, 0.1, sfxGain);
      createOsc('square', 1568, t + 0.16, 0.15, 0.1, sfxGain);
      createOsc('sine', 1568, t + 0.16, 0.2, 0.06, sfxGain);
      playNoise(t + 0.16, 0.05, 0.05, 8000, sfxGain);
      break;
    }

    // --- Card scatter whoosh ---
    case 'scatter': {
      // Descending sweep
      if (!audioCtx) return;
      const osc1 = audioCtx.createOscillator();
      const g1 = audioCtx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(1400, t);
      osc1.frequency.exponentialRampToValueAtTime(60, t + 0.6);
      g1.gain.setValueAtTime(0.08, t);
      g1.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc1.connect(g1);
      g1.connect(sfxGain);
      osc1.start(t);
      osc1.stop(t + 0.65);

      // Wind noise
      playNoise(t, 0.5, 0.07, 2000, sfxGain);
      // Impact thud
      playKick(t + 0.15, 0.06, sfxGain);
      break;
    }

    // --- Score tally tick ---
    case 'tick': {
      createOsc('square', 1200, t, 0.018, 0.025, sfxGain);
      break;
    }

    // --- Star earned sounds (increasingly grand) ---
    case 'star1': {
      createOsc('sine', 784, t, 0.15, 0.1, sfxGain);
      createOsc('triangle', 784, t, 0.15, 0.05, sfxGain);
      createOsc('sine', 1047, t + 0.08, 0.2, 0.09, sfxGain);
      playNoise(t + 0.06, 0.04, 0.03, 10000, sfxGain);
      break;
    }
    case 'star2': {
      createOsc('sine', 880, t, 0.12, 0.1, sfxGain);
      createOsc('sine', 1175, t + 0.08, 0.12, 0.1, sfxGain);
      createOsc('sine', 1397, t + 0.16, 0.2, 0.09, sfxGain);
      createOsc('triangle', 1397, t + 0.16, 0.2, 0.05, sfxGain);
      playNoise(t + 0.12, 0.05, 0.04, 9000, sfxGain);
      break;
    }
    case 'star3': {
      createOsc('sine', 1047, t, 0.12, 0.12, sfxGain);
      createOsc('sine', 1319, t + 0.08, 0.12, 0.12, sfxGain);
      createOsc('sine', 1568, t + 0.16, 0.15, 0.11, sfxGain);
      createOsc('sine', 2093, t + 0.26, 0.35, 0.1, sfxGain);
      createOsc('triangle', 2093, t + 0.26, 0.35, 0.06, sfxGain);
      // Sparkle burst
      [2400, 2800, 3200].forEach((f, i) => {
        createOsc('sine', f, t + 0.3 + i * 0.04, 0.1, 0.03, sfxGain);
      });
      playNoise(t + 0.2, 0.08, 0.05, 8000, sfxGain);
      break;
    }

    // --- Tally finish ---
    case 'tallyFinish': {
      [523, 659, 784].forEach(freq => createOsc('sine', freq, t, 0.4, 0.06, sfxGain));
      [1047, 1319, 1568].forEach(freq => createOsc('sine', freq, t + 0.12, 0.6, 0.05, sfxGain));
      createOsc('triangle', 1047, t + 0.12, 0.6, 0.03, sfxGain);
      break;
    }

    // --- Button hover: soft breath ---
    case 'hover': {
      createOsc('sine', 1800, t, 0.025, 0.012, sfxGain);
      break;
    }

    // --- Button click: tactile "thock" with warm harmonic ---
    case 'click': {
      // Warm fundamental tap
      createOsc('sine', 680, t, 0.035, 0.04, sfxGain);
      // Soft harmonic overtone
      createOsc('sine', 1360, t + 0.005, 0.025, 0.015, sfxGain);
      // Tiny percussive texture
      playNoise(t, 0.008, 0.015, 14000, sfxGain);
      break;
    }

    // --- Menu select (start game): refined two-note confirmation ---
    case 'menuSelect': {
      // First note — warm base
      createOsc('sine', 523, t, 0.1, 0.07, sfxGain);
      createOsc('triangle', 523, t, 0.1, 0.025, sfxGain);
      // Second note — bright resolve
      createOsc('sine', 784, t + 0.09, 0.16, 0.07, sfxGain);
      createOsc('triangle', 784, t + 0.09, 0.16, 0.025, sfxGain);
      // Subtle shimmer on resolve
      createOsc('sine', 1568, t + 0.12, 0.1, 0.015, sfxGain);
      break;
    }

    // --- Combo building (pitch rises with combo) ---
    case 'combo2': {
      createOsc('sine', 880, t, 0.06, 0.05, sfxGain);
      createOsc('sine', 1100, t + 0.04, 0.06, 0.04, sfxGain);
      break;
    }
    case 'combo3': {
      createOsc('sine', 1047, t, 0.05, 0.06, sfxGain);
      createOsc('sine', 1319, t + 0.04, 0.05, 0.05, sfxGain);
      createOsc('sine', 1568, t + 0.08, 0.08, 0.04, sfxGain);
      break;
    }
    case 'combo4plus': {
      // Sparkly arpeggio
      [1047, 1319, 1568, 2093].forEach((freq, i) => {
        createOsc('sine', freq, t + i * 0.035, 0.06, 0.05, sfxGain);
      });
      playNoise(t + 0.1, 0.04, 0.02, 11000, sfxGain);
      break;
    }

    // --- Level transition whoosh (MP3 sample) ---
    case 'levelTransition': {
      playSfxSample('woosh2', 0.45);
      break;
    }

    // --- Deep warp woosh: plays when the shader warp accelerates (MP3 sample) ---
    case 'warpWoosh': {
      playSfxSample('woosh', 0.5);
      break;
    }

    // --- Preview cards dealing sound ---
    case 'deal': {
      createOsc('triangle', 400 + Math.random() * 200, t, 0.04, 0.04, sfxGain);
      playNoise(t, 0.02, 0.03, 8000, sfxGain);
      break;
    }

    // --- Shuffle swap: swooshing card slide ---
    case 'shuffle': {
      if (!audioCtx) break;
      const swOsc = audioCtx.createOscillator();
      const swGain = audioCtx.createGain();
      swOsc.type = 'sine';
      swOsc.frequency.setValueAtTime(400, t);
      swOsc.frequency.exponentialRampToValueAtTime(800, t + 0.08);
      swOsc.frequency.exponentialRampToValueAtTime(350, t + 0.18);
      swGain.gain.setValueAtTime(0.04, t);
      swGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      swOsc.connect(swGain);
      swGain.connect(sfxGain);
      swOsc.start(t);
      swOsc.stop(t + 0.22);
      playNoise(t, 0.12, 0.025, 6000, sfxGain);
      break;
    }

    // --- Reveal: dramatic upward sweep when Samsung cards flip up ---
    case 'reveal': {
      createOsc('sine', 330, t, 0.15, 0.07, sfxGain);
      createOsc('sine', 440, t + 0.05, 0.15, 0.07, sfxGain);
      createOsc('sine', 660, t + 0.12, 0.2, 0.08, sfxGain);
      createOsc('triangle', 880, t + 0.2, 0.3, 0.06, sfxGain);
      playNoise(t + 0.15, 0.08, 0.03, 9000, sfxGain);
      break;
    }

    // --- Correct tap: bright confirmation chime with sparkle ---
    case 'correctTap': {
      createOsc('sine', 659, t, 0.08, 0.1, sfxGain);
      createOsc('sine', 988, t + 0.06, 0.12, 0.1, sfxGain);
      createOsc('triangle', 1319, t + 0.12, 0.18, 0.08, sfxGain);
      createOsc('sine', 1976, t + 0.16, 0.12, 0.04, sfxGain);
      playNoise(t + 0.1, 0.06, 0.03, 10000, sfxGain);
      break;
    }

    // --- Wrong tap: short dull thud ---
    case 'wrongTap': {
      createOsc('square', 200, t, 0.1, 0.06, sfxGain);
      createOsc('square', 150, t + 0.03, 0.08, 0.04, sfxGain);
      playNoise(t, 0.03, 0.03, 4000, sfxGain);
      break;
    }

    // --- Round start: tension building ---
    case 'roundStart': {
      createOsc('sine', 220, t, 0.3, 0.06, sfxGain);
      createOsc('triangle', 330, t + 0.1, 0.3, 0.04, sfxGain);
      createOsc('sine', 440, t + 0.2, 0.4, 0.05, sfxGain);
      playNoise(t, 0.2, 0.02, 3000, sfxGain);
      break;
    }

    // --- Miss reveal: soft downward sweep when showing missed products ---
    case 'missReveal': {
      createOsc('triangle', 500, t, 0.2, 0.05, sfxGain);
      createOsc('sine', 350, t + 0.1, 0.3, 0.04, sfxGain);
      createOsc('sine', 250, t + 0.2, 0.3, 0.03, sfxGain);
      break;
    }

    // --- Elimination: descending failure tone ---
    case 'elimination': {
      createOsc('sine', 400, t, 0.25, 0.08, sfxGain);
      createOsc('sine', 250, t + 0.15, 0.3, 0.07, sfxGain);
      createOsc('sine', 150, t + 0.3, 0.4, 0.06, sfxGain);
      createOsc('triangle', 100, t + 0.35, 0.5, 0.04, sfxGain);
      playNoise(t + 0.1, 0.4, 0.03, 2000, sfxGain);
      break;
    }

    // --- Perfect round: triumphant flourish ---
    case 'perfectRound': {
      [784, 988, 1175, 1568].forEach((freq, i) => {
        createOsc('sine', freq, t + i * 0.06, 0.15, 0.08, sfxGain);
      });
      createOsc('triangle', 2093, t + 0.28, 0.3, 0.06, sfxGain);
      playNoise(t + 0.2, 0.1, 0.04, 9000, sfxGain);
      break;
    }

    // --- Mute toggle ---
    case 'toggleOn': {
      createOsc('sine', 440, t, 0.06, 0.05, sfxGain);
      createOsc('sine', 660, t + 0.06, 0.08, 0.04, sfxGain);
      break;
    }
    case 'toggleOff': {
      createOsc('sine', 660, t, 0.06, 0.05, sfxGain);
      createOsc('sine', 440, t + 0.06, 0.08, 0.04, sfxGain);
      break;
    }
  }
};

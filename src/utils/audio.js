// ============================================================
// Galaxy Sync — SNES-style David Wise chiptune audio engine
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

const trackUrls = {
  menu: ambientUrl,
  ingame: chiptuneUrl,
};

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

  stopMusic();
  pendingTrackId = trackId;

  const buf = await loadTrackBuffer(trackId);

  // Another call may have changed the target while we were loading
  if (pendingTrackId !== trackId) return;
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
  if (currentMusic) {
    currentMusic.stop();
    currentMusic = null;
  }
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

    // --- Button hover ---
    case 'hover': {
      createOsc('sine', 600, t, 0.03, 0.02, sfxGain);
      break;
    }

    // --- Button click / UI confirm ---
    case 'click': {
      createOsc('square', 800, t, 0.04, 0.06, sfxGain);
      createOsc('sine', 1200, t + 0.02, 0.04, 0.04, sfxGain);
      break;
    }

    // --- Menu select (start game) ---
    case 'menuSelect': {
      createOsc('square', 523, t, 0.08, 0.08, sfxGain);
      createOsc('square', 659, t + 0.08, 0.08, 0.08, sfxGain);
      createOsc('square', 784, t + 0.16, 0.08, 0.08, sfxGain);
      createOsc('square', 1047, t + 0.24, 0.2, 0.1, sfxGain);
      createOsc('sine', 1047, t + 0.24, 0.25, 0.06, sfxGain);
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

    // --- Level transition whoosh ---
    case 'levelTransition': {
      const sweep = audioCtx.createOscillator();
      const sweepGain = audioCtx.createGain();
      sweep.type = 'sawtooth';
      sweep.frequency.setValueAtTime(200, t);
      sweep.frequency.exponentialRampToValueAtTime(2000, t + 0.4);
      sweep.frequency.exponentialRampToValueAtTime(100, t + 0.8);
      sweepGain.gain.setValueAtTime(0.06, t);
      sweepGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      sweep.connect(sweepGain);
      sweepGain.connect(sfxGain);
      sweep.start(t);
      sweep.stop(t + 0.85);
      playNoise(t, 0.6, 0.04, 3000, sfxGain);
      break;
    }

    // --- Deep warp woosh: plays when the shader warp accelerates ---
    case 'warpWoosh': {
      // Bass body — sine sweep 150Hz → 80Hz (audible on laptop speakers)
      const rumble = audioCtx.createOscillator();
      const rumbleGain = audioCtx.createGain();
      rumble.type = 'sine';
      rumble.frequency.setValueAtTime(150, t);
      rumble.frequency.exponentialRampToValueAtTime(80, t + 0.9);
      rumbleGain.gain.setValueAtTime(0.25, t);
      rumbleGain.gain.linearRampToValueAtTime(0.3, t + 0.2);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
      rumble.connect(rumbleGain);
      rumbleGain.connect(sfxGain);
      rumble.start(t);
      rumble.stop(t + 1.0);

      // Ascending whoosh sweep — sawtooth 200Hz → 1500Hz → 100Hz
      const whoosh = audioCtx.createOscillator();
      const whooshGain = audioCtx.createGain();
      whoosh.type = 'sawtooth';
      whoosh.frequency.setValueAtTime(200, t);
      whoosh.frequency.exponentialRampToValueAtTime(1500, t + 0.3);
      whoosh.frequency.exponentialRampToValueAtTime(100, t + 0.8);
      whooshGain.gain.setValueAtTime(0.1, t);
      whooshGain.gain.linearRampToValueAtTime(0.15, t + 0.25);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      whoosh.connect(whooshGain);
      whooshGain.connect(sfxGain);
      whoosh.start(t);
      whoosh.stop(t + 0.85);

      // Bandpass noise wash — clearly audible woosh texture
      const noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 1.0, audioCtx.sampleRate);
      const noiseData = noiseBuf.getChannelData(0);
      for (let i = 0; i < noiseData.length; i++) noiseData[i] = Math.random() * 2 - 1;
      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(2500, t + 0.25);
      bp.frequency.exponentialRampToValueAtTime(300, t + 0.8);
      bp.Q.value = 1.5;
      const noiseEnv = audioCtx.createGain();
      noiseEnv.gain.setValueAtTime(0.15, t);
      noiseEnv.gain.linearRampToValueAtTime(0.25, t + 0.2);
      noiseEnv.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
      noiseSrc.connect(bp);
      bp.connect(noiseEnv);
      noiseEnv.connect(sfxGain);
      noiseSrc.start(t);
      noiseSrc.stop(t + 0.9);

      // Impact thud at onset
      playKick(t + 0.05, 0.2, sfxGain);
      break;
    }

    // --- Preview cards dealing sound ---
    case 'deal': {
      createOsc('triangle', 400 + Math.random() * 200, t, 0.04, 0.04, sfxGain);
      playNoise(t, 0.02, 0.03, 8000, sfxGain);
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

/**
 * Beach Tennis Card Game (UBT) — Procedural Web Audio Synthesizer
 * File: src/utils/soundEffects.ts
 *
 * Requirements satisfied:
 * 1. Zero external audio files (no MP3/WAV/OGG downloads, zero 404s, 100% offline).
 * 2. AudioContext lazy initialization on first user interaction.
 * 3. Master volume, mute state toggle, and persistent preference (localStorage).
 * 4. Procedural synthesis:
 *    - playRacketHit(speed: 'soft' | 'normal' | 'power'): Frequency sweep (triangle) + carbon transient crack + exponential decay.
 *    - playSandBounce(): White/pink noise burst + lowpass filter cutoff + sub-frequency thud.
 *    - playAce(): Triumphant 4-note rising major arpeggio + harmonic bell chime.
 *    - playPointWon(): Melodic two-tone chime (G5 -> C6).
 *    - playApplause(): Bandpass-filtered stochastic noise grains simulating a cheering crowd.
 *    - playFault(): Dual-pulse low buzzing sawtooth buzzer with lowpass filtering.
 *    - playCardDraw(): Subtle high-frequency noise sweep simulating card slide/whoosh.
 */

// Storage Keys
const STORAGE_KEY_MUTED = 'ubt_sound_muted';
const STORAGE_KEY_VOLUME = 'ubt_sound_volume';

// Internal State
let audioCtx: AudioContext | null = null;
let masterGainNode: GainNode | null = null;
let isAudioMuted: boolean = false;
let masterVolume: number = 0.7;
let isInitializedFromStorage = false;

/**
 * Safely load sound preferences from localStorage.
 */
function loadPreferences(): void {
  if (isInitializedFromStorage) return;
  isInitializedFromStorage = true;

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedMuted = window.localStorage.getItem(STORAGE_KEY_MUTED);
      if (storedMuted !== null) {
        isAudioMuted = storedMuted === 'true';
      }

      const storedVolume = window.localStorage.getItem(STORAGE_KEY_VOLUME);
      if (storedVolume !== null) {
        const parsed = parseFloat(storedVolume);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
          masterVolume = parsed;
        }
      }
    }
  } catch {
    // Graceful fallback if localStorage is disabled or restricted (e.g. iframe, incognito)
  }
}

/**
 * Safely save sound preferences to localStorage.
 */
function savePreferences(): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY_MUTED, String(isAudioMuted));
      window.localStorage.setItem(STORAGE_KEY_VOLUME, String(masterVolume));
    }
  } catch {
    // Storage quota or permissions fallback
  }
}

/**
 * Get or lazily construct the AudioContext singleton.
 * Resumes audio context if it was suspended due to autoplay restrictions.
 */
export function getAudioContext(): AudioContext | null {
  loadPreferences();

  if (typeof window === 'undefined') {
    return null;
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  if (!audioCtx) {
    try {
      audioCtx = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (!masterGainNode && audioCtx) {
    try {
      masterGainNode = audioCtx.createGain();
      masterGainNode.gain.setValueAtTime(
        isAudioMuted ? 0 : masterVolume,
        audioCtx.currentTime
      );
      masterGainNode.connect(audioCtx.destination);
    } catch {
      // Audio node connection fallback
    }
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {
      // Browser autoplay policy might reject until user gesture
    });
  }

  return audioCtx;
}

/**
 * Explicit initializer to be invoked on first user gesture (e.g. button click or touch).
 */
export function initAudio(): AudioContext | null {
  return getAudioContext();
}

/**
 * Update the master gain node reflecting current mute and volume states.
 */
function updateMasterGain(): void {
  if (!masterGainNode || !audioCtx) return;
  const targetGain = isAudioMuted ? 0 : Math.max(0, Math.min(1, masterVolume));
  try {
    masterGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
    masterGainNode.gain.setValueAtTime(targetGain, audioCtx.currentTime);
  } catch {
    masterGainNode.gain.value = targetGain;
  }
}

/**
 * Check whether sound effects are currently muted.
 */
export function isMuted(): boolean {
  loadPreferences();
  return isAudioMuted;
}

/**
 * Set the muted state explicitly and persist to storage.
 */
export function setMuted(muted: boolean): void {
  loadPreferences();
  isAudioMuted = Boolean(muted);
  savePreferences();
  updateMasterGain();
}

/**
 * Toggle the mute state and return the new state.
 */
export function toggleMute(): boolean {
  loadPreferences();
  isAudioMuted = !isAudioMuted;
  savePreferences();
  updateMasterGain();
  return isAudioMuted;
}

/**
 * Get the current master volume (0.0 to 1.0).
 */
export function getVolume(): number {
  loadPreferences();
  return masterVolume;
}

/**
 * Set master volume (clamped to [0.0, 1.0]) and persist to storage.
 */
export function setVolume(volume: number): void {
  loadPreferences();
  const clamped = Math.max(0, Math.min(1, isNaN(volume) ? 0.7 : volume));
  masterVolume = clamped;
  savePreferences();
  updateMasterGain();
}

// ============================================================================
// Internal Synthesis Helpers
// ============================================================================

/**
 * Procedural in-memory noise buffer generator (zero external files).
 * Supports white noise and Paul Kellet's filtered pink noise.
 */
function createNoiseBuffer(
  ctx: AudioContext,
  durationSeconds: number,
  type: 'white' | 'pink' = 'white'
): AudioBuffer {
  const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * durationSeconds));
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  if (type === 'white') {
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else {
    // Paul Kellet's pink noise filter algorithm
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.76160 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  return buffer;
}

// ============================================================================
// Procedural Sound Effects Implementations
// ============================================================================

/**
 * 1. playRacketHit(speed: 'soft' | 'normal' | 'power')
 * Carbon racket hitting low-compression beach tennis ball:
 * - Downward frequency sweep (triangle wave) simulating paddle surface impact
 * - Fast exponential decay
 * - Micro-burst of bandpass-filtered noise simulating the sharp carbon 'pop'
 */
export function playRacketHit(speed: 'soft' | 'normal' | 'power' = 'normal'): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;

  let startFreq: number;
  let endFreq: number;
  let duration: number;
  let peakGain: number;

  switch (speed) {
    case 'soft':
      startFreq = 380;
      endFreq = 120;
      duration = 0.045;
      peakGain = 0.35;
      break;
    case 'power':
      startFreq = 950;
      endFreq = 160;
      duration = 0.085;
      peakGain = 0.85;
      break;
    case 'normal':
    default:
      startFreq = 580;
      endFreq = 140;
      duration = 0.060;
      peakGain = 0.55;
      break;
  }

  try {
    // 1. Primary body impact (triangle oscillator frequency sweep)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    oscGain.gain.setValueAtTime(peakGain, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(masterGainNode);

    osc.start(now);
    osc.stop(now + duration + 0.02);

    // 2. Carbon transient click (micro noise burst)
    const noiseDuration = 0.015;
    const noiseBuffer = createNoiseBuffer(ctx, noiseDuration, 'white');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(1400, now);
    noiseFilter.Q.setValueAtTime(2.0, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(peakGain * 0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + noiseDuration);

    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGainNode);

    noiseSource.start(now);
    noiseSource.stop(now + noiseDuration + 0.01);
  } catch {
    // Audio synthesis fallback
  }
}

/**
 * 2. playSandBounce()
 * Ball bouncing or impacting on sand:
 * - White noise burst heavily attenuated by a lowpass filter (~260 Hz)
 * - Muffled low-frequency sub-thud (sine wave 85Hz -> 35Hz)
 * - No metallic ringing, authentic loose sand absorption
 */
export function playSandBounce(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  const duration = 0.085;

  try {
    // 1. Sand friction noise burst (lowpass filtered)
    const noiseBuffer = createNoiseBuffer(ctx, duration, 'white');
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.setValueAtTime(260, now);
    lowpass.frequency.exponentialRampToValueAtTime(80, now + duration);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(lowpass);
    lowpass.connect(noiseGain);
    noiseGain.connect(masterGainNode);

    noiseSource.start(now);
    noiseSource.stop(now + duration + 0.01);

    // 2. Sub-bass thud (sine wave damping)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(85, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + duration);

    subGain.gain.setValueAtTime(0.4, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(masterGainNode);

    subOsc.start(now);
    subOsc.stop(now + duration + 0.01);
  } catch {
    // Fallback
  }
}

/**
 * 3. playAce()
 * Celebratory Ace fanfare:
 * - Rising 4-note major arpeggio (C5 -> E5 -> G5 -> C6)
 * - Final note rings out with a bright harmonic chime
 */
export function playAce(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  // Frequencies: C5 (523.25), E5 (659.25), G5 (783.99), C6 (1046.50)
  const notes = [
    { freq: 523.25, time: now + 0.00, dur: 0.16, gain: 0.45 },
    { freq: 659.25, time: now + 0.08, dur: 0.16, gain: 0.48 },
    { freq: 783.99, time: now + 0.16, dur: 0.20, gain: 0.52 },
    { freq: 1046.50, time: now + 0.24, dur: 0.70, gain: 0.60 },
  ];

  try {
    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, note.time);

      gain.gain.setValueAtTime(0.001, note.time);
      gain.gain.linearRampToValueAtTime(note.gain, note.time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, note.time + note.dur);

      osc.connect(gain);
      gain.connect(masterGainNode);

      osc.start(note.time);
      osc.stop(note.time + note.dur + 0.02);
    }

    // High harmonic chime shimmer for the final C6
    const shimmerOsc = ctx.createOscillator();
    const shimmerGain = ctx.createGain();
    const shimmerTime = now + 0.24;
    const shimmerDur = 0.70;

    shimmerOsc.type = 'triangle';
    shimmerOsc.frequency.setValueAtTime(2093.0, shimmerTime); // C7 octave

    shimmerGain.gain.setValueAtTime(0.001, shimmerTime);
    shimmerGain.gain.linearRampToValueAtTime(0.18, shimmerTime + 0.02);
    shimmerGain.gain.exponentialRampToValueAtTime(0.001, shimmerTime + shimmerDur);

    shimmerOsc.connect(shimmerGain);
    shimmerGain.connect(masterGainNode);

    shimmerOsc.start(shimmerTime);
    shimmerOsc.stop(shimmerTime + shimmerDur + 0.02);
  } catch {
    // Fallback
  }
}

/**
 * 4. playPointWon()
 * Uplifting two-tone chime for winning a point:
 * - G5 (783.99 Hz) -> C6 (1046.50 Hz)
 */
export function playPointWon(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  const tones = [
    { freq: 783.99, time: now, dur: 0.14, gain: 0.40 },
    { freq: 1046.50, time: now + 0.11, dur: 0.38, gain: 0.50 },
  ];

  try {
    for (const tone of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, tone.time);

      gain.gain.setValueAtTime(0.001, tone.time);
      gain.gain.linearRampToValueAtTime(tone.gain, tone.time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, tone.time + tone.dur);

      osc.connect(gain);
      gain.connect(masterGainNode);

      osc.start(tone.time);
      osc.stop(tone.time + tone.dur + 0.02);
    }
  } catch {
    // Fallback
  }
}

/**
 * 5. playApplause()
 * Cheering crowd applause:
 * - 1.35s bandpass-filtered pink noise grains
 * - Centered at 1300 Hz (Q = 1.1) with dynamic amplitude curve
 */
export function playApplause(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  const duration = 1.35;

  try {
    const buffer = createNoiseBuffer(ctx, duration, 'pink');
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    // Filter to simulate human hand clap frequencies
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1300, now);
    filter.Q.setValueAtTime(1.1, now);

    // Dynamic amplitude envelope: smooth swell, sustain, soft fade out
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.42, now + 0.22);
    gain.gain.setValueAtTime(0.40, now + 0.80);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);

    source.start(now);
    source.stop(now + duration + 0.02);
  } catch {
    // Fallback
  }
}

/**
 * 6. playFault()
 * Low sports buzzer for fault or illegal action:
 * - Sawtooth oscillator with lowpass filtering (~420 Hz)
 * - Two distinct rhythmic buzzing pulses (100ms + 140ms)
 */
export function playFault(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  const pulses = [
    { start: now + 0.00, dur: 0.09, freq: 115 },
    { start: now + 0.12, dur: 0.15, freq: 95 },
  ];

  try {
    for (const pulse of pulses) {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(pulse.freq, pulse.start);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, pulse.start);
      filter.Q.setValueAtTime(1.5, pulse.start);

      gain.gain.setValueAtTime(0.001, pulse.start);
      gain.gain.linearRampToValueAtTime(0.45, pulse.start + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, pulse.start + pulse.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGainNode);

      osc.start(pulse.start);
      osc.stop(pulse.start + pulse.dur + 0.02);
    }
  } catch {
    // Fallback
  }
}

/**
 * 7. playCardDraw()
 * Subtle high-frequency whoosh simulating drawing or flipping a card:
 * - Bandpass filtered white noise sweeping upwards (1600 Hz -> 4600 Hz)
 * - Quick, tactile 95ms duration
 */
export function playCardDraw(): void {
  if (isMuted()) return;
  const ctx = getAudioContext();
  if (!ctx || !masterGainNode) return;

  const now = ctx.currentTime;
  const duration = 0.095;

  try {
    const buffer = createNoiseBuffer(ctx, duration, 'white');
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(4600, now + duration);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.26, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(masterGainNode);

    source.start(now);
    source.stop(now + duration + 0.02);
  } catch {
    // Fallback
  }
}

/**
 * Aggregated object for convenient default export.
 */
export const soundEffects = {
  getAudioContext,
  initAudio,
  isMuted,
  setMuted,
  toggleMute,
  getVolume,
  setVolume,
  playRacketHit,
  playSandBounce,
  playAce,
  playPointWon,
  playApplause,
  playFault,
  playCardDraw,
};

export default soundEffects;

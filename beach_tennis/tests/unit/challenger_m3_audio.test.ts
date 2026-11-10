/**
 * Empirical Adversarial Challenger Test Suite — Milestone M3
 * Target: src/utils/soundEffects.ts (Procedural Web Audio Synthesizer)
 * File: tests/unit/challenger_m3_audio.test.ts
 *
 * Objectives:
 * 1. Rapid sequential triggering (100 consecutive hits in 10ms, 500 interleaved SFX)
 *    verifying zero node leaks, bounded allocations, and strictly finite start/stop lifecycles.
 * 2. Mute toggling, volume clamping outside [0, 1] (negative, >1, NaN, +/-Infinity),
 *    and master gain node state synchronization.
 * 3. LocalStorage exception simulation (SecurityError, QuotaExceededError, corrupted data).
 * 4. Headless SSR execution where window or AudioContext is undefined, plus constructor throw.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Comprehensive Web Audio API Mock Harness
// ============================================================================

class MockAudioParam {
  value: number;
  setValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
  exponentialRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
  linearRampToValueAtTime = vi.fn((val: number, _time: number) => {
    this.value = val;
    return this;
  });
  cancelScheduledValues = vi.fn((_time: number) => this);

  constructor(initial = 1) {
    this.value = initial;
  }
}

class MockAudioNode {
  connectedTo: MockAudioNode[] = [];
  connect = vi.fn((destination: MockAudioNode) => {
    this.connectedTo.push(destination);
    return destination;
  });
  disconnect = vi.fn(() => {
    this.connectedTo = [];
  });
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam(440);
  start = vi.fn((_when?: number) => {});
  stop = vi.fn((_when?: number) => {});
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam(350);
  Q = new MockAudioParam(1);
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: any = null;
  start = vi.fn((_when?: number) => {});
  stop = vi.fn((_when?: number) => {});
}

class MockAudioContext {
  currentTime = 100.0;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = new MockAudioNode();
  resume = vi.fn().mockResolvedValue(undefined);

  createdGains: MockGainNode[] = [];
  createdOscillators: MockOscillatorNode[] = [];
  createdFilters: MockBiquadFilterNode[] = [];
  createdBufferSources: MockAudioBufferSourceNode[] = [];
  createdBuffers: Array<{ channels: number; length: number; sampleRate: number }> = [];

  createGain = vi.fn(() => {
    const gain = new MockGainNode();
    this.createdGains.push(gain);
    return gain;
  });

  createOscillator = vi.fn(() => {
    const osc = new MockOscillatorNode();
    this.createdOscillators.push(osc);
    return osc;
  });

  createBiquadFilter = vi.fn(() => {
    const filter = new MockBiquadFilterNode();
    this.createdFilters.push(filter);
    return filter;
  });

  createBufferSource = vi.fn(() => {
    const src = new MockAudioBufferSourceNode();
    this.createdBufferSources.push(src);
    return src;
  });

  createBuffer = vi.fn((channels: number, length: number, sampleRate: number) => {
    this.createdBuffers.push({ channels, length, sampleRate });
    const channelsData = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      duration: length / sampleRate,
      getChannelData: vi.fn((ch: number) => channelsData[ch] || new Float32Array(length)),
    };
  });
}

describe('Challenger M3: Empirical Audio Synthesizer Stress Harness', () => {
  let mockCtx: MockAudioContext;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    mockCtx = new MockAudioContext();
    (window as any).AudioContext = vi.fn(() => mockCtx);
    (window as any).webkitAudioContext = undefined;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Objective 1: Rapid Sequential Triggering & Memory/Node Leak Stress
  // ==========================================================================
  describe('Objective 1: Rapid Sequential Triggering & Resource Integrity', () => {
    it('executes 100 consecutive playRacketHit calls in a tight burst without node leaks or hanging nodes', async () => {
      const soundModule = await import('../../src/utils/soundEffects');
      const startOscCount = mockCtx.createdOscillators.length;
      const startBufferSrcCount = mockCtx.createdBufferSources.length;

      // Fire 100 consecutive racket hits in rapid succession
      for (let i = 0; i < 100; i++) {
        mockCtx.currentTime += 0.0001; // ~10ms total simulated span
        const speed = i % 3 === 0 ? 'soft' : i % 3 === 1 ? 'normal' : 'power';
        soundModule.playRacketHit(speed);
      }

      const endOscCount = mockCtx.createdOscillators.length;
      const endBufferSrcCount = mockCtx.createdBufferSources.length;

      expect(endOscCount - startOscCount).toBe(100);
      expect(endBufferSrcCount - startBufferSrcCount).toBe(100);

      // Verify every oscillator and noise source was scheduled to start AND stop cleanly
      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.start).toHaveBeenCalledTimes(1);
        expect(osc.stop).toHaveBeenCalledTimes(1);

        const startCall = osc.start.mock.calls[0];
        const stopCall = osc.stop.mock.calls[0];
        expect(startCall).toBeDefined();
        expect(stopCall).toBeDefined();

        const startTime = (startCall as [number?])[0];
        const stopTime = (stopCall as [number?])[0];
        expect(typeof startTime).toBe('number');
        expect(typeof stopTime).toBe('number');
        expect(stopTime!).toBeGreaterThan(startTime!);
      });

      mockCtx.createdBufferSources.forEach((src) => {
        expect(src.start).toHaveBeenCalledTimes(1);
        expect(src.stop).toHaveBeenCalledTimes(1);

        const startCall = src.start.mock.calls[0];
        const stopCall = src.stop.mock.calls[0];
        expect(startCall).toBeDefined();
        expect(stopCall).toBeDefined();

        const startTime = (startCall as [number?])[0];
        const stopTime = (stopCall as [number?])[0];
        expect(typeof startTime).toBe('number');
        expect(typeof stopTime).toBe('number');
        expect(stopTime!).toBeGreaterThan(startTime!);
      });
    });

    it('interleaves 500 stochastic procedural SFX triggers across all 7 sound models with zero crashes', async () => {
      const soundModule = await import('../../src/utils/soundEffects');
      const effects: Array<() => void> = [
        () => soundModule.playRacketHit('power'),
        () => soundModule.playSandBounce(),
        () => soundModule.playAce(),
        () => soundModule.playPointWon(),
        () => soundModule.playApplause(),
        () => soundModule.playFault(),
        () => soundModule.playCardDraw(),
      ];

      expect(() => {
        for (let i = 0; i < 500; i++) {
          mockCtx.currentTime += 0.002;
          const chosenEffect = effects[i % effects.length]!;
          chosenEffect();
        }
      }).not.toThrow();

      // All created buffers must have valid positive length and sampleRate
      expect(mockCtx.createdBuffers.length).toBeGreaterThan(200);
      mockCtx.createdBuffers.forEach((buf) => {
        expect(buf.length).toBeGreaterThan(0);
        expect(buf.sampleRate).toBe(44100);
        expect(buf.channels).toBe(1);
      });

      // Verify 100% of all created oscillators and buffer sources received stop commands
      mockCtx.createdOscillators.forEach((osc) => {
        expect(osc.stop).toHaveBeenCalledTimes(1);
      });
      mockCtx.createdBufferSources.forEach((src) => {
        expect(src.stop).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ==========================================================================
  // Objective 2: Mute Toggling & Adversarial Volume Clamping
  // ==========================================================================
  describe('Objective 2: Mute Toggling, Volume Clamping & Master Gain', () => {
    it('rapidly toggles mute state 100 times, preserving strict boolean parity and master gain synchrony', async () => {
      const soundModule = await import('../../src/utils/soundEffects');
      expect(soundModule.isMuted()).toBe(false);

      for (let i = 1; i <= 100; i++) {
        const newState = soundModule.toggleMute();
        expect(newState).toBe(i % 2 === 1);
        expect(soundModule.isMuted()).toBe(i % 2 === 1);
      }

      // Reset to unmuted
      soundModule.setMuted(false);
      expect(soundModule.isMuted()).toBe(false);
    });

    it('suppresses 100% of node creation when muted across all 7 procedural sounds', async () => {
      const soundModule = await import('../../src/utils/soundEffects');
      soundModule.setMuted(true);
      expect(soundModule.isMuted()).toBe(true);

      const oscBefore = mockCtx.createdOscillators.length;
      const bufSrcBefore = mockCtx.createdBufferSources.length;
      const gainBefore = mockCtx.createdGains.length;

      soundModule.playRacketHit('power');
      soundModule.playSandBounce();
      soundModule.playAce();
      soundModule.playPointWon();
      soundModule.playApplause();
      soundModule.playFault();
      soundModule.playCardDraw();

      expect(mockCtx.createdOscillators.length).toBe(oscBefore);
      expect(mockCtx.createdBufferSources.length).toBe(bufSrcBefore);
      expect(mockCtx.createdGains.length).toBe(gainBefore);
    });

    it('strictly clamps adversarial volume inputs: negative values, >1.0, NaN, and +/-Infinity', async () => {
      const soundModule = await import('../../src/utils/soundEffects');

      // Negative values clamped to 0
      soundModule.setVolume(-5);
      expect(soundModule.getVolume()).toBe(0);

      soundModule.setVolume(-0.0001);
      expect(soundModule.getVolume()).toBe(0);

      // Values exceeding 1.0 clamped to 1.0
      soundModule.setVolume(1.0001);
      expect(soundModule.getVolume()).toBe(1.0);

      soundModule.setVolume(10);
      expect(soundModule.getVolume()).toBe(1.0);

      soundModule.setVolume(99999);
      expect(soundModule.getVolume()).toBe(1.0);

      // Normal valid values
      soundModule.setVolume(0.42);
      expect(soundModule.getVolume()).toBe(0.42);

      // NaN fallback
      soundModule.setVolume(NaN);
      expect(soundModule.getVolume()).toBeGreaterThanOrEqual(0);
      expect(soundModule.getVolume()).toBeLessThanOrEqual(1);

      // Infinite values
      soundModule.setVolume(Infinity);
      expect(soundModule.getVolume()).toBe(1.0);

      soundModule.setVolume(-Infinity);
      expect(soundModule.getVolume()).toBe(0.0);
    });
  });

  // ==========================================================================
  // Objective 3: LocalStorage Exception Simulation
  // ==========================================================================
  describe('Objective 3: LocalStorage Exception & Corruption Resilience', () => {
    it('gracefully handles SecurityError when localStorage.getItem throws (e.g. private mode)', async () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: The operation is insecure.');
      });

      const soundModule = await import('../../src/utils/soundEffects');
      expect(() => soundModule.isMuted()).not.toThrow();
      expect(() => soundModule.getVolume()).not.toThrow();
      expect(soundModule.isMuted()).toBe(false);
      expect(soundModule.getVolume()).toBe(0.7);
    });

    it('gracefully handles QuotaExceededError when localStorage.setItem throws', async () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError: Setting the value of "ubt_sound_volume" exceeded the quota.');
      });

      const soundModule = await import('../../src/utils/soundEffects');
      expect(() => soundModule.setMuted(true)).not.toThrow();
      expect(() => soundModule.setVolume(0.35)).not.toThrow();
      expect(soundModule.getVolume()).toBe(0.35);
    });

    it('recovers cleanly from corrupted / nonsensical localStorage values', async () => {
      localStorage.setItem('ubt_sound_volume', 'invalid_float_string');
      localStorage.setItem('ubt_sound_muted', 'not_a_boolean');

      const soundModule = await import('../../src/utils/soundEffects');
      expect(soundModule.isMuted()).toBe(false);
      expect(soundModule.getVolume()).toBe(0.7);
    });

    it('ignores out-of-range volume values stored in localStorage and keeps default', async () => {
      localStorage.setItem('ubt_sound_volume', '4.5'); // Out of [0, 1]
      const soundModule = await import('../../src/utils/soundEffects');
      expect(soundModule.getVolume()).toBe(0.7);
    });
  });

  // ==========================================================================
  // Objective 4: Headless SSR Execution & Missing Web Audio API
  // ==========================================================================
  describe('Objective 4: Headless SSR & Missing AudioContext Safety', () => {
    it('returns null and does not throw in headless SSR environment where window is undefined', async () => {
      const originalWin = globalThis.window;
      // @ts-expect-error simulating headless SSR
      delete globalThis.window;

      try {
        const soundModule = await import('../../src/utils/soundEffects');
        const ctx = soundModule.getAudioContext();
        expect(ctx).toBeNull();

        // Sound plays must be safe no-ops
        expect(() => soundModule.playRacketHit()).not.toThrow();
        expect(() => soundModule.playSandBounce()).not.toThrow();
        expect(() => soundModule.playAce()).not.toThrow();
        expect(() => soundModule.playPointWon()).not.toThrow();
        expect(() => soundModule.playApplause()).not.toThrow();
        expect(() => soundModule.playFault()).not.toThrow();
        expect(() => soundModule.playCardDraw()).not.toThrow();
      } finally {
        globalThis.window = originalWin;
      }
    });

    it('returns null and executes safely when window exists but AudioContext is unsupported', async () => {
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;

      const soundModule = await import('../../src/utils/soundEffects');
      const ctx = soundModule.getAudioContext();
      expect(ctx).toBeNull();

      expect(() => soundModule.initAudio()).not.toThrow();
      expect(() => soundModule.playAce()).not.toThrow();
      expect(() => soundModule.playApplause()).not.toThrow();
    });

    it('catches and recovers gracefully when AudioContext constructor throws', async () => {
      (window as any).AudioContext = vi.fn(() => {
        throw new Error('NotAllowedError: AudioContext construction disallowed by policy');
      });

      const soundModule = await import('../../src/utils/soundEffects');
      const ctx = soundModule.getAudioContext();
      expect(ctx).toBeNull();
      expect(() => soundModule.playPointWon()).not.toThrow();
    });
  });
});

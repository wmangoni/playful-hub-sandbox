/**
 * Unit tests for procedural Web Audio Synthesizer (soundEffects.ts)
 * File: tests/unit/soundEffects.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Web Audio API Mocks
// ============================================================================

class MockAudioParam {
  value: number;
  setValueAtTime = vi.fn((val: number) => {
    this.value = val;
    return this;
  });
  exponentialRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
    return this;
  });
  linearRampToValueAtTime = vi.fn((val: number) => {
    this.value = val;
    return this;
  });
  cancelScheduledValues = vi.fn(() => this);

  constructor(initial = 1) {
    this.value = initial;
  }
}

class MockAudioNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam(1);
}

class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency = new MockAudioParam(440);
  start = vi.fn();
  stop = vi.fn();
}

class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency = new MockAudioParam(350);
  Q = new MockAudioParam(1);
}

class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: any = null;
  start = vi.fn();
  stop = vi.fn();
}

class MockAudioContext {
  currentTime = 12.5;
  sampleRate = 44100;
  state: AudioContextState = 'running';
  destination = new MockAudioNode();
  resume = vi.fn().mockResolvedValue(undefined);

  createdGains: MockGainNode[] = [];
  createdOscillators: MockOscillatorNode[] = [];
  createdFilters: MockBiquadFilterNode[] = [];
  createdBufferSources: MockAudioBufferSourceNode[] = [];

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

describe('Procedural Web Audio Synthesizer (soundEffects.ts)', () => {
  let mockCtxInstance: MockAudioContext | null = null;
  let soundEffects: typeof import('../../src/utils/soundEffects');

  beforeEach(async () => {
    vi.resetModules();
    localStorage.clear();

    mockCtxInstance = new MockAudioContext();
    const MockAudioContextClass = vi.fn(() => mockCtxInstance as unknown as AudioContext);

    // Mount to window
    (window as any).AudioContext = MockAudioContextClass;
    (window as any).webkitAudioContext = MockAudioContextClass;

    // Dynamically import module to ensure fresh module-scoped state per test
    soundEffects = await import('../../src/utils/soundEffects');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // Suite 1: Initialization & Master Gain
  // ==========================================================================
  describe('AudioContext Lifecycle & Lazy Initialization', () => {
    it('does not instantiate AudioContext immediately on module import', () => {
      // AudioContext constructor shouldn't have been called just by importing
      expect((window as any).AudioContext).not.toHaveBeenCalled();
    });

    it('lazily instantiates AudioContext and creates master gain on first call', () => {
      const ctx = soundEffects.getAudioContext();
      expect(ctx).toBeDefined();
      expect((window as any).AudioContext).toHaveBeenCalledTimes(1);
      expect(mockCtxInstance?.createGain).toHaveBeenCalled();
      expect(mockCtxInstance!.createdGains[0]!.connect).toHaveBeenCalledWith(
        mockCtxInstance!.destination
      );
    });

    it('resumes suspended AudioContext if autoplay policy halted it', () => {
      mockCtxInstance!.state = 'suspended';
      soundEffects.initAudio();
      expect(mockCtxInstance?.resume).toHaveBeenCalledTimes(1);
    });

    it('returns null gracefully when window.AudioContext is unsupported', async () => {
      vi.resetModules();
      (window as any).AudioContext = undefined;
      (window as any).webkitAudioContext = undefined;

      const freshEffects = await import('../../src/utils/soundEffects');
      const ctx = freshEffects.getAudioContext();
      expect(ctx).toBeNull();

      // Sounds should not throw when AudioContext is unavailable
      expect(() => freshEffects.playRacketHit()).not.toThrow();
      expect(() => freshEffects.playSandBounce()).not.toThrow();
    });
  });

  // ==========================================================================
  // Suite 2: Volume & Mute Persistence
  // ==========================================================================
  describe('Master Volume, Mute State & LocalStorage Persistence', () => {
    it('defaults to volume 0.7 and unmuted state', () => {
      expect(soundEffects.isMuted()).toBe(false);
      expect(soundEffects.getVolume()).toBe(0.7);
    });

    it('persists muted state in localStorage', () => {
      soundEffects.setMuted(true);
      expect(soundEffects.isMuted()).toBe(true);
      expect(localStorage.getItem('ubt_sound_muted')).toBe('true');

      soundEffects.setMuted(false);
      expect(soundEffects.isMuted()).toBe(false);
      expect(localStorage.getItem('ubt_sound_muted')).toBe('false');
    });

    it('toggles muted state and returns new state', () => {
      expect(soundEffects.toggleMute()).toBe(true);
      expect(soundEffects.isMuted()).toBe(true);
      expect(soundEffects.toggleMute()).toBe(false);
      expect(soundEffects.isMuted()).toBe(false);
    });

    it('sets volume clamped between 0.0 and 1.0', () => {
      soundEffects.setVolume(0.5);
      expect(soundEffects.getVolume()).toBe(0.5);
      expect(localStorage.getItem('ubt_sound_volume')).toBe('0.5');

      // Clamp upper bound
      soundEffects.setVolume(1.8);
      expect(soundEffects.getVolume()).toBe(1.0);

      // Clamp lower bound
      soundEffects.setVolume(-0.4);
      expect(soundEffects.getVolume()).toBe(0.0);
    });

    it('updates master gain node value when volume or mute changes', () => {
      soundEffects.initAudio();
      const masterGain = mockCtxInstance!.createdGains[0]!;

      soundEffects.setVolume(0.8);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.8, mockCtxInstance!.currentTime);

      soundEffects.setMuted(true);
      expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0, mockCtxInstance!.currentTime);
    });

    it('restores preferences saved in localStorage upon initialization', async () => {
      vi.resetModules();
      localStorage.setItem('ubt_sound_muted', 'true');
      localStorage.setItem('ubt_sound_volume', '0.35');

      const freshEffects = await import('../../src/utils/soundEffects');
      expect(freshEffects.isMuted()).toBe(true);
      expect(freshEffects.getVolume()).toBe(0.35);
    });
  });

  // ==========================================================================
  // Suite 3: Procedural Sound Synthesizers
  // ==========================================================================
  describe('Procedural Sound Synthesis Functions', () => {
    it('does not create audio nodes when sound is muted', () => {
      soundEffects.setMuted(true);
      soundEffects.initAudio();

      const initialOscCount = mockCtxInstance!.createdOscillators.length;
      const initialSrcCount = mockCtxInstance!.createdBufferSources.length;

      soundEffects.playRacketHit('normal');
      soundEffects.playSandBounce();
      soundEffects.playAce();
      soundEffects.playPointWon();
      soundEffects.playApplause();
      soundEffects.playFault();
      soundEffects.playCardDraw();

      expect(mockCtxInstance!.createdOscillators.length).toBe(initialOscCount);
      expect(mockCtxInstance!.createdBufferSources.length).toBe(initialSrcCount);
    });

    describe('playRacketHit', () => {
      it('creates triangle oscillator and noise burst for carbon paddle impact', () => {
        soundEffects.playRacketHit('normal');

        const osc = mockCtxInstance!.createdOscillators[0]!;
        expect(osc).toBeDefined();
        expect(osc.type).toBe('triangle');
        expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(580, mockCtxInstance!.currentTime);
        expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
          140,
          mockCtxInstance!.currentTime + 0.06
        );
        expect(osc.start).toHaveBeenCalled();
        expect(osc.stop).toHaveBeenCalled();

        // Check carbon transient noise burst
        const noiseSrc = mockCtxInstance!.createdBufferSources[0]!;
        expect(noiseSrc).toBeDefined();
        expect(noiseSrc.start).toHaveBeenCalled();
      });

      it('adjusts frequency and duration for soft, normal, and power hits', () => {
        soundEffects.playRacketHit('soft');
        const softOsc = mockCtxInstance!.createdOscillators[0]!;
        expect(softOsc.frequency.setValueAtTime).toHaveBeenCalledWith(380, mockCtxInstance!.currentTime);

        soundEffects.playRacketHit('power');
        const powerOsc = mockCtxInstance!.createdOscillators[1]!;
        expect(powerOsc.frequency.setValueAtTime).toHaveBeenCalledWith(950, mockCtxInstance!.currentTime);
      });
    });

    describe('playSandBounce', () => {
      it('generates white noise lowpass filter sweep and sub-bass impact thud', () => {
        soundEffects.playSandBounce();

        // Filtered noise
        const filter = mockCtxInstance!.createdFilters[0]!;
        expect(filter).toBeDefined();
        expect(filter.type).toBe('lowpass');
        expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(260, mockCtxInstance!.currentTime);

        // Sub oscillator
        const subOsc = mockCtxInstance!.createdOscillators[0]!;
        expect(subOsc).toBeDefined();
        expect(subOsc.type).toBe('sine');
        expect(subOsc.frequency.setValueAtTime).toHaveBeenCalledWith(85, mockCtxInstance!.currentTime);
        expect(subOsc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(
          35,
          mockCtxInstance!.currentTime + 0.085
        );
      });
    });

    describe('playAce', () => {
      it('synthesizes a 4-note ascending major arpeggio with high shimmer', () => {
        soundEffects.playAce();

        // 4 arpeggio notes + 1 high harmonic chime = 5 oscillators
        expect(mockCtxInstance!.createdOscillators.length).toBe(5);

        const freqs = mockCtxInstance!.createdOscillators.map(
          (o) => (o.frequency.setValueAtTime as any).mock.calls[0][0]
        );
        expect(freqs).toContain(523.25); // C5
        expect(freqs).toContain(659.25); // E5
        expect(freqs).toContain(783.99); // G5
        expect(freqs).toContain(1046.5); // C6
        expect(freqs).toContain(2093.0); // C7 Shimmer
      });
    });

    describe('playPointWon', () => {
      it('synthesizes a pleasant two-tone chime (G5 -> C6)', () => {
        soundEffects.playPointWon();

        expect(mockCtxInstance!.createdOscillators.length).toBe(2);
        const [tone1, tone2] = mockCtxInstance!.createdOscillators;

        expect((tone1!.frequency.setValueAtTime as any).mock.calls[0][0]).toBe(783.99);
        expect((tone2!.frequency.setValueAtTime as any).mock.calls[0][0]).toBe(1046.5);
      });
    });

    describe('playApplause', () => {
      it('creates bandpass-filtered pink noise simulating cheering crowd', () => {
        soundEffects.playApplause();

        const src = mockCtxInstance!.createdBufferSources[0]!;
        expect(src).toBeDefined();
        expect(src.start).toHaveBeenCalled();

        const filter = mockCtxInstance!.createdFilters[0]!;
        expect(filter).toBeDefined();
        expect(filter.type).toBe('bandpass');
        expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(1300, mockCtxInstance!.currentTime);
      });
    });

    describe('playFault', () => {
      it('creates dual-pulse sawtooth low buzzer with lowpass filtering', () => {
        soundEffects.playFault();

        expect(mockCtxInstance!.createdOscillators.length).toBe(2);
        expect(mockCtxInstance!.createdFilters.length).toBe(2);

        const osc1 = mockCtxInstance!.createdOscillators[0]!;
        expect(osc1.type).toBe('sawtooth');
        expect((osc1.frequency.setValueAtTime as any).mock.calls[0][0]).toBe(115);

        const osc2 = mockCtxInstance!.createdOscillators[1]!;
        expect(osc2.type).toBe('sawtooth');
        expect((osc2.frequency.setValueAtTime as any).mock.calls[0][0]).toBe(95);
      });
    });

    describe('playCardDraw', () => {
      it('creates upward bandpass noise frequency sweep for card slide whoosh', () => {
        soundEffects.playCardDraw();

        const src = mockCtxInstance!.createdBufferSources[0]!;
        expect(src).toBeDefined();
        expect(src.start).toHaveBeenCalled();

        const filter = mockCtxInstance!.createdFilters[0]!;
        expect(filter).toBeDefined();
        expect(filter.type).toBe('bandpass');
        expect(filter.frequency.setValueAtTime).toHaveBeenCalledWith(1600, mockCtxInstance!.currentTime);
        expect(filter.frequency.exponentialRampToValueAtTime).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Suite 4: Safety & Error Handling
  // ==========================================================================
  describe('Error Handling and Environmental Resilience', () => {
    it('survives when localStorage throws exceptions (e.g. security quota in iframe)', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError: The operation is insecure.');
      });
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => soundEffects.isMuted()).not.toThrow();
      expect(() => soundEffects.setMuted(true)).not.toThrow();
      expect(() => soundEffects.setVolume(0.5)).not.toThrow();
    });

    it('survives when audioCtx.resume() rejects', () => {
      mockCtxInstance!.state = 'suspended';
      mockCtxInstance!.resume = vi.fn().mockRejectedValue(new Error('Autoplay blocked'));

      expect(() => soundEffects.initAudio()).not.toThrow();
    });
  });
});

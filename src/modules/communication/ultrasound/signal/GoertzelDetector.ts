/**
 * Goertzel Detector
 * Efficient single-frequency power detection algorithm
 * Much faster than FFT when you only need to detect 2-3 specific frequencies
 */

import type { GoertzelState } from '../UltrasoundService.types.js';

export class GoertzelDetector {
  #detectors: GoertzelState[] = [];
  #sampleRate: number;

  constructor(sampleRate: number) {
    this.#sampleRate = sampleRate;
  }

  /**
   * Initialize detectors for specific frequencies
   */
  initDetectors(frequencies: number[], fftSize: number = 2048): void {
    this.#detectors = frequencies.map(freq => {
      const k = Math.round(fftSize * freq / this.#sampleRate);
      const w = 2 * Math.PI * k / fftSize;
      return {
        freq,
        coeff: 2 * Math.cos(w),
        s1: 0,
        s2: 0,
        N: fftSize,
        count: 0,
        power: 0,
      };
    });
  }

  /**
   * Process a single sample through all detectors
   */
  processSample(sample: number): void {
    for (const detector of this.#detectors) {
      const s0 = sample + detector.coeff * detector.s1 - detector.s2;
      detector.s2 = detector.s1;
      detector.s1 = s0;
      detector.count++;

      if (detector.count >= detector.N) {
        // Calculate power using Goertzel formula
        detector.power = detector.s1 * detector.s1 + detector.s2 * detector.s2 - detector.coeff * detector.s1 * detector.s2;
        detector.s1 = 0;
        detector.s2 = 0;
        detector.count = 0;
      }
    }
  }

  /**
   * Process a buffer of samples
   */
  processBuffer(samples: Float32Array): void {
    for (let i = 0; i < samples.length; i++) {
      this.processSample(samples[i]);
    }
  }

  /**
   * Get power at a specific frequency index
   */
  getPower(index: number): number {
    if (index < 0 || index >= this.#detectors.length) {
      return 0;
    }
    return this.#detectors[index].power;
  }

  /**
   * Get all detector powers
   */
  getAllPowers(): number[] {
    return this.#detectors.map(d => d.power);
  }

  /**
   * Get detector states (for debugging)
   */
  getDetectors(): ReadonlyArray<GoertzelState> {
    return this.#detectors;
  }

  /**
   * Reset all detectors
   */
  reset(): void {
    for (const detector of this.#detectors) {
      detector.s1 = 0;
      detector.s2 = 0;
      detector.count = 0;
      detector.power = 0;
    }
  }

  /**
   * Get number of detectors
   */
  getDetectorCount(): number {
    return this.#detectors.length;
  }
}

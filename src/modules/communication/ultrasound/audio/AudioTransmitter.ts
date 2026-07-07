/**
 * Audio Transmitter
 * Generates ultrasonic DTMF tones using Web Audio API oscillators
 */

import type { OscillatorState } from '../UltrasoundService.types.js';
import { getTxFrequencies, SYMBOL_PAIRS } from '../UltrasoundService.types.js';
import type { AudioContextManager } from './AudioContextManager.js';

export class AudioTransmitter {
  #audioCtxManager: AudioContextManager;
  #oscillators: OscillatorState[] = [];
  #role: 'master' | 'slave';
  #txPower: number;

  constructor(audioCtxManager: AudioContextManager, role: 'master' | 'slave', txPower: number) {
    this.#audioCtxManager = audioCtxManager;
    this.#role = role;
    this.#txPower = txPower;
  }

  /**
   * Update transmission power
   */
  setPower(power: number): void {
    this.#txPower = Math.max(0, Math.min(1, power));
    // Update gain on active oscillators
    for (const { gain } of this.#oscillators) {
      gain.gain.value = this.#txPower * 0.35;
    }
  }

  /**
   * Transmit a symbol by playing two frequencies simultaneously
   */
  transmitSymbol(symbolIndex: number): void {
    this.stop();

    if (symbolIndex < 0 || symbolIndex >= SYMBOL_PAIRS.length) {
      throw new Error(`Invalid symbol index: ${symbolIndex}`);
    }

    const ctx = this.#audioCtxManager.getContext();
    const freqs = getTxFrequencies(this.#role);
    const pair = SYMBOL_PAIRS[symbolIndex];

    this.#oscillators = [];

    for (const freqIdx of pair) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freqs[freqIdx];
      gain.gain.value = this.#txPower * 0.35;

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      this.#oscillators.push({ oscillator: osc, gain });
    }
  }

  /**
   * Stop transmission
   */
  stop(): void {
    for (const { oscillator } of this.#oscillators) {
      try {
        oscillator.stop();
        oscillator.disconnect();
      } catch (e) {
        // Oscillator already stopped
      }
    }
    this.#oscillators = [];
  }

  /**
   * Check if currently transmitting
   */
  isTransmitting(): boolean {
    return this.#oscillators.length > 0;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
  }
}

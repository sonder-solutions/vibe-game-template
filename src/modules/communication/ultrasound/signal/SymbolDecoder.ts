/**
 * Symbol Decoder
 * Detects DTMF symbols from frequency powers using multi-frequency detection
 * Based on the detection algorithm from the existing DTMF implementation
 */

import { SYMBOL_PAIRS, type DetectionResult } from '../UltrasoundService.types.js';

export class SymbolDecoder {
  #noiseGateMultiplier: number;

  constructor(noiseGateMultiplier: number) {
    this.#noiseGateMultiplier = noiseGateMultiplier;
  }

  /**
   * Detect symbol from frequency powers
   *
   * Algorithm:
   * 1. Check if total power exceeds absolute threshold (noise * 15)
   * 2. Check each frequency bin against per-bin threshold (noise * 6)
   * 3. Require exactly 2 bins active
   * 4. Validate inactive bin is much weaker than active bins (broadband rejection)
   * 5. Map to symbol based on which pair matches
   */
  detectSymbol(
    lowPower: number,
    midPower: number,
    highPower: number,
    noisePower: number
  ): DetectionResult {
    const total = lowPower + midPower + highPower;
    const noiseGate = noisePower * this.#noiseGateMultiplier;

    // Absolute power floor
    if (total < noiseGate * 15) {
      return {
        symbolIndex: -1,
        confidence: 0,
        powers: { low: lowPower, mid: midPower, high: highPower, noise: noisePower },
      };
    }

    // Per-bin threshold
    const thresh = noiseGate * 6;
    const aboveLow = lowPower > thresh;
    const aboveMid = midPower > thresh;
    const aboveHigh = highPower > thresh;
    const count = (aboveLow ? 1 : 0) + (aboveMid ? 1 : 0) + (aboveHigh ? 1 : 0);

    // Must have exactly 2 bins active
    if (count !== 2) {
      return {
        symbolIndex: -1,
        confidence: 0,
        powers: { low: lowPower, mid: midPower, high: highPower, noise: noisePower },
      };
    }

    // Broadband rejection: inactive bin must be much weaker
    const activeMax = Math.max(lowPower, midPower, highPower);
    const inactiveVals: number[] = [];
    if (!aboveLow) inactiveVals.push(lowPower);
    if (!aboveMid) inactiveVals.push(midPower);
    if (!aboveHigh) inactiveVals.push(highPower);
    const inactiveMax = Math.max(...inactiveVals);

    if (inactiveMax > activeMax * 0.35) {
      return {
        symbolIndex: -1,
        confidence: 0,
        powers: { low: lowPower, mid: midPower, high: highPower, noise: noisePower },
      };
    }

    // Map to symbol
    let symbolIndex = -1;
    if (aboveLow && aboveMid) symbolIndex = 0;   // 0 = low+mid
    else if (aboveHigh && aboveMid) symbolIndex = 1;   // 1 = high+mid
    else if (aboveLow && aboveHigh) symbolIndex = 2;   // fn = low+high

    // Calculate confidence based on power separation
    const confidence = this.calculateConfidence(lowPower, midPower, highPower, noisePower);

    return {
      symbolIndex,
      confidence,
      powers: { low: lowPower, mid: midPower, high: highPower, noise: noisePower },
    };
  }

  /**
   * Calculate confidence level (0-1) based on signal quality
   */
  private calculateConfidence(
    low: number,
    mid: number,
    high: number,
    noise: number
  ): number {
    const total = low + mid + high;
    if (total === 0) return 0;

    // Higher confidence when signal is much stronger than noise
    const signalToNoise = total / (noise + 0.0001);
    const snrFactor = Math.min(1, signalToNoise / 100);

    // Higher confidence when there's clear separation between active and inactive bins
    const powers = [low, mid, high].sort((a, b) => b - a);
    const separation = (powers[1] - powers[2]) / (powers[0] + 0.0001);
    const separationFactor = Math.min(1, separation);

    return (snrFactor * 0.6 + separationFactor * 0.4);
  }

  /**
   * Update configuration
   */
  setConfig(noiseGateMultiplier: number): void {
    this.#noiseGateMultiplier = noiseGateMultiplier;
  }
}

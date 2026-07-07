/**
 * Noise Gate
 * Adaptive noise floor estimation and signal gating
 * Based on the denoise algorithm from the existing DTMF implementation
 */

export class NoiseGate {
  #noisePower: number = 0;
  #noiseFloorEstimationMs: number;
  #noiseGateMultiplier: number;
  #startTime: number;
  #isEstimating: boolean = true;
  #sampleRate: number;
  #samplesProcessed: number = 0;

  constructor(noiseFloorEstimationMs: number, noiseGateMultiplier: number, sampleRate: number) {
    this.#noiseFloorEstimationMs = noiseFloorEstimationMs;
    this.#noiseGateMultiplier = noiseGateMultiplier;
    this.#sampleRate = sampleRate;
    this.#startTime = Date.now();
  }

  /**
   * Update noise floor estimate from initial silent period
   */
  private updateNoiseFloor(power: number): void {
    const elapsed = Date.now() - this.#startTime;

    if (elapsed < this.#noiseFloorEstimationMs) {
      // Still estimating - use exponential moving average
      if (this.#noisePower === 0) {
        this.#noisePower = power;
      } else {
        this.#noisePower = this.#noisePower * 0.95 + power * 0.05;
      }
    } else {
      this.#isEstimating = false;
    }
  }

  /**
   * Process a power reading and determine if signal exceeds noise gate
   */
  process(signalPower: number): { exceedsGate: boolean; noisePower: number; threshold: number } {
    this.updateNoiseFloor(signalPower);

    const noiseGate = this.#noisePower * this.#noiseGateMultiplier;
    const exceedsGate = signalPower > noiseGate;

    return {
      exceedsGate,
      noisePower: this.#noisePower,
      threshold: noiseGate,
    };
  }

  /**
   * Check if a signal exceeds the noise gate
   */
  exceedsGate(signalPower: number): boolean {
    const noiseGate = this.#noisePower * this.#noiseGateMultiplier;
    return signalPower > noiseGate;
  }

  /**
   * Get current noise power estimate
   */
  getNoisePower(): number {
    return this.#noisePower;
  }

  /**
   * Get noise floor in dB
   */
  getNoiseFloorDb(): number {
    return this.#noisePower > 0.0001 ? 10 * Math.log10(this.#noisePower) : -Infinity;
  }

  /**
   * Get threshold power
   */
  getThreshold(): number {
    return this.#noisePower * this.#noiseGateMultiplier;
  }

  /**
   * Check if still in estimation phase
   */
  isEstimating(): boolean {
    return this.#isEstimating;
  }

  /**
   * Reset noise floor estimation
   */
  reset(): void {
    this.#noisePower = 0;
    this.#startTime = Date.now();
    this.#isEstimating = true;
    this.#samplesProcessed = 0;
  }

  /**
   * Update configuration
   */
  setConfig(noiseGateMultiplier: number): void {
    this.#noiseGateMultiplier = noiseGateMultiplier;
  }
}

/**
 * Audio Context Manager
 * Handles AudioContext lifecycle with iOS Safari quirks
 */

export class AudioContextManager {
  #audioContext: AudioContext | null = null;
  #analyser: AnalyserNode | null = null;

  /**
   * Get or create AudioContext
   */
  getContext(): AudioContext {
    if (!this.#audioContext) {
      // @ts-expect-error webkit prefix for older Safari
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.#audioContext = new AudioContextClass();
      this.#analyser = this.#audioContext.createAnalyser();
      this.#analyser.fftSize = 4096;
      this.#analyser.smoothingTimeConstant = 0.3;
    }

    // Resume if suspended (iOS Safari requires user interaction)
    if (this.#audioContext.state === 'suspended') {
      this.#audioContext.resume();
    }

    return this.#audioContext;
  }

  /**
   * Get analyser node
   */
  getAnalyser(): AnalyserNode {
    if (!this.#analyser) {
      this.getContext();
    }
    return this.#analyser!;
  }

  /**
   * Get sample rate
   */
  getSampleRate(): number {
    return this.getContext().sampleRate;
  }

  /**
   * Suspend audio context
   */
  async suspend(): Promise<void> {
    if (this.#audioContext && this.#audioContext.state === 'running') {
      await this.#audioContext.suspend();
    }
  }

  /**
   * Resume audio context
   */
  async resume(): Promise<void> {
    if (this.#audioContext && this.#audioContext.state === 'suspended') {
      await this.#audioContext.resume();
    }
  }

  /**
   * Close audio context and cleanup
   */
  async close(): Promise<void> {
    if (this.#audioContext) {
      if (this.#analyser) {
        this.#analyser.disconnect();
        this.#analyser = null;
      }
      await this.#audioContext.close();
      this.#audioContext = null;
    }
  }
}

/**
 * Audio Receiver
 * Captures microphone input and provides time-domain data for analysis
 */

import type { AudioContextManager } from './AudioContextManager.js';

export class AudioReceiver {
  #audioCtxManager: AudioContextManager;
  #micStream: MediaStream | null = null;
  #micNode: MediaStreamAudioSourceNode | null = null;
  #isListening = false;
  #audioInputId?: string;

  constructor(audioCtxManager: AudioContextManager, audioInputId?: string) {
    this.#audioCtxManager = audioCtxManager;
    this.#audioInputId = audioInputId;
  }

  /**
   * Start listening from microphone
   */
  async start(): Promise<void> {
    if (this.#isListening) {
      return;
    }

    const constraints: MediaStreamConstraints = {
      audio: {
        deviceId: this.#audioInputId ? { exact: this.#audioInputId } : undefined,
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      },
    };

    try {
      this.#micStream = await navigator.mediaDevices.getUserMedia(constraints);
      const ctx = this.#audioCtxManager.getContext();
      this.#micNode = ctx.createMediaStreamSource(this.#micStream);
      this.#micNode.connect(this.#audioCtxManager.getAnalyser());
      this.#isListening = true;
    } catch (error) {
      throw new Error(`Failed to get microphone access: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Stop listening
   */
  stop(): void {
    if (this.#micNode) {
      this.#micNode.disconnect();
      this.#micNode = null;
    }

    if (this.#micStream) {
      this.#micStream.getTracks().forEach(track => track.stop());
      this.#micStream = null;
    }

    this.#isListening = false;
  }

  /**
   * Get time-domain audio data
   */
  getTimeDomainData(buffer: Float32Array): void {
    if (!this.#isListening) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.#audioCtxManager.getAnalyser().getFloatTimeDomainData(buffer as any);
  }

  /**
   * Get frequency-domain data
   */
  getFrequencyData(buffer: Float32Array): void {
    if (!this.#isListening) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.#audioCtxManager.getAnalyser().getFloatFrequencyData(buffer as any);
  }

  /**
   * Check if listening
   */
  isListening(): boolean {
    return this.#isListening;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.stop();
  }
}

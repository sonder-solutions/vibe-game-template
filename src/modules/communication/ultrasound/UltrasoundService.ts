/**
 * Ultrasound Service
 * Main orchestrator for ultrasound-based peer-to-peer communication
 * Uses DTMF multi-frequency encoding with Goertzel detection
 */

import type {
  IUltrasoundService,
  UltrasoundConfig,
  UltrasoundEvent,
  UltrasoundPeer,
  UltrasoundState,
} from '../../../services/interfaces/IUltrasoundService.js';
import { AudioContextManager } from './audio/AudioContextManager.js';
import { AudioTransmitter } from './audio/AudioTransmitter.js';
import { AudioReceiver } from './audio/AudioReceiver.js';
import { GoertzelDetector } from './signal/GoertzelDetector.js';
import { NoiseGate } from './signal/NoiseGate.js';
import { SymbolDecoder as SignalDecoder } from './signal/SymbolDecoder.js';
import { SymbolEncoder } from './modulation/SymbolEncoder.js';
import { SymbolDecoderData } from './modulation/SymbolDecoderData.js';
import { SymbolConfirmation } from './modulation/SymbolConfirmation.js';
import { FrameBuilder } from './protocol/FrameBuilder.js';
import { DeviceDiscovery } from './protocol/DeviceDiscovery.js';
import {
  DEFAULT_CONFIG,
  FREQUENCY_PLAN,
  getRxFrequencies,
  type DetectionResult,
} from './UltrasoundService.types.js';

export class UltrasoundService implements IUltrasoundService {
  #config: Required<Omit<UltrasoundConfig, 'deviceId' | 'audioInputId' | 'audioOutputId'>> & {
    deviceId?: string;
    audioInputId?: string;
    audioOutputId?: string;
  } = { ...DEFAULT_CONFIG };

  #state: UltrasoundState = 'idle';
  #initialized = false;

  // Audio components
  #audioCtxManager!: AudioContextManager;
  #transmitter!: AudioTransmitter;
  #receiver!: AudioReceiver;

  // Signal processing
  #goertzel!: GoertzelDetector;
  #noiseGate!: NoiseGate;
  #symbolDecoder!: SignalDecoder;

  // Modulation
  #symbolEncoder!: SymbolEncoder;
  #symbolDecoderData!: SymbolDecoderData;
  #symbolConfirmation!: SymbolConfirmation;

  // Protocol
  #frameBuilder!: FrameBuilder;
  #discovery!: DeviceDiscovery;

  // State
  #eventCallbacks: Array<(event: UltrasoundEvent) => void> = [];
  #decodeTimer: number | null = null;
  #symbolTimer: number | null = null;
  #receivingFrame = false;
  #receivedSymbols: number[] = [];

  async initialize(config?: UltrasoundConfig): Promise<void> {
    if (this.#initialized) {
      return;
    }

    // Merge config with defaults
    this.#config = { ...DEFAULT_CONFIG, ...config };

    // Generate device ID if not provided
    if (!this.#config.deviceId) {
      this.#config.deviceId = this.generateDeviceId();
    }

    // Initialize audio context
    this.#audioCtxManager = new AudioContextManager();
    const sampleRate = this.#audioCtxManager.getSampleRate();

    // Initialize audio components
    this.#transmitter = new AudioTransmitter(
      this.#audioCtxManager,
      this.#config.role,
      this.#config.txPower
    );
    this.#receiver = new AudioReceiver(this.#audioCtxManager, this.#config.audioInputId);

    // Initialize signal processing
    const rxFrequencies = getRxFrequencies(this.#config.role);
    this.#goertzel = new GoertzelDetector(sampleRate);
    this.#goertzel.initDetectors([FREQUENCY_PLAN.NOISE_BAND, ...rxFrequencies]);

    this.#noiseGate = new NoiseGate(
      this.#config.noiseFloorEstimationMs,
      this.#config.noiseGateMultiplier,
      sampleRate
    );

    this.#symbolDecoder = new SignalDecoder(this.#config.noiseGateMultiplier);

    // Initialize modulation
    this.#symbolEncoder = new SymbolEncoder();
    this.#symbolDecoderData = new SymbolDecoderData();
    this.#symbolConfirmation = new SymbolConfirmation(
      this.#config.confirmationCount,
      (symbol) => this.onSymbolConfirmed(symbol)
    );

    // Initialize protocol
    this.#frameBuilder = new FrameBuilder(this.#config.deviceId, this.#config.maxPayloadSize);
    this.#discovery = new DeviceDiscovery(
      this.#config.beaconInterval,
      () => this.broadcastDiscoveryBeacon()
    );

    this.#initialized = true;
    this.#state = 'idle';
  }

  isInitialized(): boolean {
    return this.#initialized;
  }

  getState(): UltrasoundState {
    return this.#state;
  }

  async startListening(): Promise<void> {
    if (!this.#initialized) {
      throw new Error('Service not initialized');
    }

    if (this.#state !== 'idle') {
      return;
    }

    await this.#receiver.start();
    this.#state = 'listening';
    this.startDecodeLoop();
    this.emitEvent({ type: 'state-changed', payload: { state: 'listening' } });
  }

  stopListening(): void {
    if (this.#state !== 'listening') {
      return;
    }

    this.#receiver.stop();
    this.stopDecodeLoop();
    this.#state = 'idle';
    this.emitEvent({ type: 'state-changed', payload: { state: 'idle' } });
  }

  async broadcast(message: string): Promise<void> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    await this.broadcastData(data);
  }

  async broadcastData(data: Uint8Array): Promise<void> {
    if (!this.#initialized) {
      throw new Error('Service not initialized');
    }

    // Build frame
    const frame = this.#frameBuilder.buildFrame(data);

    // Encode to symbols
    const symbols = this.#symbolEncoder.encode(frame);

    // Transmit symbols
    await this.transmitSymbols(symbols);
  }

  async sendTo(deviceId: string, data: Uint8Array): Promise<void> {
    // For now, broadcast to all (future: address specific peers)
    await this.broadcastData(data);
  }

  async startDiscovery(): Promise<void> {
    if (!this.#initialized) {
      throw new Error('Service not initialized');
    }

    this.#discovery.start();
    this.#state = 'discovering';
    this.emitEvent({ type: 'state-changed', payload: { state: 'discovering' } });
  }

  stopDiscovery(): void {
    this.#discovery.stop();
    if (this.#state === 'discovering') {
      this.#state = 'idle';
      this.emitEvent({ type: 'state-changed', payload: { state: 'idle' } });
    }
  }

  getPeers(): UltrasoundPeer[] {
    return this.#discovery.getPeers();
  }

  onEvent(callback: (event: UltrasoundEvent) => void): void {
    this.#eventCallbacks.push(callback);
  }

  offEvent(callback: (event: UltrasoundEvent) => void): void {
    const index = this.#eventCallbacks.indexOf(callback);
    if (index !== -1) {
      this.#eventCallbacks.splice(index, 1);
    }
  }

  async close(): Promise<void> {
    if (!this.#initialized) {
      return;
    }

    this.stopListening();
    this.stopDiscovery();
    this.#transmitter.dispose();
    this.#receiver.dispose();
    await this.#audioCtxManager.close();

    this.#initialized = false;
    this.#state = 'idle';
  }

  // Public methods for UI integration

  /**
   * Get internal state for visualization and monitoring
   */
  getInternalState(): {
    goertzelPowers: number[];
    noisePower: number;
    sampleRate: number;
    isListening: boolean;
    isTransmitting: boolean;
  } {
    if (!this.#initialized) {
      return {
        goertzelPowers: [],
        noisePower: 0,
        sampleRate: 0,
        isListening: false,
        isTransmitting: false,
      };
    }

    return {
      goertzelPowers: this.#goertzel.getAllPowers(),
      noisePower: this.#noiseGate.getNoisePower(),
      sampleRate: this.#audioCtxManager.getSampleRate(),
      isListening: this.#receiver.isListening(),
      isTransmitting: this.#transmitter.isTransmitting(),
    };
  }

  /**
   * Transmit a specific symbol (for UI control)
   */
  transmitSymbol(symbolIndex: number): void {
    if (!this.#initialized) {
      throw new Error('Service not initialized');
    }
    this.#transmitter.transmitSymbol(symbolIndex);
    this.#state = 'transmitting';
    this.emitEvent({ type: 'transmission-started', payload: { symbolIndex } });
  }

  /**
   * Stop transmission
   */
  stopTransmission(): void {
    if (!this.#initialized) {
      return;
    }
    this.#transmitter.stop();
    this.#state = this.#config.discovery ? 'discovering' : 'listening';
    this.emitEvent({ type: 'transmission-complete' });
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(config: Partial<UltrasoundConfig>): void {
    if (config.txPower !== undefined && this.#transmitter) {
      this.#transmitter.setPower(config.txPower);
    }
    if (config.symbolDuration !== undefined) {
      this.#config.symbolDuration = config.symbolDuration;
    }
    if (config.confirmationCount !== undefined) {
      this.#symbolConfirmation.setConfirmationCount(config.confirmationCount);
    }
    if (config.noiseGateMultiplier !== undefined) {
      this.#noiseGate.setConfig(config.noiseGateMultiplier);
      this.#symbolDecoder.setConfig(config.noiseGateMultiplier);
    }
  }

  // Private methods

  private async transmitSymbols(symbols: number[]): Promise<void> {
    this.#state = 'transmitting';
    this.emitEvent({ type: 'transmission-started', payload: { symbolCount: symbols.length } });

    for (const symbol of symbols) {
      this.#transmitter.transmitSymbol(symbol);
      await this.sleep(this.#config.symbolDuration);
    }

    this.#transmitter.stop();
    this.#state = this.#config.discovery ? 'discovering' : 'listening';
    this.emitEvent({ type: 'transmission-complete' });
  }

  private startDecodeLoop(): void {
    const bufferSize = this.#audioCtxManager.getAnalyser().fftSize;
    const buffer = new Float32Array(bufferSize);

    this.#decodeTimer = window.setInterval(() => {
      if (!this.#receiver.isListening()) {
        return;
      }

      // Get audio data
      this.#receiver.getTimeDomainData(buffer);

      // Process through Goertzel
      this.#goertzel.processBuffer(buffer);

      // Get powers for RX frequencies (indices 1, 2, 3 in goertzel array)
      const powers = this.#goertzel.getAllPowers();
      const noisePower = powers[0];
      const lowPower = powers[1];
      const midPower = powers[2];
      const highPower = powers[3];

      // Detect symbol
      const result = this.#symbolDecoder.detectSymbol(
        lowPower,
        midPower,
        highPower,
        noisePower
      );

      // Update confirmation tracker
      this.#symbolConfirmation.update(result.symbolIndex);
    }, 80); // Match the interval from the original implementation
  }

  private stopDecodeLoop(): void {
    if (this.#decodeTimer !== null) {
      window.clearInterval(this.#decodeTimer);
      this.#decodeTimer = null;
    }
  }

  private onSymbolConfirmed(symbol: number): void {
    this.#receivedSymbols.push(symbol);

    // Emit raw symbol event for real-time display (demo/testing mode)
    this.emitEvent({
      type: 'symbol-received',
      payload: {
        symbol,
        symbolName: this.getSymbolName(symbol),
        totalReceived: this.#receivedSymbols.length,
      },
    });

    // Also try to decode as structured frame (for data communication mode)
    this.tryDecodeFrame();
  }

  private getSymbolName(symbol: number): string {
    const symbols = ['0', '1', 'fn'];
    return symbol >= 0 && symbol < symbols.length ? symbols[symbol] : '?';
  }

  private tryDecodeFrame(): void {
    // Need at least 1 symbol for length byte
    if (this.#receivedSymbols.length < 4) {
      return;
    }

    // Decode symbols to bytes
    const data = this.#symbolDecoderData.decode(this.#receivedSymbols);

    // Check if we have enough for a frame
    if (data.length < 1) {
      return;
    }

    const payloadLength = data[0];
    const frameLength = 1 + 4 + payloadLength; // length + deviceId + payload

    if (data.length < frameLength) {
      return; // Wait for more symbols
    }

    // Extract frame
    const frameData = data.slice(0, frameLength);
    const parsed = this.#frameBuilder.parseFrame(frameData);

    if (parsed) {
      // Update peer
      const rssi = this.calculateRSSI();
      this.#discovery.updatePeer(parsed.deviceId, rssi);

      // Emit event
      const isText = this.isTextData(parsed.payload);
      this.emitEvent({
        type: isText ? 'message-received' : 'data-received',
        payload: {
          deviceId: parsed.deviceId,
          data: parsed.payload,
          message: isText ? new TextDecoder().decode(parsed.payload) : undefined,
        },
      });

      // Emit peer discovered if new
      const peer = this.#discovery.getPeer(parsed.deviceId);
      if (peer && peer.lastHeard === Date.now()) {
        this.emitEvent({ type: 'peer-discovered', payload: peer });
      }

      // Clear received symbols for next frame
      this.#receivedSymbols = [];
    }
  }

  private broadcastDiscoveryBeacon(): void {
    // Send a discovery beacon with device ID
    const beacon = new TextEncoder().encode(JSON.stringify({
      type: 'discovery',
      deviceId: this.#config.deviceId,
    }));
    this.broadcastData(beacon);
  }

  private calculateRSSI(): number {
    // Calculate relative signal strength from Goertzel powers
    const powers = this.#goertzel.getAllPowers();
    const totalSignal = powers[1] + powers[2] + powers[3];
    const noise = powers[0];

    if (noise === 0) return 1;
    const snr = totalSignal / noise;
    return Math.min(1, snr / 100);
  }

  private isTextData(data: Uint8Array): boolean {
    try {
      const text = new TextDecoder().decode(data);
      // Check if it's valid UTF-8 text
      return /^[\x20-\x7E\x09\x0A\x0D]*$/.test(text);
    } catch {
      return false;
    }
  }

  private emitEvent(event: UltrasoundEvent): void {
    for (const callback of this.#eventCallbacks) {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in ultrasound event callback:', error);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

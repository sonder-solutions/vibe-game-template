/**
 * Ultrasound Service Interface
 * Provides audio-based peer-to-peer communication using ultrasonic DTMF
 * Optional module - can be tree-shaken if not used
 *
 * Uses multi-frequency DTMF encoding with Goertzel detection and adaptive noise gating
 * Supports full-duplex communication with separate TX/RX frequency bands
 *
 * Use cases:
 * - Multi-device coordination in same physical space
 * - Proximity detection through audio signals
 * - Serverless device discovery and pairing
 */

export interface UltrasoundConfig {
  /**
   * Operating role for full-duplex communication
   * - 'master': TX on CH1 (17.0/17.5/18.0 kHz), RX on CH2 (18.5/19.0/19.5 kHz)
   * - 'slave': TX on CH2 (18.5/19.0/19.5 kHz), RX on CH1 (17.0/17.5/18.0 kHz)
   * Default: 'master'
   */
  role?: 'master' | 'slave';

  /**
   * Symbol duration in milliseconds
   * Longer = more robust but slower
   * Default: 250
   */
  symbolDuration?: number;

  /**
   * Transmission power (0-1)
   * Default: 0.35
   */
  txPower?: number;

  /**
   * Number of consecutive symbol detections required for confirmation
   * Higher = more reliable but slower
   * Default: 2
   */
  confirmationCount?: number;

  /**
   * Noise gate multiplier
   * Signal must exceed noise floor * this multiplier to be detected
   * Default: 8
   */
  noiseGateMultiplier?: number;

  /**
   * Enable device discovery beacons
   * Default: false
   */
  discovery?: boolean;

  /**
   * Beacon interval in milliseconds
   * Default: 2000
   */
  beaconInterval?: number;

  /**
   * Device ID for this node
   * Auto-generated UUID v4 if omitted
   */
  deviceId?: string;

  /**
   * Audio input device ID (microphone)
   * Uses default input if omitted
   */
  audioInputId?: string;

  /**
   * Audio output device ID (speaker)
   * Uses default output if omitted
   */
  audioOutputId?: string;

  /**
   * Maximum payload size in bytes
   * Default: 256
   */
  maxPayloadSize?: number;

  /**
   * Initial noise floor estimation period in milliseconds
   * Default: 500
   */
  noiseFloorEstimationMs?: number;
}

export interface UltrasoundPeer {
  /** Unique device identifier */
  deviceId: string;

  /**
   * Relative signal strength (0-1, not dBm)
   * Higher = closer/stronger signal
   */
  rssi: number;

  /** Timestamp of last received signal */
  lastHeard: number;

  /** Optional device metadata from discovery */
  metadata?: Record<string, unknown>;
}

export interface UltrasoundEvent {
  type:
    | 'peer-discovered'
    | 'peer-lost'
    | 'message-received'
    | 'data-received'
    | 'symbol-received'
    | 'transmission-started'
    | 'transmission-complete'
    | 'error'
    | 'state-changed';
  payload?: unknown;
}

export type UltrasoundState = 'idle' | 'listening' | 'transmitting' | 'discovering';

export interface IUltrasoundService {
  /**
   * Initialize the ultrasound service
   * Sets up audio context, requests mic permission, configures processing graph
   */
  initialize(config?: UltrasoundConfig): Promise<void>;

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean;

  /**
   * Get current operational state
   */
  getState(): UltrasoundState;

  /**
   * Start listening for incoming ultrasound signals
   */
  startListening(): Promise<void>;

  /**
   * Stop listening for incoming signals
   */
  stopListening(): void;

  /**
   * Broadcast a text message to all peers in range
   */
  broadcast(message: string): Promise<void>;

  /**
   * Broadcast binary data to all peers in range
   */
  broadcastData(data: Uint8Array): Promise<void>;

  /**
   * Send data to a specific peer
   */
  sendTo(deviceId: string, data: Uint8Array): Promise<void>;

  /**
   * Start device discovery (broadcast + listen for beacons)
   */
  startDiscovery(): Promise<void>;

  /**
   * Stop device discovery
   */
  stopDiscovery(): void;

  /**
   * Get currently known peers
   */
  getPeers(): UltrasoundPeer[];

  /**
   * Register event listener
   */
  onEvent(callback: (event: UltrasoundEvent) => void): void;

  /**
   * Remove event listener
   */
  offEvent(callback: (event: UltrasoundEvent) => void): void;

  /**
   * Close connection, release mic, cleanup audio graph
   */
  close(): Promise<void>;
}

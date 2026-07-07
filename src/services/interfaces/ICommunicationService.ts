/**
 * Communication Service Interface
 * Provides peer-to-peer communication capabilities
 * Optional module - can be tree-shaken if not used
 *
 * Implementations:
 * - WebRTC for direct peer-to-peer connections
 * - QR-based signaling for serverless negotiation
 */

export interface CommunicationConfig {
  /**
   * Communication mode
   * - 'webrtc': Direct WebRTC connection
   * - 'qr-signaling': QR code-based SDP exchange
   * - 'none': No communication
   */
  mode: 'webrtc' | 'qr-signaling' | 'none';

  /**
   * Media configuration
   */
  media?: {
    audio?: boolean;
    video?: boolean;
    chat?: boolean;
  };

  /**
   * ICE server configuration for WebRTC
   */
  iceServers?: RTCIceServer[];
}

export interface CommunicationEvent {
  type: 'connected' | 'disconnected' | 'error' | 'message' | 'data';
  payload?: unknown;
}

export interface ICommunicationService {
  /**
   * Initialize the communication service
   * @param config - Communication configuration
   */
  initialize(config: CommunicationConfig): Promise<void>;

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean;

  /**
   * Check if connected to peer
   */
  isConnected(): boolean;

  /**
   * Create an offer for peer connection
   * @returns Offer data (format depends on mode)
   */
  createOffer(): Promise<string>;

  /**
   * Handle received offer and create answer
   * @param offer - Offer data from remote peer
   * @returns Answer data
   */
  handleOffer(offer: string): Promise<string>;

  /**
   * Handle received answer to complete connection
   * @param answer - Answer data from remote peer
   */
  handleAnswer(answer: string): Promise<void>;

  /**
   * Send a message to connected peer
   * @param message - Message to send
   */
  sendMessage(message: string): Promise<void>;

  /**
   * Send data to connected peer
   * @param data - Data to send
   */
  sendData(data: ArrayBuffer | Uint8Array): Promise<void>;

  /**
   * Register event listener
   * @param callback - Event callback
   */
  onEvent(callback: (event: CommunicationEvent) => void): void;

  /**
   * Close connection and cleanup
   */
  close(): Promise<void>;
}

/**
 * Communication Module
 * Provides peer-to-peer communication capabilities
 *
 * Implementations:
 * - WebRTCService: Direct peer-to-peer connections
 * - UltrasoundService: Audio-based communication using ultrasonic DTMF
 */

export { WebRTCService } from './webrtc/WebRTCService';
export { UltrasoundService } from './ultrasound/UltrasoundService';

// Ultrasound types
export type {
  UltrasoundConfig,
  UltrasoundPeer,
  UltrasoundEvent,
  UltrasoundState,
} from './ultrasound/UltrasoundService.types';

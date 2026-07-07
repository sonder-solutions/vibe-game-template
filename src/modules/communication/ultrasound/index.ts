/**
 * Ultrasound Communication Module
 * Audio-based peer-to-peer communication using ultrasonic DTMF
 */

export { UltrasoundService } from './UltrasoundService.js';

// Types
export type {
  UltrasoundConfig,
  UltrasoundPeer,
  UltrasoundEvent,
  UltrasoundState,
} from './UltrasoundService.types.js';

export {
  FREQUENCY_PLAN,
  SYMBOLS,
  SYMBOL_PAIRS,
  DEFAULT_CONFIG,
} from './UltrasoundService.types.js';

// Internal components (for advanced usage)
export { AudioContextManager } from './audio/AudioContextManager.js';
export { AudioTransmitter } from './audio/AudioTransmitter.js';
export { AudioReceiver } from './audio/AudioReceiver.js';
export { GoertzelDetector } from './signal/GoertzelDetector.js';
export { NoiseGate } from './signal/NoiseGate.js';
export { SymbolEncoder } from './modulation/SymbolEncoder.js';
export { SymbolConfirmation } from './modulation/SymbolConfirmation.js';
export { FrameBuilder } from './protocol/FrameBuilder.js';
export { DeviceDiscovery } from './protocol/DeviceDiscovery.js';

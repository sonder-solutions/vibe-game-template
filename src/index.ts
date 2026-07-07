/**
 * Game Template SDK
 * Modular game engine with optional features
 *
 * All exports are named (not default) to enable tree-shaking.
 * Downstream bundlers will automatically remove unused code.
 */

// ============================================================================
// Core Engine (Always Available)
// ============================================================================

export type { IEngine } from './core/engine/IEngine';
export type { Sprite, GameState, EngineConfig, Vector2D } from './core/engine/types';

export { EngineFactory } from './core/engine/EngineFactory';
export { GameLoop } from './core/engine/GameLoop';
export { FallbackEngine } from './core/engine/FallbackEngine';
export { WebGPUEngine } from './core/engine/WebGPUEngine';
export { SpatialHashGrid } from './core/engine/SpatialHashGrid';
export { ResponsiveCanvas } from './core/engine/ResponsiveCanvas';

// ============================================================================
// Service Interfaces (Optional - Tree-Shakeable)
// ============================================================================

export type {
  ISecurityService,
  IQRService,
  ICommunicationService,
  CommunicationConfig,
  CommunicationEvent,
  IUltrasoundService,
  UltrasoundConfig,
  UltrasoundPeer,
  UltrasoundEvent,
  UltrasoundState
} from './services';

// ============================================================================
// Service Container (Optional - Tree-Shakeable)
// ============================================================================

export { ServiceContainer, container } from './services';

// ============================================================================
// Security Module (Optional - Tree-Shakeable)
// ============================================================================

export { CommunicationManager } from './modules/security/CommunicationManager';
export { CommandSystem } from './modules/security/CommandSystem';

// ============================================================================
// QR Module (Optional - Tree-Shakeable)
// ============================================================================

export { QArtGenerator } from './modules/qr/QArtGenerator';
export { QRScanner } from './modules/qr/QRScanner';
export { QRService } from './modules/qr/QRService';
export { FountainQREncoder, FountainQRDecoder } from './modules/qr/FountainQR';

export type {
  QArtOptions,
  ErrorCorrectionLevel,
  QRVersion,
  ImageTransform,
  QRGenerationResult,
  QRCapacity
} from './modules/qr/QArtGenerator.types';

export type {
  QRScannerOptions,
  QRScanResult,
  CameraInfo,
  ScanImageResult
} from './modules/qr/QRScanner';

export type {
  URFragment,
  UREncoderOptions,
  FountainProgress
} from './modules/qr/bc-ur';

// ============================================================================
// Communication Module (Optional - Tree-Shakeable)
// ============================================================================

export { WebRTCService, UltrasoundService } from './modules/communication';

// ============================================================================
// Input Module (Optional - Tree-Shakeable)
// ============================================================================

export { InputManager } from './modules/input';
export type {
  IInputManager,
  InputManagerConfig,
  InputDirection,
  InputEvent,
  InputAction,
  InputActionConfig,
  TouchPoint,
  SwipeEvent,
  PinchEvent,
  RotateEvent,
  ScrollEvent,
  InputState
} from './modules/input';

// ============================================================================
// Mobile Module (Optional - Tree-Shakeable)
// ============================================================================

export { MobileProtection } from './modules/mobile';
export type { IMobileProtection, MobileProtectionConfig } from './modules/mobile';

// ============================================================================
// Submission Module (Optional - Tree-Shakeable)
// ============================================================================

export { ScoreSubmissionModule } from './modules/submission';
export type { ScoreSubmissionConfig, ScoreData, SubmissionResult } from './modules/submission';

// ============================================================================
// UI Components (Optional - Tree-Shakeable)
// ============================================================================

export { ShareCard } from './ui/ShareCard';
export type { ShareCardConfig, ShareField, BackgroundConfig } from './ui/ShareCard';

// ============================================================================
// Initialization
// ============================================================================

console.log("Game Template SDK initialized");

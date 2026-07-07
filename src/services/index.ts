/**
 * Services Module
 * Central export point for all optional service interfaces
 *
 * These interfaces define contracts for optional features:
 * - Security (encryption, authentication, time management)
 * - QR code generation/scanning
 * - Peer-to-peer communication
 *
 * All services are optional and can be tree-shaken if not used.
 */

// Service interfaces
export type { ISecurityService } from './interfaces/ISecurityService';
export type { IQRService } from './interfaces/IQRService';
export type { ICommunicationService, CommunicationConfig, CommunicationEvent } from './interfaces/ICommunicationService';
export type {
  IUltrasoundService,
  UltrasoundConfig,
  UltrasoundPeer,
  UltrasoundEvent,
  UltrasoundState,
} from './interfaces/IUltrasoundService';

// Service container for dependency injection
export { ServiceContainer, container } from './container';

/**
 * QR Service Interface
 * Provides QR code generation and scanning capabilities
 * Optional module - can be tree-shaken if not used
 */

import type { QArtOptions, QRGenerationResult, QRCapacity } from '../../modules/qr/QArtGenerator.types';
import type { QRScannerOptions, QRScanResult, CameraInfo, ScanImageResult } from '../../modules/qr/QRScanner';

export interface IQRService {
  /**
   * Initialize the QR service (e.g., load WASM modules)
   */
  initialize(): Promise<void>;

  /**
   * Check if the service is initialized and ready
   */
  isInitialized(): boolean;

  // ========== QR Generation ==========

  /**
   * Generate a QR code with optional image embedding (QArt)
   * @param data - Data to encode in QR code
   * @param image - Optional image to embed
   * @param options - QR generation options
   * @returns Generation result with canvas
   */
  generateQR(
    data: string,
    image?: HTMLImageElement | string,
    options?: QArtOptions
  ): Promise<QRGenerationResult>;

  /**
   * Get data capacity for a QR code version and error correction level
   * @param version - QR version (1-40)
   * @param ecLevel - Error correction level
   * @returns Capacity in bytes
   */
  getDataCapacity(version: number, ecLevel: string): number;

  // ========== QR Scanning ==========

  /**
   * Check if camera is available
   * @returns True if camera is available
   */
  hasCamera(): Promise<boolean>;

  /**
   * List available cameras
   * @returns Array of camera info
   */
  listCameras(): Promise<CameraInfo[]>;

  /**
   * Scan QR code from an image
   * @param imageSource - Image URL or HTMLImageElement
   * @returns Scan result
   */
  scanImage(imageSource: string | HTMLImageElement): Promise<ScanImageResult>;

  /**
   * Start live QR scanning from video stream
   * @param videoElement - Video element to use for scanning
   * @param options - Scanner options
   * @returns Scanner instance (for stopping/cleanup)
   */
  startLiveScan(
    videoElement: HTMLVideoElement,
    options?: QRScannerOptions
  ): Promise<{ stop: () => void }>;
}

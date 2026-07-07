import { QArtGenerator } from './QArtGenerator';
import { QRScanner } from './QRScanner';
import type { QArtOptions, QRGenerationResult } from './QArtGenerator.types';
import type { QRScannerOptions, QRScanResult, CameraInfo, ScanImageResult } from './QRScanner';
import type { IQRService } from '../../services/interfaces/IQRService';

/**
 * QR Service Implementation
 * Unified interface for QR code generation and scanning
 */
export class QRService implements IQRService {
  #generator: QArtGenerator;
  #initialized = false;

  constructor() {
    this.#generator = new QArtGenerator();
  }

  async initialize(): Promise<void> {
    if (!this.#initialized) {
      // QArtGenerator initializes WASM on first use
      // We'll trigger initialization by calling a method
      try {
        await this.#generator.getDataCapacity(1, 'L');
        this.#initialized = true;
      } catch {
        // WASM might not be available in all environments
        this.#initialized = false;
      }
    }
  }

  isInitialized(): boolean {
    return this.#initialized;
  }

  async generateQR(
    data: string,
    image?: HTMLImageElement | string,
    options?: QArtOptions
  ): Promise<QRGenerationResult> {
    return this.#generator.generateQR(data, image, options);
  }

  getDataCapacity(version: number, ecLevel: string): number {
    return this.#generator.getDataCapacity(version, ecLevel as any);
  }

  async hasCamera(): Promise<boolean> {
    return QRScanner.hasCamera();
  }

  async listCameras(): Promise<CameraInfo[]> {
    return QRScanner.listCameras();
  }

  async scanImage(imageSource: string | HTMLImageElement): Promise<ScanImageResult> {
    return QRScanner.scanImage(imageSource);
  }

  async startLiveScan(
    videoElement: HTMLVideoElement,
    options?: QRScannerOptions
  ): Promise<{ stop: () => void }> {
    const scanner = new QRScanner(videoElement, options);
    await scanner.start();

    return {
      stop: () => scanner.stop()
    };
  }
}

import QrScanner from 'qr-scanner';

export interface QRScannerOptions {
  onDecode?: (result: QRScanResult) => void;
  onError?: (error: Error) => void;
  maxScansPerSecond?: number;
  preferredCamera?: string;
}

export interface QRScanResult {
  data: string;
  cornerPoints: Array<{ x: number; y: number }>;
}

export interface CameraInfo {
  id: string;
  label: string;
}

export type ScanImageResult =
  | { success: true; data: QRScanResult }
  | { success: false; error: 'no-qr-found' | 'invalid-image' | 'camera-error'; message: string };

export class QRScanner {
  private scanner: QrScanner;
  private videoElement: HTMLVideoElement;
  private onScanCallback?: (result: QRScanResult) => void;

  constructor(videoElement: HTMLVideoElement, options: QRScannerOptions = {}) {
    this.videoElement = videoElement;

    this.scanner = new QrScanner(
      videoElement,
      (result) => {
        if (this.onScanCallback) {
          this.onScanCallback({
            data: result.data,
            cornerPoints: result.cornerPoints
          });
        }
      },
      {
        maxScansPerSecond: options.maxScansPerSecond || 10,
        preferredCamera: options.preferredCamera || 'environment',
        onDecodeError: (error) => {
          if (options.onError) {
            options.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    );

    if (options.onDecode) {
      this.onScanCallback = options.onDecode;
    }
  }

  async start(): Promise<void> {
    await this.scanner.start();
  }

  stop(): void {
    this.scanner.stop();
  }

  static async hasCamera(): Promise<boolean> {
    return await QrScanner.hasCamera();
  }

  static async listCameras(): Promise<CameraInfo[]> {
    const cameras = await QrScanner.listCameras();
    return cameras.map(cam => ({
      id: cam.id,
      label: cam.label
    }));
  }

  async setCamera(cameraId: string): Promise<void> {
    await this.scanner.setCamera(cameraId);
  }

  async toggleFlash(): Promise<void> {
    if (await this.scanner.hasFlash()) {
      if (this.scanner.isFlashOn()) {
        await this.scanner.turnFlashOff();
      } else {
        await this.scanner.turnFlashOn();
      }
    }
  }

  isFlashOn(): boolean {
    return this.scanner.isFlashOn();
  }

  onScan(callback: (result: QRScanResult) => void): void {
    this.onScanCallback = callback;
  }

  static async scanImage(imageSource: string | HTMLImageElement): Promise<ScanImageResult> {
    try {
      const result = await QrScanner.scanImage(imageSource, {
        returnDetailedScanResult: true
      });
      return {
        success: true,
        data: {
          data: result.data,
          cornerPoints: result.cornerPoints
        }
      };
    } catch (error) {
      let errorType: 'no-qr-found' | 'invalid-image' | 'camera-error' = 'no-qr-found';
      let message = 'No QR code found in image';

      if (error instanceof Error) {
        if (error.message.includes('No QR code')) {
          errorType = 'no-qr-found';
          message = 'No QR code found in image';
        } else if (error.message.includes('Failed to load') || error.message.includes('Invalid')) {
          errorType = 'invalid-image';
          message = 'Failed to load image';
        } else {
          errorType = 'camera-error';
          message = error.message;
        }
      }

      return {
        success: false,
        error: errorType,
        message
      };
    }
  }

  destroy(): void {
    this.scanner.destroy();
  }
}

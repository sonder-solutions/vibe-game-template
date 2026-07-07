/**
 * QArt Generator Type Definitions
 * Type-safe interfaces for QArt QR code generation with interactive editing
 */

// QR Code error correction levels
export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

// QR Code versions (1-40, determines data capacity)
export type QRVersion = number; // 1-40

// Image position and scale for interactive editing
export interface ImageTransform {
  x: number; // Horizontal offset
  y: number; // Vertical offset
  scale: number; // Scale factor (1.0 = original size)
}

// Image filter types for QArt
export type ImageFilter = 'threshold' | 'color';

// QArt generation options
export interface QArtOptions {
  errorCorrectionLevel?: ErrorCorrectionLevel;
  qrVersion?: QRVersion; // QR version (1-40), determines size and capacity
  threshold?: number; // 0-255, threshold for image binarization
  fillColor?: string; // CSS color for QR modules
  backgroundColor?: string; // CSS color for background
  imageTransform?: ImageTransform; // Position and scale of embedded image
  moduleSize?: number; // Size of each QR module in pixels (for output)
  modulePixelSize?: number; // Pixels per module for QArt blending (default 3)
  filter?: ImageFilter; // Image filter type: 'threshold' or 'color'
  margin?: number; // Quiet zone margin in modules
  rand?: boolean; // Use random pixel selection instead of priority-based
  dither?: boolean; // Use dithering for better image quality
  onlyDataBits?: boolean; // Only use data bits, not check bits
}

// Default options
export const DEFAULT_QART_OPTIONS: Required<QArtOptions> = {
  errorCorrectionLevel: 'H', // High error correction for better image embedding
  qrVersion: 5, // Medium size QR code
  threshold: 128,
  fillColor: '#000000',
  backgroundColor: '#FFFFFF',
  imageTransform: { x: 0, y: 0, scale: 1.0 },
  moduleSize: 10,
  modulePixelSize: 3, // Each module is 3x3 pixels for QArt blending
  filter: 'threshold', // Use threshold filter for image blending
  margin: 4,
  rand: false, // Use priority-based pixel selection by default
  dither: false, // No dithering by default
  onlyDataBits: false // Use all bits (data + check) by default
};

// Result of QR generation
export interface QRGenerationResult {
  canvas: HTMLCanvasElement;
  qrVersion: number;
  moduleCount: number;
  dataCapacity: number;
}

// Image loading result
export interface ImageLoadResult {
  image: HTMLImageElement;
  width: number;
  height: number;
}

// QR Code module types
export enum QRModuleType {
  EMPTY = 0,
  DARK = 1,
  LIGHT = 2,
  FINDER_PATTERN = 3,
  TIMING_PATTERN = 4,
  ALIGNMENT_PATTERN = 5,
  FORMAT_INFO = 6,
  VERSION_INFO = 7,
  DATA = 8
}

// QR Matrix representation
export interface QRMatrix {
  moduleCount: number;
  modules: QRModuleType[][];
}

// Capabilities info for a QR version
export interface QRCapacity {
  version: number;
  moduleCount: number;
  dataCapacity: {
    numeric: number;
    alphanumeric: number;
    byte: number;
    kanji: number;
  };
  errorCorrectionCapacity: {
    L: number;
    M: number;
    Q: number;
    H: number;
  };
}

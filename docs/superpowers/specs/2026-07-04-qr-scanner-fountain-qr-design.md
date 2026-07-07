# QR Scanner & Fountain QR Code Integration Design

## Overview

This design document specifies the integration of QR code scanning and fountain QR code (animated paginated sequence) functionality into the existing QArt QR Code Generator.

**Date**: 2026-07-04
**Status**: Approved for Implementation

## Problem Statement

The current QArt QR Code Generator only supports QR code generation. Users need the ability to:
1. Scan QR codes using device cameras
2. Generate fountain QR codes for large data that exceeds single QR capacity
3. Scan and reassemble fountain QR code sequences

## Solution Architecture

### Phased Implementation

**Phase 1**: bc-ur Module (Blockchain Commons UR encoding/decoding with fountain codes)
**Phase 2**: QR Scanner Integration (Nimiq's qr-scanner library)
**Phase 3**: Fountain QR Integration (combine bc-ur with QR generation/scanning)
**Phase 4**: UI Integration (tab-based mode switching)

### Core Components

1. **bc-ur Module** (`src/engine/bc-ur/`)
   - UREncoder: Encodes data into UR fragments using fountain codes
   - URDecoder: Decodes UR fragments back into original data
   - FountainCode: Luby Transform implementation
   - CBOR utilities for data serialization

2. **QRScanner** (`src/engine/QRScanner.ts`)
   - Camera-based QR code scanning
   - Real-time frame processing
   - Callback-based results

3. **FountainQR** (`src/engine/FountainQR.ts`)
   - FountainQREncoder: Splits data → UR fragments → QR codes → animation
   - FountainQRDecoder: Scans QR sequence → reassembles UR fragments → returns data

4. **UI Layer** (`qr-code/`)
   - Mode tabs: Generate / Scan
   - Fountain QR controls with animation preview
   - Scanner interface with progress indicators

## Data Flow

### Generation Flow
```
User Input → Fragment Calculation → UR Encoding → QR Generation → Animation
```

### Scanning Flow
```
Camera Stream → QR Detection → UR Parsing → Fountain Decoding → Data Reassembly
```

## Technical Specifications

### Fragment Size Calculation

Fragment size is auto-calculated based on QR version:
- QR Version 1-20 capacity table
- Leave ~20 bytes for UR header
- Formula: `fragmentSize = capacity[version][ecLevel] - 20`

### Redundancy Calculation

Redundancy is based on error correction level:
- L (7% recovery): 1.2x fragments
- M (15% recovery): 1.5x fragments
- Q (25% recovery): 2.0x fragments
- H (30% recovery): 2.5x fragments

### UR Fragment Format

```
ur:<type>/<sequenceNumber>-<sequenceLength>/<cbor-data-hex>
```

Example:
```
ur:bytes/1-5/a1b2c3d4e5f6...
```

## API Design

### UREncoder

```typescript
class UREncoder {
  constructor(data: Uint8Array, options?: UREncoderOptions);
  nextPart(): URFragment;
  getFragmentCount(): number;
  reset(): void;
}
```

### URDecoder

```typescript
class URDecoder {
  receivePart(fragment: URFragment): boolean;
  getProgress(): number;
  getResult(): Uint8Array;
  isComplete(): boolean;
  reset(): void;
}
```

### QRScanner

```typescript
class QRScanner {
  constructor(videoElement: HTMLVideoElement, options?: QRScannerOptions);
  async start(): Promise<void>;
  stop(): void;
  onScan(callback: (result: QRScanResult) => void): void;
  destroy(): void;
}
```

### FountainQREncoder

```typescript
class FountainQREncoder {
  async generateFrames(
    data: string,
    qrVersion: number,
    ecLevel: ErrorCorrectionLevel
  ): Promise<HTMLCanvasElement[]>;
  getCurrentFrame(): HTMLCanvasElement;
  nextFrame(): HTMLCanvasElement;
  getProgress(): { current: number; total: number };
}
```

### FountainQRDecoder

```typescript
class FountainQRDecoder {
  async start(): Promise<void>;
  stop(): void;
  onProgress(callback: (progress: FountainProgress) => void): void;
  onComplete(callback: (data: string) => void): void;
  onFrame(callback: (frameNumber: number) => void): void;
}
```

## UI Integration

### Mode Switching

Tab-based interface at top of page:
- **Generate Mode**: Existing QArt controls + Fountain QR section
- **Scan Mode**: Camera interface + progress indicators + result display

### Fountain QR Controls

- Enable/disable fountain mode checkbox
- Animation preview canvas
- Progress indicator (current frame / total frames)
- Play/pause and restart buttons

### Scanner Interface

- Video element for camera feed
- Start/stop scanning buttons
- Camera switch button (front/back)
- Flash toggle button (if supported)
- Progress bar with percentage
- Frame counter (received / estimated)
- Result display with copy button

## Dependencies

```json
{
  "qr-scanner": "^1.4.2",
  "bc-ur": "^0.3.0",
  "cbor-x": "^1.5.0"
}
```

## Testing Strategy

### Unit Tests

- bc-ur encoding/decoding round-trips
- Partial reception (simulate dropped frames)
- Out-of-order reception
- Fragment size and redundancy calculations
- QR scanner with mocked camera

### Integration Tests

- End-to-end fountain QR generation and scanning
- Real camera testing (manual)
- Various data sizes and QR versions
- Different lighting conditions

### Manual Testing Checklist

- Generate with short text (< 50 chars)
- Generate with long text (> 500 chars)
- Scan fountain sequence successfully
- Handle partial frame loss
- Test camera switching and flash
- Verify progress indicators
- Test on mobile devices

## Browser Requirements

- HTTPS required for camera access (except localhost)
- WebRTC support
- ES2017+ support
- Modern browsers: Chrome, Firefox, Safari, Edge

## Success Criteria

- ✅ Generate animated fountain QR sequences
- ✅ Scan and reassemble fountain QR sequences
- ✅ Progress indicators update correctly
- ✅ Per-frame feedback (visual/audio)
- ✅ Animation loops correctly
- ✅ Mobile device compatibility
- ✅ Handles partial frame loss gracefully
- ✅ All tests pass
- ✅ No TypeScript or runtime errors

## Future Enhancements (Out of Scope)

- QR code history
- Export scanned data to file
- Batch scanning
- Custom UR types
- Share fountain QR via URL
- Integration with vCard, WiFi, etc.

## References

- [Nimiq QR Scanner](https://github.com/nimiq/qr-scanner)
- [Blockchain Commons Animated QRs](https://developer.blockchaincommons.com/animated-qrs/)
- [UR Specification](https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-001-uniform-resources.md)
- [Fountain Codes](https://divan.dev/posts/fountaincodes/)

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { QRScanner } from '../../src/modules/qr/QRScanner';

// jsdom does not implement Web Workers; qr-scanner creates one internally.
// Provide a minimal stub so the library doesn't throw unhandled rejections.
class MockWorker {
  postMessage() {}
  terminate() {}
  addEventListener() {}
  removeEventListener() {}
  onmessage: (() => void) | null = null;
  onerror: (() => void) | null = null;
}

beforeAll(() => {
  (globalThis as any).Worker = MockWorker;
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock';
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
});

describe('QRScanner', () => {
  it('should create scanner instance', () => {
    const video = document.createElement('video');
    const scanner = new QRScanner(video);

    expect(scanner).toBeDefined();
  });

  it('should set scan callback', () => {
    const video = document.createElement('video');
    const scanner = new QRScanner(video);
    const callback = vi.fn();

    scanner.onScan(callback);

    expect(scanner).toBeDefined();
  });

  it('should check if camera is available', async () => {
    const hasCamera = await QRScanner.hasCamera();
    expect(typeof hasCamera).toBe('boolean');
  });

  it('should list available cameras', async () => {
    const cameras = await QRScanner.listCameras();
    expect(Array.isArray(cameras)).toBe(true);
  });
});

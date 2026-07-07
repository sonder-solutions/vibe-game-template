import { describe, it, expect } from 'vitest';
import { FountainQREncoder, FountainQRDecoder } from '../src/modules/qr/FountainQR';

describe('FountainQR', () => {
  it('should create fountain QR encoder', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    expect(encoder).toBeDefined();
  });

  it('should calculate fragment size based on QR version', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const fragmentSize = encoder.calculateFragmentSize(5);
    expect(fragmentSize).toBeGreaterThan(0);
    expect(fragmentSize).toBeLessThan(100);
  });

  it('should calculate redundancy based on error correction', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const redundancy = encoder.calculateRedundancy('H');
    expect(redundancy).toBeGreaterThan(1);
  });

  it('should generate valid UR format frames', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const frames = await encoder.generateFrames('Test', 5, 'H');

    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).toMatch(/^ur:bytes\/\d+-\d+\/[0-9a-f]+$/);
  });

  it('should round-trip encode and decode', async () => {
    const original = 'Hello, Fountain QR!';
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const frames = await encoder.generateFrames(original, 5, 'H');

    const decoder = new FountainQRDecoder();
    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    // Get result via onComplete callback
    let result = '';
    const decoder2 = new FountainQRDecoder({
      onComplete: (data) => { result = data; }
    });
    for (const frame of frames) {
      decoder2.receiveFragment(frame);
    }

    expect(result).toBe(original);
  });

  it('should parse UR fragment correctly', () => {
    const decoder = new FountainQRDecoder();
    const urData = 'ur:bytes/1-5/48656c6c6f';

    const fragment = decoder.parseURFragment(urData);

    expect(fragment.type).toBe('bytes');
    expect(fragment.sequenceNumber).toBe(1);
    expect(fragment.sequenceLength).toBe(5);
    expect(new TextDecoder().decode(fragment.data)).toBe('Hello');
  });

  it('should throw error for invalid UR format', () => {
    const decoder = new FountainQRDecoder();

    expect(() => decoder.parseURFragment('invalid')).toThrow('Invalid UR fragment format');
  });

  it('should throw error for invalid hex in UR fragment', () => {
    const decoder = new FountainQRDecoder();

    expect(() => decoder.parseURFragment('ur:bytes/1-5/xyz')).toThrow('Invalid hex characters');
  });

  it('should throw error for odd-length hex in UR fragment', () => {
    const decoder = new FountainQRDecoder();

    expect(() => decoder.parseURFragment('ur:bytes/1-5/abc')).toThrow('Hex string must have even length');
  });

  it('should invoke callbacks correctly', async () => {
    const encoder = new FountainQREncoder({ qrVersion: 5, errorCorrectionLevel: 'H' });
    const frames = await encoder.generateFrames('Test', 5, 'H');

    let progressCalled = false;
    let frameCalled = false;
    let completeCalled = false;

    const decoder = new FountainQRDecoder({
      onProgress: () => { progressCalled = true; },
      onFrame: () => { frameCalled = true; },
      onComplete: () => { completeCalled = true; }
    });

    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    expect(progressCalled).toBe(true);
    expect(frameCalled).toBe(true);
    expect(completeCalled).toBe(true);
  });

  it('should reset decoder state', () => {
    const decoder = new FountainQRDecoder();

    decoder.receiveFragment('ur:bytes/1-1/48656c6c6f');
    decoder.reset();

    const progress = decoder.getProgress();
    expect(progress.receivedFragments).toBe(0);
  });

  it('should produce multiple frames with redundancy', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const data = 'A'.repeat(100);
    const frames = await encoder.generateFrames(data, 5, 'H');

    // With redundancy, we should have more frames than unique fragments
    expect(frames.length).toBeGreaterThan(1);
    // All frames should match UR format
    for (const frame of frames) {
      expect(frame).toMatch(/^ur:bytes\/\d+-\d+\/[0-9a-f]+$/);
    }
  });

  it('should handle empty-ish short data round-trip', async () => {
    const original = 'Hi';
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const frames = await encoder.generateFrames(original, 5, 'H');

    let result = '';
    const decoder = new FountainQRDecoder({
      onComplete: (data) => { result = data; }
    });
    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    expect(result).toBe(original);
  });

  it('should report progress as fragments are received', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const data = 'A'.repeat(100);
    const frames = await encoder.generateFrames(data, 5, 'H');

    const progressValues: number[] = [];
    const decoder = new FountainQRDecoder({
      onProgress: (p) => { progressValues.push(p.percentage); }
    });

    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    expect(progressValues.length).toBeLessThanOrEqual(frames.length);
    expect(progressValues.length).toBeGreaterThan(0);
    // Progress should be non-decreasing
    for (let i = 1; i < progressValues.length; i++) {
      expect(progressValues[i]).toBeGreaterThanOrEqual(progressValues[i - 1]);
    }
    // Final progress should be 100%
    expect(progressValues[progressValues.length - 1]).toBe(100);
  });

  it('should only fire onComplete once (Bug #2)', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const original = 'Hello, Fountain QR!';
    const frames = await encoder.generateFrames(original, 5, 'H');

    let completeCount = 0;
    const decoder = new FountainQRDecoder({
      onComplete: () => { completeCount++; }
    });

    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    // onComplete should fire exactly once, not once per remaining frame
    expect(completeCount).toBe(1);
  });

  it('should handle out-of-order fragments correctly (Bug #1+#3)', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const original = 'Out of order test!';
    const frames = await encoder.generateFrames(original, 5, 'H');

    // Shuffle frames to simulate out-of-order arrival
    const shuffled = [...frames].sort(() => Math.random() - 0.5);

    let result = '';
    const decoder = new FountainQRDecoder({
      onComplete: (data) => { result = data; }
    });

    for (const frame of shuffled) {
      decoder.receiveFragment(frame);
    }

    expect(result).toBe(original);
  });

  it('should not process fragments after completion (Bug #2)', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const original = 'Hello, Fountain QR!';
    const frames = await encoder.generateFrames(original, 5, 'H');

    let frameCount = 0;
    let completeCount = 0;
    const decoder = new FountainQRDecoder({
      onFrame: () => { frameCount++; },
      onComplete: () => { completeCount++; }
    });

    // Feed all frames once
    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    const countAfterFirstPass = frameCount;

    // Try to feed the same frames again — they should all be silently dropped
    // because the decoder is already complete.
    for (const frame of frames) {
      decoder.receiveFragment(frame);
    }

    // No additional frames should have been counted
    expect(frameCount).toBe(countAfterFirstPass);
    // onComplete should have fired exactly once
    expect(completeCount).toBe(1);
  });

  // ── Frame count display fix (29229 bug) ───────────────────────────────────

  it('should report the actual total frame count (not garbage from wrong byte offset)', async () => {
    // The original bug: when the scanner captured a non-first fragment first,
    // the decoder read bytes 4-5 of that fragment (which are *data bytes*, not
    // the frame count) and displayed them as the total — e.g. 29229.
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const original = 'https://example.com';
    const frames = await encoder.generateFrames(original, 5, 'H');
    const expectedTotal = frames.length;

    // Feed fragments in REVERSE order so the very first fragment the decoder
    // sees is definitely not the one that starts at data offset 0.
    const decoder = new FountainQRDecoder();
    for (let i = frames.length - 1; i >= 0; i--) {
      decoder.receiveFragment(frames[i]);
    }

    const progress = decoder.getProgress();
    // totalFrameCount and estimatedTotalFragments should both match the real
    // number of frames generated — NOT some garbage value read from data bytes.
    expect(progress.totalFrameCount).toBe(expectedTotal);
    expect(progress.estimatedTotalFragments).toBe(expectedTotal);
    // Sanity: the value should be a plausible frame count, not "29229".
    expect(expectedTotal).toBeLessThan(1000);
    expect(expectedTotal).toBeGreaterThan(0);
  });

  it('should show correct total frame count after receiving only a single (non-first) fragment', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const frames = await encoder.generateFrames('Some test data for frame count', 5, 'H');
    const expectedTotal = frames.length;

    const decoder = new FountainQRDecoder();
    // Feed just the LAST frame
    decoder.receiveFragment(frames[frames.length - 1]);

    const progress = decoder.getProgress();
    expect(progress.totalFrameCount).toBe(expectedTotal);
    expect(progress.estimatedTotalFragments).toBe(expectedTotal);
  });

  it('should carry the correct sequenceLength in every UR fragment header', async () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });

    const frames = await encoder.generateFrames('Hello World', 5, 'H');
    const expectedTotal = frames.length;

    // Every frame's UR string should advertise the SAME sequenceLength (= the
    // total frame count including redundancy).
    for (const frame of frames) {
      const match = frame.match(/^ur:bytes\/(\d+)-(\d+)\/(.+)$/);
      expect(match).not.toBeNull();
      const seqLen = parseInt(match![2], 10);
      expect(seqLen).toBe(expectedTotal);
    }
  });
});

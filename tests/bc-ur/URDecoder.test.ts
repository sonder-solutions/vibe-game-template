import { describe, it, expect } from 'vitest';
import { URDecoder } from '../../src/modules/qr/bc-ur/URDecoder';
import { UREncoder } from '../../src/modules/qr/bc-ur/UREncoder';
import type { URFragment } from '../../src/modules/qr/bc-ur/URTypes';

describe('URDecoder', () => {
  it('should decode UR fragments back to original data', () => {
    const original = new TextEncoder().encode('Hello, World!');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();

    // Encode all fragments
    const fragments: URFragment[] = [];
    for (let i = 0; i < encoder.getFragmentCount(); i++) {
      fragments.push(encoder.nextPart());
    }

    // Decode fragments
    for (const fragment of fragments) {
      decoder.receivePart(fragment);
    }

    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe('Hello, World!');
  });

  it('should report progress correctly', () => {
    const original = new TextEncoder().encode('Test data');
    const encoder = new UREncoder(original, { maxFragmentLength: 5 });
    const decoder = new URDecoder();

    const fragment = encoder.nextPart();
    decoder.receivePart(fragment);

    const progress = decoder.getProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should detect when decoding is complete', () => {
    const original = new TextEncoder().encode('Test');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();

    expect(decoder.isComplete()).toBe(false);

    const fragment = encoder.nextPart();
    decoder.receivePart(fragment);

    expect(decoder.isComplete()).toBe(true);
  });

  it('should reset decoder state', () => {
    const original = new TextEncoder().encode('Test');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();

    decoder.receivePart(encoder.nextPart());
    expect(decoder.isComplete()).toBe(true);

    decoder.reset();
    expect(decoder.isComplete()).toBe(false);
  });
});

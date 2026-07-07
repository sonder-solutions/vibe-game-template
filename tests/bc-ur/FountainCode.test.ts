import { describe, it, expect } from 'vitest';
import { FountainEncoder, FountainDecoder } from '../../src/modules/qr/bc-ur/FountainCode';

describe('FountainCode', () => {
  it('should encode data into fragments', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoder = new FountainEncoder(data, { maxFragmentLength: 3 });

    const fragment1 = encoder.nextPart();
    const fragment2 = encoder.nextPart();

    expect(fragment1).toBeInstanceOf(Uint8Array);
    expect(fragment2).toBeInstanceOf(Uint8Array);
    expect(fragment1.length).toBeLessThanOrEqual(3);
    expect(fragment2.length).toBeLessThanOrEqual(3);
  });

  it('should decode fragments back to original data', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 3 });
    const decoder = new FountainDecoder();

    // Encode all fragments
    const fragments: Uint8Array[] = [];
    for (let i = 0; i < 5; i++) {
      fragments.push(encoder.nextPart());
    }

    // Decode fragments
    for (const fragment of fragments) {
      decoder.receivePart(fragment);
    }

    const result = decoder.getResult();
    expect(result).toEqual(original);
  });

  it('should handle partial reception with fountain codes', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2 });
    const decoder = new FountainDecoder();

    // Generate more fragments than needed (fountain property)
    const fragments: Uint8Array[] = [];
    for (let i = 0; i < 10; i++) {
      fragments.push(encoder.nextPart());
    }

    // Receive only some fragments (simulate packet loss)
    decoder.receivePart(fragments[0]);
    decoder.receivePart(fragments[2]);
    decoder.receivePart(fragments[5]);
    decoder.receivePart(fragments[7]);
    decoder.receivePart(fragments[9]);

    const result = decoder.getResult();
    expect(result).toEqual(original);
  });

  it('should report progress correctly', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2 });
    const decoder = new FountainDecoder();

    const fragment1 = encoder.nextPart();
    decoder.receivePart(fragment1);

    const progress = decoder.getProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should detect when decoding is complete', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2 });
    const decoder = new FountainDecoder();

    expect(decoder.isComplete()).toBe(false);

    // Receive enough fragments
    for (let i = 0; i < 5; i++) {
      decoder.receivePart(encoder.nextPart());
    }

    expect(decoder.isComplete()).toBe(true);
  });
});

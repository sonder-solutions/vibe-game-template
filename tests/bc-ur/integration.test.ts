import { describe, it, expect } from 'vitest';
import { UREncoder, URDecoder } from '../../src/modules/qr/bc-ur';

describe('bc-ur Integration', () => {
  it('should encode and decode short text', () => {
    const original = 'Hello!';
    const data = new TextEncoder().encode(original);

    const encoder = new UREncoder(data, { maxFragmentLength: 10 });
    const decoder = new URDecoder();

    // Encode all fragments
    const fragmentCount = encoder.getFragmentCount();
    for (let i = 0; i < fragmentCount; i++) {
      const fragment = encoder.nextPart();
      decoder.receivePart(fragment);
    }

    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });

  it('should encode and decode long text', () => {
    const original = 'A'.repeat(500);
    const data = new TextEncoder().encode(original);

    const encoder = new UREncoder(data, { maxFragmentLength: 50 });
    const decoder = new URDecoder();

    const fragmentCount = encoder.getFragmentCount();
    for (let i = 0; i < fragmentCount; i++) {
      decoder.receivePart(encoder.nextPart());
    }

    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });

  it('should handle special characters', () => {
    const original = 'Hello 世界 🌍 Special: !@#$%^&*()';
    const data = new TextEncoder().encode(original);

    const encoder = new UREncoder(data, { maxFragmentLength: 20 });
    const decoder = new URDecoder();

    for (let i = 0; i < encoder.getFragmentCount(); i++) {
      decoder.receivePart(encoder.nextPart());
    }

    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });
});

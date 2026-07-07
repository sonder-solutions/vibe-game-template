import { describe, it, expect } from 'vitest';
import { UREncoder } from '../../src/modules/qr/bc-ur/UREncoder';
import type { URFragment } from '../../src/modules/qr/bc-ur/URTypes';

describe('UREncoder', () => {
  it('should encode string data into UR fragments', () => {
    const data = new TextEncoder().encode('Hello, World!');
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });

    const fragment = encoder.nextPart();

    expect(fragment.type).toBe('bytes');
    expect(fragment.sequenceNumber).toBe(1);
    expect(fragment.sequenceLength).toBeGreaterThan(0);
    expect(fragment.data).toBeInstanceOf(Uint8Array);
  });

  it('should generate multiple fragments for large data', () => {
    const data = new TextEncoder().encode('A'.repeat(100));
    const encoder = new UREncoder(data, { maxFragmentLength: 20 });

    const fragment1 = encoder.nextPart();
    const fragment2 = encoder.nextPart();
    const fragment3 = encoder.nextPart();

    expect(fragment1.sequenceNumber).toBe(1);
    expect(fragment2.sequenceNumber).toBe(2);
    expect(fragment3.sequenceNumber).toBe(3);
  });

  it('should report correct fragment count', () => {
    const data = new TextEncoder().encode('A'.repeat(50));
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });

    const count = encoder.getFragmentCount();
    expect(count).toBe(5);
  });

  it('should reset encoder state', () => {
    const data = new TextEncoder().encode('Test');
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });

    encoder.nextPart();
    encoder.nextPart();
    encoder.reset();

    const fragment = encoder.nextPart();
    expect(fragment.sequenceNumber).toBe(1);
  });
});

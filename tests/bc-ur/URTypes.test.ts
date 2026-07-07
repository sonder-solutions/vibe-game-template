import { describe, it, expect } from 'vitest';
import type { URFragment, UREncoderOptions, FountainProgress } from '../../src/modules/qr/bc-ur/URTypes';

describe('URTypes', () => {
  it('should define URFragment type correctly', () => {
    const fragment: URFragment = {
      type: 'bytes',
      sequenceNumber: 1,
      sequenceLength: 5,
      data: new Uint8Array([1, 2, 3, 4])
    };

    expect(fragment.type).toBe('bytes');
    expect(fragment.sequenceNumber).toBe(1);
    expect(fragment.sequenceLength).toBe(5);
    expect(fragment.data).toBeInstanceOf(Uint8Array);
  });

  it('should define UREncoderOptions type correctly', () => {
    const options: UREncoderOptions = {
      maxFragmentLength: 100,
      firstSequenceNumber: 1,
      minSequenceLength: 5
    };

    expect(options.maxFragmentLength).toBe(100);
    expect(options.firstSequenceNumber).toBe(1);
    expect(options.minSequenceLength).toBe(5);
  });

  it('should define FountainProgress type correctly', () => {
    const progress: FountainProgress = {
      receivedFragments: 3,
      estimatedTotalFragments: 5,
      percentage: 60,
      isComplete: false
    };

    expect(progress.receivedFragments).toBe(3);
    expect(progress.percentage).toBe(60);
    expect(progress.isComplete).toBe(false);
  });
});

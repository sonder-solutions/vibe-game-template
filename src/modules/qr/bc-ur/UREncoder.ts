import type { URFragment, UREncoderOptions } from './URTypes';
import { FountainEncoder } from './FountainCode';

export class UREncoder {
  private fountainEncoder: FountainEncoder;
  private type: string = 'bytes';
  private sequenceLength: number;
  private currentSequence: number = 0;

  constructor(data: Uint8Array, options: UREncoderOptions = {}) {
    const maxFragmentLength = options.maxFragmentLength || 100;
    this.fountainEncoder = new FountainEncoder(data, {
      maxFragmentLength,
      sequenceLength: options.sequenceLength
    });
    // Use the explicit override when provided; otherwise derive from the
    // padded data length as before.
    this.sequenceLength = options.sequenceLength
      ?? this.fountainEncoder.getFragmentCount();
  }

  nextPart(): URFragment {
    const fragmentData = this.fountainEncoder.nextPart();
    this.currentSequence++;

    return {
      type: this.type,
      sequenceNumber: this.currentSequence,
      sequenceLength: this.sequenceLength,
      data: fragmentData
    };
  }

  getFragmentCount(): number {
    return this.sequenceLength;
  }

  reset(): void {
    this.fountainEncoder.reset();
    this.currentSequence = 0;
  }
}

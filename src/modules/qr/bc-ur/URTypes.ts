export interface URFragment {
  type: string;
  sequenceNumber: number;
  sequenceLength: number;
  data: Uint8Array;
}

export interface UREncoderOptions {
  maxFragmentLength?: number;
  firstSequenceNumber?: number;
  minSequenceLength?: number;
  /**
   * Override the sequence length advertised in each UR fragment.
   * When set, the encoder emits exactly this many fragments (padding
   * the underlying data if needed).  This lets FountainQREncoder tell
   * the decoder the *actual* total frame count (including redundancy)
   * instead of only the minimum fragments required.
   */
  sequenceLength?: number;
}

export interface FountainProgress {
  receivedFragments: number;
  estimatedTotalFragments: number;
  totalFrameCount?: number;
  percentage: number;
  isComplete: boolean;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

import { UREncoder, URDecoder } from './bc-ur';
import type { URFragment, ErrorCorrectionLevel, FountainProgress } from './bc-ur';

const QR_CAPACITY: Record<number, Record<ErrorCorrectionLevel, number>> = {
  1: { L: 17, M: 14, Q: 11, H: 7 },
  2: { L: 32, M: 26, Q: 20, H: 14 },
  3: { L: 53, M: 42, Q: 32, H: 24 },
  4: { L: 78, M: 62, Q: 46, H: 34 },
  5: { L: 106, M: 84, Q: 60, H: 44 },
  6: { L: 134, M: 106, Q: 74, H: 58 },
  7: { L: 154, M: 122, Q: 86, H: 64 },
  8: { L: 192, M: 152, Q: 108, H: 84 },
  9: { L: 230, M: 180, Q: 130, H: 98 },
  10: { L: 271, M: 213, Q: 151, H: 119 },
  11: { L: 321, M: 251, Q: 177, H: 137 },
  12: { L: 367, M: 287, Q: 203, H: 155 },
  13: { L: 425, M: 331, Q: 241, H: 177 },
  14: { L: 458, M: 362, Q: 258, H: 194 },
  15: { L: 520, M: 412, Q: 292, H: 220 },
  16: { L: 586, M: 450, Q: 322, H: 250 },
  17: { L: 644, M: 504, Q: 364, H: 280 },
  18: { L: 718, M: 560, Q: 394, H: 310 },
  19: { L: 792, M: 624, Q: 442, H: 338 },
  20: { L: 858, M: 666, Q: 482, H: 382 }
};

const REDUNDANCY_MAP: Record<ErrorCorrectionLevel, number> = {
  L: 1.2,
  M: 1.5,
  Q: 2.0,
  H: 2.5
};

export interface FountainQREncoderOptions {
  qrVersion?: number;
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

export class FountainQREncoder {
  private qrVersion: number;
  private ecLevel: ErrorCorrectionLevel;
  private totalFrameCount: number = 0;

  constructor(options: FountainQREncoderOptions = {}) {
    this.qrVersion = options.qrVersion || 5;
    this.ecLevel = options.errorCorrectionLevel || 'H';
  }

  calculateFragmentSize(qrVersion: number): number {
    const capacity = QR_CAPACITY[qrVersion]?.[this.ecLevel] || 50;
    return Math.max(20, capacity - 20);
  }

  calculateRedundancy(ecLevel: ErrorCorrectionLevel): number {
    return REDUNDANCY_MAP[ecLevel] || 1.5;
  }

  async generateFrames(
    data: string,
    qrVersion: number,
    ecLevel: ErrorCorrectionLevel
  ): Promise<string[]> {
    const rawData = new TextEncoder().encode(data);

    // Build 6-byte header: 4 bytes data length (big-endian) + 2 bytes total
    // frame count (big-endian). The frame count is filled in after we know how
    // many fragments will be generated.
    const header = new Uint8Array(6);
    const headerView = new DataView(header.buffer);
    headerView.setUint32(0, rawData.length, false);

    // We need to figure out the total frame count (including redundancy) so
    // that we can write it into the header AND pass it to the UREncoder as the
    // advertised sequenceLength.  The size of the payload is fixed once we
    // decide on the padding: the UREncoder pads to `sequenceLength ×
    // fragmentSize` bytes, so we first compute the base fragment count for the
    // un-padded payload (header + data), then apply redundancy, then pad.
    const basePayload = new Uint8Array(6 + rawData.length);
    basePayload.set(header, 0);
    basePayload.set(rawData, 6);

    const fragmentSize = this.calculateFragmentSize(qrVersion);
    const baseEncoder = new UREncoder(basePayload, { maxFragmentLength: fragmentSize });
    const fragmentCount = Math.ceil(baseEncoder.getFragmentCount() * this.calculateRedundancy(ecLevel));

    // Write the actual total frame count into the header
    headerView.setUint16(4, fragmentCount, false);

    // Re-build the payload with the correct frame count in the header.
    // Do NOT pad here — the UREncoder will pad to exactly
    // fragmentCount × fragmentSize bytes when sequenceLength is given.
    const payload = new Uint8Array(6 + rawData.length);
    payload.set(header, 0);
    payload.set(rawData, 6);

    // Create a final encoder that advertises `fragmentCount` as the sequence
    // length.  The UREncoder (and the underlying FountainEncoder) will pad the
    // data to fragmentCount × fragmentSize bytes so that the UR fragment
    // header "seqLen" field carries the real total — this is what the decoder
    // reads to display the frame count, and also ensures the fountain decoder
    // allocates a large enough reconstruction buffer.
    const finalEncoder = new UREncoder(payload, {
      maxFragmentLength: fragmentSize,
      sequenceLength: fragmentCount
    });

    this.totalFrameCount = fragmentCount;
    const frames: string[] = [];

    // The payload length (header + raw data) — this is what the fountain
    // decoder will reconstruct before the header is stripped.  We attach
    // this as `originalDataLength` metadata on each UR fragment so the
    // decoder can trim any zero-padding added by the FountainEncoder.
    const payloadLen = payload.length;

    for (let i = 0; i < fragmentCount; i++) {
      const fragment = finalEncoder.nextPart();
      // The FountainEncoder sets originalDataLength = payloadLen on the
      // Uint8Array, but this property is lost during UR string serialization.
      // We re-attach it so that the FountainQRDecoder (which recreates the
      // Uint8Array from hex) can pass it through to the FountainDecoder.
      (fragment.data as any).originalDataLength = payloadLen;
      const urString = this.encodeURFragment(fragment);
      frames.push(urString);
    }

    return frames;
  }

  getTotalFrameCount(): number {
    return this.totalFrameCount;
  }

  private encodeURFragment(fragment: URFragment): string {
    const dataHex = Array.from(fragment.data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return `ur:${fragment.type}/${fragment.sequenceNumber}-${fragment.sequenceLength}/${dataHex}`;
  }
}

export interface FountainQRDecoderOptions {
  onProgress?: (progress: FountainProgress) => void;
  onComplete?: (data: string) => void;
  onFrame?: (frameNumber: number) => void;
}

export class FountainQRDecoder {
  private urDecoder: URDecoder;
  private onProgressCallback?: (progress: FountainProgress) => void;
  private onCompleteCallback?: (data: string) => void;
  private onFrameCallback?: (frameNumber: number) => void;
  private frameCount: number = 0;
  private seenSequences = new Set<number>();
  private totalSequenceLength: number | null = null;

  constructor(options: FountainQRDecoderOptions = {}) {
    this.urDecoder = new URDecoder();
    this.onProgressCallback = options.onProgress;
    this.onCompleteCallback = options.onComplete;
    this.onFrameCallback = options.onFrame;
  }

  receiveFragment(urData: string): void {
    // Early return if already complete (prevents multiple onComplete calls)
    if (this.urDecoder.isComplete()) {
      return;
    }

    const fragment = this.parseURFragment(urData);

    // Track the sequence length from the first fragment (before duplicate check
    // so it's set even if first fragment is a duplicate — fixes Bug #5).
    //
    // The encoder now sets sequenceLength = totalFrameCount (including
    // redundancy) via the UREncoder sequenceLength override, so this value
    // is the actual total frame count that was generated.  It is carried in
    // every UR fragment's header and is therefore reliable regardless of
    // which fragment the scanner captures first.
    if (this.totalSequenceLength === null) {
      this.totalSequenceLength = fragment.sequenceLength;
    }

    // Skip duplicate fragments
    if (this.seenSequences.has(fragment.sequenceNumber)) {
      return;
    }
    this.seenSequences.add(fragment.sequenceNumber);

    // Bridge UR fragment metadata to fountain decoder. The fountain decoder
    // reads seqNum/totalLength from properties on the Uint8Array, but these
    // are lost during UR string serialization. Reconstruct them from the
    // parsed UR fragment header.
    //
    // totalLength = fragmentSize × sequenceLength gives the total fountain
    // data size (including the 6-byte length/frame-count header prepended by
    // generateFrames). The FountainDecoder needs this to allocate its
    // reconstruction buffer. The original data length is later recovered
    // from the header after reconstruction completes.
    (fragment.data as any).seqNum = fragment.sequenceNumber - 1;
    (fragment.data as any).totalLength = fragment.data.length * fragment.sequenceLength;
    // The FountainEncoder attached `originalDataLength` before the UR string
    // serialization, but it was lost in the hex round-trip.  Re-attach it
    // here: the payload length equals totalLength (no extra trimming at the
    // fountain layer — FountainQRDecoder strips the 6-byte header itself).
    (fragment.data as any).originalDataLength = fragment.data.length * fragment.sequenceLength;

    const isComplete = this.urDecoder.receivePart(fragment);

    this.frameCount++;

    if (this.onFrameCallback) {
      this.onFrameCallback(this.frameCount);
    }

    const progress = this.getProgress();
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }

    if (isComplete && this.onCompleteCallback) {
      const result = this.urDecoder.getResult();

      // Strip the 6-byte header (4 bytes data length + 2 bytes total frame count)
      // prepended by generateFrames
      if (result.length < 6) {
        this.onCompleteCallback('');
        return;
      }

      const view = new DataView(result.buffer, result.byteOffset, result.byteLength);
      const dataLength = view.getUint32(0, false); // big-endian

      if (result.length < 6 + dataLength) {
        this.onCompleteCallback('');
        return;
      }

      const dataBytes = result.slice(6, 6 + dataLength);
      const data = new TextDecoder().decode(dataBytes);
      this.onCompleteCallback(data);
    }
  }

  parseURFragment(urData: string): URFragment {
    const match = urData.match(/^ur:([^\/]+)\/(\d+)-(\d+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid UR fragment format');
    }

    const [, type, seqNum, seqLen, dataHex] = match;

    // Validate hex
    if (!/^[0-9a-fA-F]*$/.test(dataHex)) {
      throw new Error('Invalid hex characters in UR fragment');
    }
    if (dataHex.length % 2 !== 0) {
      throw new Error('Hex string must have even length');
    }

    const data = new Uint8Array(dataHex.length / 2);
    for (let i = 0; i < dataHex.length; i += 2) {
      data[i / 2] = parseInt(dataHex.substring(i, i + 2), 16);
    }

    return {
      type,
      sequenceNumber: parseInt(seqNum, 10),
      sequenceLength: parseInt(seqLen, 10),
      data
    };
  }

  getProgress(): FountainProgress {
    const progress = this.urDecoder.getProgress();

    // Use the sequence length from the UR fragment header as the total frame
    // count. The encoder now sets sequenceLength = actual total frame count
    // (including redundancy) via the UREncoder sequenceLength override, so
    // the UI can show the real number of frames generated (e.g. "35/35").
    // Falls back to estimating from coverage when no fragment has been
    // received yet.
    const estimatedTotal = this.totalSequenceLength !== null
      ? this.totalSequenceLength
      : Math.ceil(this.frameCount / Math.max(progress, 0.1));

    return {
      receivedFragments: this.frameCount,
      estimatedTotalFragments: estimatedTotal,
      totalFrameCount: this.totalSequenceLength ?? undefined,
      percentage: Math.round(progress * 100),
      isComplete: this.urDecoder.isComplete()
    };
  }

  reset(): void {
    this.urDecoder.reset();
    this.frameCount = 0;
    this.seenSequences.clear();
    this.totalSequenceLength = null;
  }
}

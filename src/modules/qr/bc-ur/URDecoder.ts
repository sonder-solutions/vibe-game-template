import type { URFragment } from './URTypes';
import { FountainDecoder } from './FountainCode';

export class URDecoder {
  private fountainDecoder: FountainDecoder;
  private complete: boolean = false;

  constructor() {
    this.fountainDecoder = new FountainDecoder();
  }

  receivePart(fragment: URFragment): boolean {
    if (this.complete) return true;

    // Forward the original-data-length metadata (set by the FountainEncoder
    // before the data crossed the UR string boundary) so that the fountain
    // decoder can trim zero-padding after reconstruction.
    //
    // The FountainQRDecoder re-attaches this property on the parsed
    // Uint8Array before calling receivePart, so for fountain QR scans the
    // value flows through correctly.  For direct (non-UR) usage the
    // property rides along on the Uint8Array as an ad-hoc property.
    (fragment.data as any).originalDataLength =
      (fragment.data as any).originalDataLength ?? 0;

    const isComplete = this.fountainDecoder.receivePart(fragment.data);
    if (isComplete) {
      this.complete = true;
    }

    return this.complete;
  }

  getProgress(): number {
    return this.fountainDecoder.getProgress();
  }

  getEstimatedFragmentsRemaining(): number {
    const progress = this.getProgress();
    if (progress >= 1) return 0;
    return Math.ceil((1 - progress) * 10);
  }

  getResult(): Uint8Array {
    if (!this.complete) {
      throw new Error('Decoding not complete');
    }
    return this.fountainDecoder.getResult();
  }

  isComplete(): boolean {
    return this.complete;
  }

  reset(): void {
    this.fountainDecoder.reset();
    this.complete = false;
  }
}

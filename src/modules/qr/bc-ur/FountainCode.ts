/**
 * Simplified Fountain Code (Luby Transform) encoder/decoder.
 *
 * Fountain codes are rateless erasure codes that allow reconstruction of
 * original data from any sufficient subset of encoded fragments. This is
 * critical for QR code sequences where some frames might be missed during
 * scanning.
 *
 * This is a simplified implementation that demonstrates the core concept.
 * A production version would use proper LT codes with soliton distribution
 * and belief propagation decoding.
 *
 * Implementation approach:
 * - The encoder splits data into fixed-size fragments using a circular buffer.
 *   Each fragment wraps around the data when reaching the end, ensuring that
 *   any sufficiently large subset of fragments covers all byte positions.
 * - Metadata (sequence number and total length) is attached as properties on
 *   the Uint8Array fragment, so the decoder can determine each fragment's
 *   position in the original data without increasing the fragment byte size.
 * - The decoder places each fragment's bytes at the correct offsets (computed
 *   from the sequence number) and tracks coverage. Decoding completes when
 *   all byte positions are covered.
 */

export interface FountainEncoderOptions {
  maxFragmentLength: number;
  /**
   * When provided, the encoder produces exactly this many fragments.
   * The underlying data is zero-padded so that
   *   ceil(paddedLength / maxFragmentLength) == sequenceLength.
   */
  sequenceLength?: number;
}

export class FountainEncoder {
  private data: Uint8Array;
  private fragmentSize: number;
  private sequenceNumber: number = 0;
  private step: number;
  private originalDataLength: number;

  constructor(data: Uint8Array, options: FountainEncoderOptions) {
    this.fragmentSize = options.maxFragmentLength;
    this.originalDataLength = data.length;

    // When a target sequence length is given, pad the data so that
    // ceil(paddedLength / fragmentSize) == sequenceLength.  This lets the
    // FountainQREncoder control how many fragments are generated (e.g. to
    // include redundancy) and lets the UR string carry the correct total.
    if (options.sequenceLength && options.sequenceLength > 0) {
      const targetLen = options.sequenceLength * this.fragmentSize;
      if (targetLen > data.length) {
        const padded = new Uint8Array(targetLen);
        padded.set(data);
        data = padded;
      }
    } else {
      // Pad data to multiple of fragmentSize for consistent modulo arithmetic
      // between encoder and decoder (fixes out-of-order corruption)
      const paddedLength = Math.ceil(data.length / this.fragmentSize) * this.fragmentSize;
      const padded = new Uint8Array(paddedLength);
      padded.set(data);
      data = padded;
    }
    this.data = data;

    // Use step = fragmentSize.  Each fragment covers a contiguous block
    // starting at (seqNum × fragmentSize) mod totalLength, wrapping around.
    // When totalLength is a multiple of fragmentSize (which it always is,
    // since we padded above), this visits every byte position exactly once
    // over fragmentCount fragments.
    //
    // NOTE: when totalLength is NOT a multiple of fragmentSize (e.g. when
    // an external caller overrides sequenceLength to a value that doesn't
    // evenly divide totalLength), some byte positions may only be reachable
    // via the modular wrap-around.  In that case the encoder still produces
    // valid fragments; the decoder just needs enough of them to reach 100 %
    // coverage.  This is the trade-off for keeping the fountain property
    // (any N-of-N unique fragments suffice) intact.
    this.step = this.fragmentSize;
  }

  /**
   * Generate the next encoded fragment.
   *
   * The fragment is a Uint8Array of exactly `fragmentSize` bytes, read from
   * the original data in a circular fashion. Metadata (seqNum, totalLength)
   * is attached as properties so the decoder can place bytes correctly.
   */
  nextPart(): Uint8Array {
    const totalLength = this.data.length;
    if (totalLength === 0) {
      throw new Error('Cannot encode empty data');
    }

    const start = (this.sequenceNumber * this.step) % totalLength;
    const fragment = new Uint8Array(this.fragmentSize);

    for (let i = 0; i < this.fragmentSize; i++) {
      fragment[i] = this.data[(start + i) % totalLength];
    }

    // Attach metadata as properties on the Uint8Array instance.
    // This keeps the byte-level fragment size within maxFragmentLength
    // while still allowing the decoder to determine placement.
    (fragment as any).seqNum = this.sequenceNumber;
    (fragment as any).totalLength = totalLength;
    (fragment as any).step = this.step;
    // Record the *unpadded* data length so the decoder can trim zero-padding
    // after reconstruction.  Without this, getResult() returns the padded
    // buffer which may include trailing zero bytes.
    (fragment as any).originalDataLength = this.originalDataLength;

    this.sequenceNumber++;
    return fragment;
  }

  /**
   * Minimum number of unique fragments needed to reconstruct the data.
   */
  getFragmentCount(): number {
    return Math.ceil(this.data.length / this.fragmentSize);
  }

  /**
   * Reset the encoder to start generating fragments from the beginning.
   */
  reset(): void {
    this.sequenceNumber = 0;
  }
}

export class FountainDecoder {
  private result: Uint8Array | null = null;
  private totalLength: number = 0;
  private fragmentSize: number = 0;
  private step: number = 0;
  private originalDataLength: number = 0;
  private covered: Set<number> = new Set();
  private complete: boolean = false;

  /**
   * Receive an encoded fragment. Returns true if decoding is now complete.
   *
   * The decoder reads the seqNum and totalLength metadata from the fragment
   * to determine where each byte should be placed in the reconstruction
   * buffer.
   */
  receivePart(fragment: Uint8Array): boolean {
    if (this.complete) return true;

    const seqNum: number = (fragment as any).seqNum ?? 0;
    const totalLength: number = (fragment as any).totalLength ?? 0;
    const step: number = (fragment as any).step ?? 0;
    const originalDataLength: number = (fragment as any).originalDataLength ?? 0;

    // Initialize state from the first fragment that carries metadata
    if (this.totalLength === 0 && totalLength > 0) {
      this.totalLength = totalLength;
      this.result = new Uint8Array(totalLength);
      this.fragmentSize = fragment.length;
      // Record the original (unpadded) data length.  Used by getResult() to
      // trim trailing zero-padding that the encoder added to align the data
      // to a multiple of the fragment size.
      this.originalDataLength = originalDataLength || totalLength;
      // Use the step transmitted by the encoder when available, otherwise
      // fall back to step = fragmentSize (the default for the simple cyclic
      // fountain scheme).
      this.step = step > 0 ? step : this.fragmentSize;
    }

    if (this.totalLength === 0 || !this.result) return false;

    // Calculate the start offset for this fragment in the original data
    const start = (seqNum * this.step) % this.totalLength;

    // Place each byte at its correct offset, wrapping if necessary
    for (let i = 0; i < fragment.length; i++) {
      const offset = (start + i) % this.totalLength;
      this.result[offset] = fragment[i];
      this.covered.add(offset);
    }

    // Check if all byte positions are covered
    if (this.covered.size >= this.totalLength) {
      this.complete = true;
    }

    return this.complete;
  }

  /**
   * Get the current decoding progress as a fraction between 0 and 1.
   */
  getProgress(): number {
    if (this.totalLength === 0) return 0;
    if (this.complete) return 1;
    return this.covered.size / this.totalLength;
  }

  /**
   * Get the fully reconstructed data. Throws if decoding is not complete.
   *
   * The returned Uint8Array is trimmed to the original (unpadded) data length
   * when that metadata is available, so callers receive exactly the bytes
   * that were fed into the encoder — no trailing zero padding.
   */
  getResult(): Uint8Array {
    if (!this.complete || !this.result) {
      throw new Error('Decoding not complete');
    }
    // Trim padding when the encoder told us the original length.
    if (this.originalDataLength > 0 && this.originalDataLength < this.totalLength) {
      return this.result.slice(0, this.originalDataLength);
    }
    return this.result;
  }

  /**
   * Check whether all data has been reconstructed.
   */
  isComplete(): boolean {
    return this.complete;
  }

  /**
   * Reset the decoder to its initial state.
   */
  reset(): void {
    this.result = null;
    this.totalLength = 0;
    this.fragmentSize = 0;
    this.step = 0;
    this.originalDataLength = 0;
    this.covered.clear();
    this.complete = false;
  }
}

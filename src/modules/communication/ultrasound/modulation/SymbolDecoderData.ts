/**
 * Symbol Decoder for Data
 * Decodes DTMF symbols back into data bytes
 * Inverse of SymbolEncoder
 */

export class SymbolDecoderData {
  /**
   * Decode symbol indices into byte array
   */
  decode(symbols: number[]): Uint8Array {
    // Symbols come in groups of 4 (2 bits each = 8 bits = 1 byte)
    const byteCount = Math.floor(symbols.length / 4);
    const data = new Uint8Array(byteCount);

    for (let i = 0; i < byteCount; i++) {
      const idx = i * 4;
      const b7_6 = symbols[idx] & 0x03;
      const b5_4 = symbols[idx + 1] & 0x03;
      const b3_2 = symbols[idx + 2] & 0x03;
      const b1_0 = symbols[idx + 3] & 0x03;

      data[i] = (b7_6 << 6) | (b5_4 << 4) | (b3_2 << 2) | b1_0;
    }

    return data;
  }

  /**
   * Decode symbol indices into string
   */
  decodeString(symbols: number[]): string {
    const data = this.decode(symbols);
    const decoder = new TextDecoder();
    return decoder.decode(data);
  }

  /**
   * Calculate number of bytes that can be decoded from symbol count
   */
  getByteCount(symbolCount: number): number {
    return Math.floor(symbolCount / 4);
  }
}

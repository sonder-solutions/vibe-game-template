/**
 * Symbol Encoder
 * Encodes data bytes into DTMF symbols for transmission
 *
 * Encoding scheme:
 * - Each byte (8 bits) is split into 4 symbol pairs (2 bits each)
 * - 2-bit values map to symbols: 00→0, 01→1, 10→fn, 11→reserved
 */

import { SYMBOLS } from '../UltrasoundService.types.js';

export class SymbolEncoder {
  /**
   * Encode a byte array into symbol indices
   */
  encode(data: Uint8Array): number[] {
    const symbols: number[] = [];

    for (const byte of data) {
      // Split byte into 4 pairs of 2 bits
      symbols.push((byte >> 6) & 0x03); // bits 7-6
      symbols.push((byte >> 4) & 0x03); // bits 5-4
      symbols.push((byte >> 2) & 0x03); // bits 3-2
      symbols.push(byte & 0x03);        // bits 1-0
    }

    return symbols;
  }

  /**
   * Encode a string into symbol indices
   */
  encodeString(str: string): number[] {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    return this.encode(data);
  }

  /**
   * Get symbol name by index
   */
  getSymbolName(index: number): string {
    if (index < 0 || index >= SYMBOLS.length) {
      return 'invalid';
    }
    return SYMBOLS[index];
  }

  /**
   * Calculate number of symbols needed for given byte count
   */
  getSymbolCount(byteCount: number): number {
    return byteCount * 4; // 4 symbols per byte
  }

  /**
   * Calculate transmission time for given data size
   */
  getTransmissionTime(byteCount: number, symbolDuration: number): number {
    return this.getSymbolCount(byteCount) * symbolDuration;
  }
}

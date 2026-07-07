/**
 * Symbol Confirmation Tracker
 * Tracks consecutive symbol detections for reliable decoding
 * Based on the confirmation logic from the existing DTMF implementation
 */

import { SYMBOLS } from '../UltrasoundService.types.js';

export class SymbolConfirmation {
  #confirmationCount: number;
  #lastSymbol: number = -1;
  #count: number = 0;
  #decodedSymbols: number[] = [];
  #onSymbolDecoded?: (symbol: number) => void;

  constructor(confirmationCount: number, onSymbolDecoded?: (symbol: number) => void) {
    this.#confirmationCount = confirmationCount;
    this.#onSymbolDecoded = onSymbolDecoded;
  }

  /**
   * Update with new symbol detection
   * Returns true if a symbol was confirmed and added to decoded stream
   */
  update(symbolIndex: number): boolean {
    let confirmed = false;

    if (symbolIndex === this.#lastSymbol) {
      // Same symbol detected again
      this.#count++;
    } else {
      // Different symbol - check if previous was confirmed
      if (this.#count >= this.#confirmationCount && this.#lastSymbol >= 0) {
        // Previous symbol confirmed
        this.#decodedSymbols.push(this.#lastSymbol);
        this.#onSymbolDecoded?.(this.#lastSymbol);
        confirmed = true;
      }
      // Start tracking new symbol
      this.#lastSymbol = symbolIndex;
      this.#count = 1;
    }

    // If signal lost and we have a pending confirmed symbol
    if (symbolIndex < 0 && this.#count >= this.#confirmationCount && this.#lastSymbol >= 0) {
      this.#decodedSymbols.push(this.#lastSymbol);
      this.#onSymbolDecoded?.(this.#lastSymbol);
      confirmed = true;
      this.#lastSymbol = -1;
      this.#count = 0;
    }

    return confirmed;
  }

  /**
   * Get all decoded symbols so far
   */
  getDecodedSymbols(): number[] {
    return [...this.#decodedSymbols];
  }

  /**
   * Get decoded symbols as string
   */
  getDecodedString(): string {
    return this.#decodedSymbols.map(s => SYMBOLS[s] || '?').join('');
  }

  /**
   * Clear decoded symbols
   */
  clear(): void {
    this.#decodedSymbols = [];
    this.#lastSymbol = -1;
    this.#count = 0;
  }

  /**
   * Get current tracking state
   */
  getState(): { lastSymbol: number; count: number; confirmed: number } {
    return {
      lastSymbol: this.#lastSymbol,
      count: this.#count,
      confirmed: this.#decodedSymbols.length,
    };
  }

  /**
   * Update confirmation threshold
   */
  setConfirmationCount(count: number): void {
    this.#confirmationCount = count;
  }
}

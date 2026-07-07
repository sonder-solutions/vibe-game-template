import { describe, it, expect } from 'vitest';
import { encodeCBOR, decodeCBOR, uint8ArrayToHex, hexToUint8Array } from '../../src/modules/qr/bc-ur/CBOR';

describe('CBOR', () => {
  it('should encode and decode string', () => {
    const original = 'Hello, World!';
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);

    expect(decoded).toBe(original);
  });

  it('should encode and decode Uint8Array', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);

    expect(decoded).toEqual(original);
  });

  it('should encode and decode number', () => {
    const original = 42;
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);

    expect(decoded).toBe(original);
  });

  it('should encode and decode object', () => {
    const original = { name: 'test', value: 123 };
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);

    expect(decoded).toEqual(original);
  });

  it('should convert Uint8Array to hex string', () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = 'deadbeef';

    expect(uint8ArrayToHex(data)).toBe(hex);
  });

  it('should convert hex string to Uint8Array', () => {
    const hex = 'deadbeef';
    const expected = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    expect(hexToUint8Array(hex)).toEqual(expected);
  });

  it('should throw error for odd-length hex string', () => {
    expect(() => hexToUint8Array('abc')).toThrow('Hex string must have even length');
  });

  it('should throw error for invalid hex characters', () => {
    expect(() => hexToUint8Array('xy')).toThrow('Invalid hex characters');
  });

  it('should handle empty hex string', () => {
    const result = hexToUint8Array('');
    expect(result).toEqual(new Uint8Array(0));
  });

  it('should handle uppercase hex', () => {
    const hex = 'DEADBEEF';
    const expected = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    expect(hexToUint8Array(hex)).toEqual(expected);
  });
});

import { encode, decode } from 'cbor-x';

export function encodeCBOR(data: any): Uint8Array {
  return encode(data);
}

export function decodeCBOR(data: Uint8Array): any {
  return decode(data);
}

export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error('Hex string must have even length');
  if (!/^[0-9a-fA-F]*$/.test(hex)) throw new Error('Invalid hex characters');
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return arr;
}

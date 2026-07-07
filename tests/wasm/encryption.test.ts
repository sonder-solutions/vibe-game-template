import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync, encrypt, decrypt } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('WASM Encryption/Decryption', () => {
  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  it('should encrypt and decrypt string correctly', () => {
    const original = "Hello, World!";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different encrypted output', () => {
    const original = "test";
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
  });

  it('should encrypt numbers as strings', () => {
    const original = "12345";
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle empty string', () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it('should handle JSON data', () => {
    const data = JSON.stringify({ score: 100, time: 60 });
    const encrypted = encrypt(data);
    const decrypted = decrypt(encrypted);
    expect(JSON.parse(decrypted)).toEqual({ score: 100, time: 60 });
  });
});

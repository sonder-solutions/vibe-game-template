import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync, get_random, get_random_range } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('WASM Secure RNG', () => {
  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  it('should generate random number between 0 and 1', () => {
    const random = get_random();
    expect(random).toBeGreaterThanOrEqual(0);
    expect(random).toBeLessThan(1);
  });

  it('should generate different random numbers', () => {
    const randoms = new Set();
    for (let i = 0; i < 100; i++) {
      randoms.add(get_random());
    }
    expect(randoms.size).toBeGreaterThan(90); // Should be mostly unique
  });

  it('should generate random integer in range', () => {
    for (let i = 0; i < 50; i++) {
      const random = get_random_range(1, 10);
      expect(random).toBeGreaterThanOrEqual(1);
      expect(random).toBeLessThan(10);
    }
  });
});

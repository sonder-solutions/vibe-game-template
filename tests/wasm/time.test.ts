import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync, increment_time, get_time, reset_time } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('WASM Time Tracking', () => {
  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(() => {
    reset_time();
  });

  it('should start at time 0', () => {
    expect(get_time()).toBe(0n);
  });

  it('should increment time by 1', () => {
    increment_time();
    expect(get_time()).toBe(1n);
  });

  it('should increment time multiple times', () => {
    for (let i = 0; i < 10; i++) {
      increment_time();
    }
    expect(get_time()).toBe(10n);
  });

  it('should reset time to 0', () => {
    increment_time();
    increment_time();
    expect(get_time()).toBe(2n);
    reset_time();
    expect(get_time()).toBe(0n);
  });
});

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync, generate_hash, generate_command_hash, generate_time_code, increment_time, reset_time } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('WASM Hash Generation', () => {
  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(() => {
    reset_time();
  });

  it('should generate consistent hash for same input', () => {
    const hash1 = generate_hash("test");
    const hash2 = generate_hash("test");
    expect(hash1).toBe(hash2);
  });

  it('should generate different hashes for different inputs', () => {
    const hash1 = generate_hash("test1");
    const hash2 = generate_hash("test2");
    expect(hash1).not.toBe(hash2);
  });

  it('should generate command hash based on function ID and time', () => {
    const hash1 = generate_command_hash(1, 100n);
    const hash2 = generate_command_hash(1, 100n);
    const hash3 = generate_command_hash(2, 100n);
    expect(hash1).toBe(hash2);
    expect(hash1).not.toBe(hash3);
  });

  it('should generate time-based code that changes with time', () => {
    const code1 = generate_time_code();
    increment_time();
    const code2 = generate_time_code();
    expect(code1).not.toBe(code2);
  });
});

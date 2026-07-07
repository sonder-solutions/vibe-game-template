import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { CommandSystem } from '../../src/modules/security/CommandSystem';
import { reset_time, increment_time } from '../../src/modules/security/wasm/pkg/game_security_wasm';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('CommandSystem', () => {
  let commandSystem: CommandSystem;

  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(async () => {
    reset_time();
    commandSystem = new CommandSystem();
    await commandSystem.initialize();
  });

  it('should register commands', () => {
    const handler = () => console.log('test');
    commandSystem.register(1, handler);
    // Should not throw
  });

  it('should execute command with valid hash', () => {
    let executed = false;
    commandSystem.register(1, () => { executed = true; });

    const hash = commandSystem.getCommandHash(1);
    commandSystem.execute(hash);

    expect(executed).toBe(true);
  });

  it('should not execute command with invalid hash', () => {
    let executed = false;
    commandSystem.register(1, () => { executed = true; });

    commandSystem.execute('invalid_hash');

    expect(executed).toBe(false);
  });

  it('should generate different hashes for different times', () => {
    const hash1 = commandSystem.getCommandHash(1);
    increment_time();
    const hash2 = commandSystem.getCommandHash(1);

    expect(hash1).not.toBe(hash2);
  });
});

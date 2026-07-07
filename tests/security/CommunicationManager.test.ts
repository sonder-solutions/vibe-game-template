import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { CommunicationManager } from '../../src/modules/security/CommunicationManager';
import init from '../../src/modules/security/wasm/pkg/game_security_wasm';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('CommunicationManager', () => {
  let commManager: CommunicationManager;

  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(async () => {
    commManager = new CommunicationManager();
    await commManager.initialize();
  });

  it('should encrypt messages', () => {
    const message = { type: 'GET_SCORE' };
    const encrypted = commManager.encrypt(message);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(JSON.stringify(message));
  });

  it('should decrypt messages', () => {
    const message = { type: 'GET_SCORE', payload: { score: 100 } };
    const encrypted = commManager.encrypt(message);
    const decrypted = commManager.decrypt(encrypted);
    expect(decrypted).toEqual(message);
  });

  it('should handle round-trip encryption', () => {
    const original = { score: 100, time: 60, name: 'Player1' };
    const encrypted = commManager.encrypt(original);
    const decrypted = commManager.decrypt(encrypted);
    expect(decrypted).toEqual(original);
  });
});

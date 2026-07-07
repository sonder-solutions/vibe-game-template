import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { ScoreSubmission } from '../../src/submission/ScoreSubmission';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync } from '../../src/modules/security/wasm/pkg/game_security_wasm';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('ScoreSubmission', () => {
  let submission: ScoreSubmission;

  beforeAll(() => {
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(async () => {
    submission = new ScoreSubmission();
    await submission.initialize();
  });

  it('should encrypt score data', () => {
    const data = { score: 100, time: 60, name: 'Player1' };
    const encrypted = submission.encrypt(data);
    expect(typeof encrypted).toBe('string');
    expect(encrypted).not.toBe(JSON.stringify(data));
  });

  it('should format submission for GitHub issue', () => {
    const data = { score: 100, time: 60, name: 'Player1' };
    const formatted = submission.formatForIssue(data);
    expect(formatted).toContain('ENCRYPTED_PAYLOAD');
  });
});

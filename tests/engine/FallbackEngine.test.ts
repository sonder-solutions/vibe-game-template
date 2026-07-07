import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync } from '../../src/modules/security/wasm/pkg/game_security_wasm';
import { FallbackEngine } from '../../src/core/engine/FallbackEngine';
import { Sprite } from '../../src/core/engine/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('FallbackEngine', () => {
  let engine: FallbackEngine;
  let canvas: HTMLCanvasElement;

  beforeAll(() => {
    // Pre-initialize WASM synchronously. The engine's init() call
    // will detect WASM is already loaded and return immediately.
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    engine = new FallbackEngine();
  });

  it('should initialize with canvas', async () => {
    await engine.initialize({ canvas, width: 800, height: 600 });
    expect(engine).toBeDefined();
  });

  it('should add and retrieve sprites', async () => {
    await engine.initialize({ canvas, width: 800, height: 600 });
    const sprite: Sprite = {
      id: 'test',
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    engine.addSprite(sprite);
    // Sprite should be added (no error)
  });

  it('should remove sprites', async () => {
    await engine.initialize({ canvas, width: 800, height: 600 });
    const sprite: Sprite = {
      id: 'test',
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    engine.addSprite(sprite);
    engine.removeSprite('test');
    // Should not throw
  });

  it('should get and set game state', async () => {
    await engine.initialize({ canvas, width: 800, height: 600 });
    engine.setState({ score: 100, health: 50 });
    const state = engine.getState();
    expect(state.score).toBe(100);
    expect(state.health).toBe(50);
  });
});

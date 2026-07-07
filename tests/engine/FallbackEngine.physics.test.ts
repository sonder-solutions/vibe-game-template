import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { initSync } from '../../src/modules/security/wasm/pkg/game_security_wasm';
import { FallbackEngine } from '../../src/core/engine/FallbackEngine';
import { Sprite } from '../../src/core/engine/types';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('FallbackEngine Physics', () => {
  let engine: FallbackEngine;
  let canvas: HTMLCanvasElement;

  beforeAll(() => {
    // Pre-initialize WASM synchronously. The engine's init() call
    // will detect WASM is already loaded and return immediately.
    const wasmPath = resolve(__dirname, '../../src/security/wasm/pkg/game_security_wasm_bg.wasm');
    const wasmBuffer = readFileSync(wasmPath);
    initSync({ module: wasmBuffer.buffer });
  });

  beforeEach(async () => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    engine = new FallbackEngine();
    await engine.initialize({ canvas, width: 800, height: 600 });
  });

  it('should update sprite positions based on velocity', () => {
    const sprite: Sprite = {
      id: 'test',
      position: { x: 100, y: 100 },
      velocity: { x: 10, y: 5 },
      width: 32,
      height: 32
    };
    engine.addSprite(sprite);

    engine.update(0.1); // 100ms

    // position = initial + velocity * deltaTime
    // x: 100 + 10 * 0.1 = 101
    // y: 100 +  5 * 0.1 = 100.5
    expect(sprite.position.x).toBeCloseTo(101, 5);
    expect(sprite.position.y).toBeCloseTo(100.5, 5);
  });

  it('should accumulate position changes over multiple updates', () => {
    const sprite: Sprite = {
      id: 'moving',
      position: { x: 0, y: 0 },
      velocity: { x: 100, y: -50 },
      width: 16,
      height: 16
    };
    engine.addSprite(sprite);

    // Three frames at ~60fps
    engine.update(0.016);
    engine.update(0.016);
    engine.update(0.016);

    // x: 0 + 100 * 0.016 * 3 = 4.8
    // y: 0 + (-50) * 0.016 * 3 = -2.4
    expect(sprite.position.x).toBeCloseTo(4.8, 5);
    expect(sprite.position.y).toBeCloseTo(-2.4, 5);
  });

  it('should leave sprite stationary when velocity is zero', () => {
    const sprite: Sprite = {
      id: 'static',
      position: { x: 42, y: 73 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    engine.addSprite(sprite);

    engine.update(1.0);

    expect(sprite.position.x).toBe(42);
    expect(sprite.position.y).toBe(73);
  });

  it('should track game time via WASM', () => {
    const initialState = engine.getState();
    expect(initialState.time).toBe(0);

    engine.update(0.016); // ~60fps frame
    const newState = engine.getState();
    // increment_time() adds 1 per call (u64 counter), not deltaTime
    expect(newState.time).toBeGreaterThan(0);
  });

  it('should increment WASM time counter on each update', () => {
    engine.update(0.016);
    const afterFirst = engine.getState().time;

    engine.update(0.016);
    const afterSecond = engine.getState().time;

    engine.update(0.016);
    const afterThird = engine.getState().time;

    // Each update calls increment_time() once, so time increases by 1 each frame
    expect(afterSecond - afterFirst).toBe(1);
    expect(afterThird - afterSecond).toBe(1);
  });

  it('should reset time on first initialize', async () => {
    // Time was already incremented by previous tests in this suite (shared WASM state),
    // but a fresh engine's first initialize() calls reset_time().
    const freshEngine = new FallbackEngine();
    await freshEngine.initialize({ canvas, width: 800, height: 600 });
    expect(freshEngine.getState().time).toBe(0);
  });

  it('should not reset time on subsequent initialize calls', async () => {
    // The #wasmInitialized guard means reset_time() only runs once per engine instance
    engine.update(0.016);
    engine.update(0.016);
    const timeBeforeReinit = engine.getState().time;
    expect(timeBeforeReinit).toBeGreaterThan(0);

    await engine.initialize({ canvas, width: 800, height: 600 });
    // Time should NOT have been reset since this engine already initialized once
    expect(engine.getState().time).toBe(timeBeforeReinit);
  });
});

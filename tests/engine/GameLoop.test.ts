import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameLoop } from '../../src/core/engine/GameLoop';

describe('GameLoop', () => {
  let loop: GameLoop;

  beforeEach(() => {
    loop = new GameLoop();
  });

  afterEach(() => {
    loop.stop();
  });

  it('should start and stop', () => {
    const update = vi.fn();
    const render = vi.fn();

    loop.start(update, render);
    expect(loop.isRunning()).toBe(true);

    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it('should call update and render functions', async () => {
    const update = vi.fn();
    const render = vi.fn();

    loop.start(update, render);

    // Wait for a frame
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(update).toHaveBeenCalled();
    expect(render).toHaveBeenCalled();
  });
});

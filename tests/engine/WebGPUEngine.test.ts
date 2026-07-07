import { describe, it, expect, beforeEach } from 'vitest';
import { WebGPUEngine } from '../../src/core/engine/WebGPUEngine';

describe('WebGPUEngine', () => {
  let engine: WebGPUEngine;
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    engine = new WebGPUEngine();
  });

  it('should initialize with WebGPU', async () => {
    // Skip if WebGPU not available
    if (!navigator.gpu) {
      console.log('WebGPU not available, skipping test');
      return;
    }

    await engine.initialize({ canvas, width: 800, height: 600 });
    expect(engine).toBeDefined();
  });
});

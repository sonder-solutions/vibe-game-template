import { describe, it, expect, vi } from 'vitest';
import { EngineFactory } from '../../src/core/engine/EngineFactory';

describe('EngineFactory', () => {
  it('should create FallbackEngine when WebGPU not supported', async () => {
    const canvas = document.createElement('canvas');
    const engine = await EngineFactory.createEngine(canvas);
    expect(engine.constructor.name).toBe('FallbackEngine');
  });

  it('should create WebGPUEngine when WebGPU supported', async () => {
    // Mock WebGPU support
    const originalGpu = navigator.gpu;
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: vi.fn().mockResolvedValue({
          requestDevice: vi.fn().mockResolvedValue({})
        }),
        getPreferredCanvasFormat: vi.fn().mockReturnValue('bgra8unorm')
      },
      configurable: true
    });

    const canvas = document.createElement('canvas');
    // jsdom doesn't implement getContext('webgpu'), so mock it
    const mockContext = {
      configure: vi.fn(),
      getCurrentTexture: vi.fn().mockReturnValue({
        createView: vi.fn().mockReturnValue({})
      })
    };
    canvas.getContext = vi.fn().mockImplementation((contextId: string) => {
      if (contextId === 'webgpu') return mockContext;
      return null;
    });

    const engine = await EngineFactory.createEngine(canvas);
    expect(engine.constructor.name).toBe('WebGPUEngine');

    // Restore
    Object.defineProperty(navigator, 'gpu', { value: originalGpu, configurable: true });
  });
});

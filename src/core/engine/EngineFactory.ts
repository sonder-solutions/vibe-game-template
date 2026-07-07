import { IEngine } from './IEngine.js';
import { FallbackEngine } from './FallbackEngine.js';
import { WebGPUEngine } from './WebGPUEngine.js';
import { EngineConfig } from './types.js';
import type { ISecurityService } from '../../services/interfaces/ISecurityService.js';

export class EngineFactory {
  static async createEngine(
    canvas: HTMLCanvasElement,
    config?: Partial<EngineConfig>,
    securityService?: ISecurityService
  ): Promise<IEngine> {
    const isWebGPUSupported = !!navigator.gpu &&
      (await navigator.gpu.requestAdapter() !== null);

    const engineConfig: EngineConfig = {
      canvas,
      width: canvas.width,
      height: canvas.height,
      ...config
    };

    if (isWebGPUSupported) {
      console.log("🚀 WebGPU detected. Launching high-performance engine.");
      const engine = new WebGPUEngine(securityService);
      await engine.initialize(engineConfig);
      return engine;
    } else {
      console.warn("⚠️ WebGPU not supported. Falling back to WebGL2/Canvas.");
      const engine = new FallbackEngine(securityService);
      await engine.initialize(engineConfig);
      return engine;
    }
  }
}

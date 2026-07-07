export class ResponsiveCanvas {
  private canvas: HTMLCanvasElement;
  private observer: ResizeObserver | null = null;
  private resizeHandler: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  enable(): void {
    this.resize();

    // Observe parent element for size changes
    const parent = this.canvas.parentElement || this.canvas;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(parent);

    // Handle window resize
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
  }

  disable(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
  }

  private resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size accounting for device pixel ratio
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Set display size
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    // Scale context for high-DPI displays
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    // Also scale for WebGPU if applicable
    const webgpuContext = this.canvas.getContext('webgpu');
    if (webgpuContext) {
      // WebGPU handles DPI automatically, but we need to update the config
      // This will be handled by the engine
    }
  }
}

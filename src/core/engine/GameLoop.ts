export class GameLoop {
  #running = false;
  #animationFrameId: number | null = null;
  #lastTime = 0;

  start(update: (deltaTime: number) => void, render: () => void): void {
    if (this.#running) return;

    this.#running = true;
    this.#lastTime = performance.now();

    const loop = (currentTime: number) => {
      if (!this.#running) return;

      const deltaTime = (currentTime - this.#lastTime) / 1000;
      this.#lastTime = currentTime;

      update(deltaTime);
      render();

      this.#animationFrameId = requestAnimationFrame(loop);
    };

    this.#animationFrameId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.#running = false;
    if (this.#animationFrameId !== null) {
      cancelAnimationFrame(this.#animationFrameId);
      this.#animationFrameId = null;
    }
  }

  isRunning(): boolean {
    return this.#running;
  }
}

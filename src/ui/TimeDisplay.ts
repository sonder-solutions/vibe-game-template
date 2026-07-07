export class TimeDisplay extends HTMLElement {
  #shadow: ShadowRoot;
  #seconds = 0;
  #mode: 'elapsed' | 'countdown' | 'static' = 'static';
  #intervalId: number | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback() {
    this.#render();
  }

  disconnectedCallback() {
    this.stop();
  }

  setTime(seconds: number): void {
    this.#seconds = Math.max(0, seconds);
    this.#render();
  }

  start(mode: 'elapsed' | 'countdown'): void {
    this.stop();
    this.#mode = mode;

    this.#intervalId = window.setInterval(() => {
      if (this.#mode === 'elapsed') {
        this.#seconds++;
      } else if (this.#mode === 'countdown') {
        if (this.#seconds > 0) {
          this.#seconds--;
        } else {
          this.stop();
        }
      }
      this.#render();
    }, 1000);
  }

  stop(): void {
    if (this.#intervalId !== null) {
      clearInterval(this.#intervalId);
      this.#intervalId = null;
    }
    this.#mode = 'static';
  }

  #formatTime(): string {
    const hours = Math.floor(this.#seconds / 3600);
    const minutes = Math.floor((this.#seconds % 3600) / 60);
    const secs = this.#seconds % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  }

  #render(): void {
    const color = this.style.getPropertyValue('--time-color') || '#fff';
    const fontSize = this.style.getPropertyValue('--time-font-size') || '24px';
    const fontFamily = this.style.getPropertyValue('--time-font-family') || 'monospace';

    this.#shadow.innerHTML = `
      <style>
        .time {
          color: ${color};
          font-size: ${fontSize};
          font-family: ${fontFamily};
        }
      </style>
      <div class="time">${this.#formatTime()}</div>
    `;
  }
}

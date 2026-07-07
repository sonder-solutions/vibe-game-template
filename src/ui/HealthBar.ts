export class HealthBar extends HTMLElement {
  #shadow: ShadowRoot;
  #current = 100;
  #max = 100;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback() {
    this.#render();
  }

  setHealth(current: number, max?: number): void {
    this.#current = Math.max(0, current);
    if (max !== undefined) {
      this.#max = max;
    }
    this.#render();
  }

  get percentage(): number {
    if (this.#max <= 0) return 0;
    return Math.round((this.#current / this.#max) * 100);
  }

  get currentColor(): string {
    return this.#getColor();
  }

  #getColor(): string {
    const pct = this.percentage;

    if (pct > 60) {
      return this.style.getPropertyValue('--health-color-high') || '#4CAF50';
    } else if (pct > 30) {
      return this.style.getPropertyValue('--health-color-medium') || '#FFC107';
    } else {
      return this.style.getPropertyValue('--health-color-low') || '#F44336';
    }
  }

  #render(): void {
    const percentage = this.percentage;
    const color = this.#getColor();
    const backgroundColor = this.style.getPropertyValue('--health-background') || '#333';
    const width = this.style.getPropertyValue('--health-width') || '200px';
    const height = this.style.getPropertyValue('--health-height') || '20px';

    this.#shadow.innerHTML = `
      <style>
        .health-bar {
          width: ${width};
          height: ${height};
          background: ${backgroundColor};
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }
        .health-fill {
          height: 100%;
          width: ${percentage}%;
          background: ${color};
          transition: width 0.3s ease, background-color 0.3s ease;
        }
        .health-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          color: white;
          font-size: 12px;
          font-weight: bold;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
        }
      </style>
      <div class="health-bar">
        <div class="health-fill"></div>
        <div class="health-text">${percentage}%</div>
      </div>
    `;
  }
}

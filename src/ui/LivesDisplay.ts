export class LivesDisplay extends HTMLElement {
  #shadow: ShadowRoot;
  #current = 0;
  #max = 5;
  #mode: 'integer' | 'percentage' | 'fraction' | 'graphics' = 'integer';

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback() {
    const modeAttr = this.getAttribute('mode');
    if (modeAttr === 'integer' || modeAttr === 'percentage' || modeAttr === 'fraction' || modeAttr === 'graphics') {
      this.#mode = modeAttr;
    }
    this.#render();
  }

  setLives(current: number, max?: number): void {
    this.#current = current;
    if (max !== undefined) {
      this.#max = max;
    }
    this.#render();
  }

  #render(): void {
    const color = this.style.getPropertyValue('--lives-color') || '#ff0000';
    const fontSize = this.style.getPropertyValue('--lives-font-size') || '24px';

    let content = '';

    switch (this.#mode) {
      case 'integer':
        content = `${this.#current}`;
        break;
      case 'percentage': {
        const percentage = this.#max > 0 ? Math.round((this.#current / this.#max) * 100) : 0;
        content = `${percentage}%`;
        break;
      }
      case 'fraction':
        content = `${this.#current}/${this.#max}`;
        break;
      case 'graphics':
        content = '❤️'.repeat(this.#current);
        break;
    }

    this.#shadow.innerHTML = `
      <style>
        .lives {
          color: ${color};
          font-size: ${fontSize};
          font-family: monospace;
        }
      </style>
      <div class="lives">${content}</div>
    `;
  }
}

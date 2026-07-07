export class LevelDisplay extends HTMLElement {
  #shadow: ShadowRoot;
  #current = 1;
  #total: number | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback() {
    this.#render();
  }

  setLevel(current: number, total?: number): void {
    this.#current = current;
    this.#total = total ?? null;
    this.#render();
  }

  #render(): void {
    const color = this.style.getPropertyValue('--level-color') || '#fff';
    const fontSize = this.style.getPropertyValue('--level-font-size') || '24px';
    const fontFamily = this.style.getPropertyValue('--level-font-family') || 'monospace';

    const text = this.#total !== null
      ? `Level ${this.#current}/${this.#total}`
      : `Level ${this.#current}`;

    this.#shadow.innerHTML = `
      <style>
        .level {
          color: ${color};
          font-size: ${fontSize};
          font-family: ${fontFamily};
        }
      </style>
      <div class="level">${text}</div>
    `;
  }
}

export class ColorPicker extends HTMLElement {
  #shadow: ShadowRoot;
  #color: string = '#ff0000';
  #onChangeCallback: ((color: string) => void) | null = null;

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.#render();
  }

  setColor(color: string): void {
    this.#color = color;
    this.#render();
  }

  getColor(): string {
    return this.#color;
  }

  onChange(callback: (color: string) => void): void {
    this.#onChangeCallback = callback;
  }

  #render(): void {
    this.#shadow.innerHTML = `
      <style>
        .color-picker {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'VT323', monospace;
          color: #3e2723;
          user-select: none;
        }
        input[type="color"] {
          width: 60px;
          height: 40px;
          border: 2px solid #654321;
          border-radius: 4px;
          cursor: pointer;
        }
      </style>
      <div class="color-picker">
        <label>Color:</label>
        <input type="color" value="${this.#color}" id="colorInput">
      </div>
    `;

    const input = this.#shadow.querySelector('#colorInput') as HTMLInputElement;
    input?.addEventListener('input', (e) => {
      this.#color = (e.target as HTMLInputElement).value;
      this.#onChangeCallback?.(this.#color);
    });
  }
}

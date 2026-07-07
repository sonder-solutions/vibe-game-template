export interface SliderConfig {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
}

export class Slider extends HTMLElement {
  #shadow: ShadowRoot;
  #config: Required<SliderConfig>;
  #onChangeCallback: ((value: number) => void) | null = null;

  constructor(config: SliderConfig = {}) {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });

    // Read attributes from HTML element, falling back to config or defaults
    const label = this.getAttribute('label') ?? config.label ?? 'Value';
    const minAttr = this.getAttribute('min');
    const min = minAttr !== null ? parseFloat(minAttr) : (config.min ?? 0);
    const maxAttr = this.getAttribute('max');
    const max = maxAttr !== null ? parseFloat(maxAttr) : (config.max ?? 100);
    const stepAttr = this.getAttribute('step');
    const step = stepAttr !== null ? parseFloat(stepAttr) : (config.step ?? 1);
    const valueAttr = this.getAttribute('value');
    const value = valueAttr !== null ? parseFloat(valueAttr) : (config.value ?? 0);

    this.#config = {
      label,
      min,
      max,
      step,
      value
    };
  }

  connectedCallback() {
    this.#render();
    this.#setupEventListeners();
  }

  #setupEventListeners(): void {
    const input = this.#shadow.querySelector('#sliderInput') as HTMLInputElement;
    input?.addEventListener('input', (e) => {
      this.#config.value = parseFloat((e.target as HTMLInputElement).value);
      this.#updateLabel();
      this.#onChangeCallback?.(this.#config.value);
    });
  }

  #updateLabel(): void {
    const valueDisplay = this.#shadow.querySelector('.value-display');
    if (valueDisplay) {
      valueDisplay.textContent = this.#config.value.toFixed(2);
    }
  }

  setValue(value: number): void {
    this.#config.value = value;
    const input = this.#shadow.querySelector('#sliderInput') as HTMLInputElement;
    if (input) {
      input.value = value.toString();
    }
    this.#updateLabel();
  }

  getValue(): number {
    return this.#config.value;
  }

  onChange(callback: (value: number) => void): void {
    this.#onChangeCallback = callback;
  }

  #render(): void {
    this.#shadow.innerHTML = `
      <style>
        .slider-control {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 8px;
          font-family: 'VT323', monospace;
          color: #3e2723;
          user-select: none;
          font-size: 14px;
        }
        label {
          white-space: nowrap;
          min-width: fit-content;
        }
        .slider-row {
          display: flex;
          align-items: center;
          gap: 5px;
          flex: 1;
        }
        input[type="range"] {
          flex: 1;
          accent-color: #6b8e23;
          height: 20px;
        }
        .value-display {
          min-width: 30px;
          text-align: right;
          font-size: 13px;
        }
      </style>
      <div class="slider-control">
        <label>${this.#config.label}</label>
        <div class="slider-row">
          <input type="range" min="${this.#config.min}" max="${this.#config.max}" step="${this.#config.step}" value="${this.#config.value}" id="sliderInput">
          <span class="value-display">${this.#config.value.toFixed(2)}</span>
        </div>
      </div>
    `;
  }
}

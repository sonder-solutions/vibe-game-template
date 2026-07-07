import type { ISecurityService } from '../services/interfaces/ISecurityService.js';

export class SubmitButton extends HTMLElement {
  #shadow: ShadowRoot;
  #securityService: ISecurityService;
  #submitted = false;
  #servicesReady = false;
  #pendingTimeCode: string = '';
  #pendingCommandHash: string = '';

  constructor(securityService: ISecurityService) {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
    this.#securityService = securityService;
  }

  async connectedCallback() {
    // Render button immediately so it's visible before services load
    this.#render();

    // Initialize services in background; pre-generate auth codes when ready
    try {
      await this.#securityService.initialize();
      this.#servicesReady = true;
      this.#generateAuthCodes();
    } catch {}
  }

  #generateAuthCodes(): void {
    const time = Number(this.#securityService.getTime());
    this.#pendingTimeCode = this.#securityService.generateTimeCode();
    this.#pendingCommandHash = this.#securityService.generateCommandHash(1);
  }

  #render(): void {
    const color = this.style.getPropertyValue('--button-color') || '#4CAF50';

    this.#shadow.innerHTML = `
      <style>
        button {
          background: ${color};
          color: white;
          padding: 10px 20px;
          border: 2px solid #00ffff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-family: 'Press Start 2P', cursive, monospace;
          box-shadow: 0 0 10px ${color};
          text-shadow: 2px 2px 0px rgba(0,0,0,0.5);
          user-select: none;
        }
        button:hover {
          box-shadow: 0 0 20px ${color};
        }
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          box-shadow: none;
        }
      </style>
      <button ${this.#submitted ? 'disabled' : ''}>
        ${this.#submitted ? 'Submitted' : 'Submit Score'}
      </button>
    `;

    const button = this.#shadow.querySelector('button');
    button?.addEventListener('click', () => this.#handleSubmit());
  }

  #handleSubmit(): void {
    if (this.#submitted) return;

    // Generate fresh auth codes if services are ready
    if (this.#servicesReady) {
      this.#generateAuthCodes();
    }

    this.dispatchEvent(new CustomEvent('submit-score', {
      detail: {
        timeCode: this.#pendingTimeCode,
        commandHash: this.#pendingCommandHash
      }
    }));

    this.#submitted = true;
    this.#render();
  }
}

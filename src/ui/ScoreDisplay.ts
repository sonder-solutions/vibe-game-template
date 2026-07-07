import type { ISecurityService } from '../services/interfaces/ISecurityService.js';

export class ScoreDisplay extends HTMLElement {
  #shadow: ShadowRoot;
  #score = 0;
  #securityService?: ISecurityService;

  constructor(securityService?: ISecurityService) {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
    this.#securityService = securityService;
  }

  async connectedCallback() {
    if (this.#securityService) {
      await this.#securityService.initialize();
    }
    this.#render();
  }

  setScore(score: number): void {
    this.#score = score;
    this.#render();
  }

  #render(): void {
    const color = this.style.getPropertyValue('--score-color') || '#fff';
    const fontSize = this.style.getPropertyValue('--score-font-size') || '24px';

    this.#shadow.innerHTML = `
      <style>
        .score {
          color: ${color};
          font-size: ${fontSize};
          font-family: monospace;
        }
      </style>
      <div class="score">Score: ${this.#score}</div>
    `;
  }
}

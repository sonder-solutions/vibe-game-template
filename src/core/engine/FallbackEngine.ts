import { IEngine } from './IEngine.js';
import { Sprite, GameState, EngineConfig } from './types.js';
import type { ISecurityService } from '../../services/interfaces/ISecurityService.js';

export class FallbackEngine implements IEngine {
  #canvas: HTMLCanvasElement | null = null;
  #ctx: CanvasRenderingContext2D | null = null;
  #sprites: Map<string, Sprite> = new Map();
  #state: GameState = {
    score: 0,
    health: 100,
    time: 0,
    lives: 3
  };
  #backgroundColor: string = 'rgb(249, 243, 232)'; // Default cream color
  #securityService?: ISecurityService;

  constructor(securityService?: ISecurityService) {
    this.#securityService = securityService;
  }

  async initialize(config: EngineConfig): Promise<void> {
    this.#canvas = config.canvas;
    this.#ctx = this.#canvas.getContext('2d');

    // Set background color from config
    if (config.backgroundColor) {
      const { r, g, b } = config.backgroundColor;
      this.#backgroundColor = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    }

    if (this.#securityService) {
      try {
        await this.#securityService.initialize();
        this.#securityService.resetTime();
      } catch {
        // Security service may already be initialized or unavailable
      }
    }
  }

  update(deltaTime: number): void {
    if (this.#securityService) {
      this.#securityService.incrementTime();
      this.#state.time = Number(this.#securityService.getTime());
    }

    // Update sprite positions
    for (const sprite of this.#sprites.values()) {
      sprite.position.x += sprite.velocity.x * deltaTime;
      sprite.position.y += sprite.velocity.y * deltaTime;
    }
  }

  render(): void {
    if (!this.#ctx || !this.#canvas) return;

    // Clear canvas with background color
    this.#ctx.fillStyle = this.#backgroundColor;
    this.#ctx.fillRect(0, 0, this.#canvas.width, this.#canvas.height);

    // Draw sprites
    for (const sprite of this.#sprites.values()) {
      this.#ctx.save();

      // Move to sprite center
      const centerX = sprite.position.x + sprite.width / 2;
      const centerY = sprite.position.y + sprite.height / 2;
      this.#ctx.translate(centerX, centerY);

      // Apply rotation
      if (sprite.rotation) {
        this.#ctx.rotate(sprite.rotation);
      }

      // Draw sprite centered at origin
      if (sprite.spriteSheet && sprite.spriteFrame) {
        // Draw from sprite sheet
        const { x, y, w, h, rotated } = sprite.spriteFrame;
        if (rotated) {
          // For rotated frames, swap dimensions
          this.#ctx.drawImage(
            sprite.spriteSheet,
            x, y, w, h,
            -sprite.height / 2, -sprite.width / 2,
            sprite.height, sprite.width
          );
        } else {
          this.#ctx.drawImage(
            sprite.spriteSheet,
            x, y, w, h,
            -sprite.width / 2, -sprite.height / 2,
            sprite.width, sprite.height
          );
        }
      } else if (sprite.image) {
        // Draw single image
        this.#ctx.drawImage(
          sprite.image,
          -sprite.width / 2, -sprite.height / 2,
          sprite.width, sprite.height
        );
      } else if (sprite.color) {
        // Draw colored rectangle
        this.#ctx.fillStyle = sprite.color;
        this.#ctx.fillRect(-sprite.width / 2, -sprite.height / 2, sprite.width, sprite.height);
      }

      this.#ctx.restore();
    }
  }

  addSprite(sprite: Sprite): void {
    this.#sprites.set(sprite.id, sprite);
  }

  getSprite(id: string): Sprite | undefined {
    return this.#sprites.get(id);
  }

  getSpriteAtPosition(x: number, y: number): Sprite | undefined {
    for (const sprite of this.#sprites.values()) {
      // Simple AABB check (can be enhanced for rotated sprites)
      if (x >= sprite.position.x &&
          x <= sprite.position.x + sprite.width &&
          y >= sprite.position.y &&
          y <= sprite.position.y + sprite.height) {
        return sprite;
      }
    }
    return undefined;
  }

  removeSprite(id: string): void {
    this.#sprites.delete(id);
  }

  getState(): GameState {
    return { ...this.#state };
  }

  setState(state: Partial<GameState>): void {
    this.#state = { ...this.#state, ...state };
  }

  destroy(): void {
    this.#sprites.clear();
    this.#ctx = null;
    this.#canvas = null;
  }

  getCanvas(): HTMLCanvasElement {
    if (!this.#canvas) {
      throw new Error('Canvas not initialized');
    }
    return this.#canvas;
  }
}

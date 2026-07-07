import { Sprite, GameState, EngineConfig } from './types.js';

export interface IEngine {
  initialize(config: EngineConfig): Promise<void>;
  update(deltaTime: number): void;
  render(): void;
  addSprite(sprite: Sprite): void;
  getSprite(id: string): Sprite | undefined;
  getSpriteAtPosition(x: number, y: number): Sprite | undefined;
  removeSprite(id: string): void;
  getState(): GameState;
  setState(state: Partial<GameState>): void;
  destroy(): void;
  getCanvas(): HTMLCanvasElement;
}

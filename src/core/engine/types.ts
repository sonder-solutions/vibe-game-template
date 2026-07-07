export interface Vector2D {
  x: number;
  y: number;
}

export interface Sprite {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  width: number;
  height: number;
  color?: string;
  image?: HTMLImageElement;
  rotation?: number; // rotation in radians
  spriteSheet?: HTMLImageElement;
  spriteFrame?: { x: number; y: number; w: number; h: number; rotated: boolean };
}

export interface GameState {
  score: number;
  health: number;
  time: number;
  lives: number;
}

export interface EngineConfig {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  backgroundColor?: { r: number; g: number; b: number; a: number };
}

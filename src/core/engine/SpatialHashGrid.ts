import { Sprite } from './types.js';

export class SpatialHashGrid {
  #cellSize: number;
  #cells: Map<string, Sprite[]> = new Map();

  constructor(cellSize: number) {
    this.#cellSize = cellSize;
  }

  #getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.#cellSize);
    const cellY = Math.floor(y / this.#cellSize);
    return `${cellX},${cellY}`;
  }

  #getCellsForSprite(sprite: Sprite): string[] {
    const cells: string[] = [];
    const minX = sprite.position.x;
    const minY = sprite.position.y;
    const maxX = sprite.position.x + sprite.width;
    const maxY = sprite.position.y + sprite.height;

    for (let x = minX; x <= maxX; x += this.#cellSize / 2) {
      for (let y = minY; y <= maxY; y += this.#cellSize / 2) {
        cells.push(this.#getCellKey(x, y));
      }
    }
    return [...new Set(cells)]; // Remove duplicates
  }

  add(sprite: Sprite): void {
    const cells = this.#getCellsForSprite(sprite);
    for (const cellKey of cells) {
      if (!this.#cells.has(cellKey)) {
        this.#cells.set(cellKey, []);
      }
      this.#cells.get(cellKey)!.push(sprite);
    }
  }

  remove(spriteId: string): void {
    for (const sprites of this.#cells.values()) {
      const index = sprites.findIndex(s => s.id === spriteId);
      if (index !== -1) {
        sprites.splice(index, 1);
      }
    }
  }

  getNeighbors(sprite: Sprite): Sprite[] {
    const neighbors = new Set<Sprite>();
    const cells = this.#getCellsForSprite(sprite);

    for (const cellKey of cells) {
      const cellSprites = this.#cells.get(cellKey);
      if (cellSprites) {
        for (const other of cellSprites) {
          if (other.id !== sprite.id) {
            neighbors.add(other);
          }
        }
      }
    }

    return Array.from(neighbors);
  }

  clear(): void {
    this.#cells.clear();
  }
}

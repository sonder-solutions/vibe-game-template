import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHashGrid } from '../../src/core/engine/SpatialHashGrid';
import { Sprite } from '../../src/core/engine/types';

describe('SpatialHashGrid', () => {
  let grid: SpatialHashGrid;

  beforeEach(() => {
    grid = new SpatialHashGrid(64); // 64x64 pixel cells
  });

  it('should create grid with cell size', () => {
    expect(grid).toBeDefined();
  });

  it('should add sprite to grid', () => {
    const sprite: Sprite = {
      id: 'test',
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    grid.add(sprite);
    const neighbors = grid.getNeighbors(sprite);
    expect(neighbors.length).toBe(0); // No other sprites
  });

  it('should find neighboring sprites', () => {
    const sprite1: Sprite = {
      id: 'sprite1',
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    const sprite2: Sprite = {
      id: 'sprite2',
      position: { x: 110, y: 110 }, // Overlaps with sprite1
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    grid.add(sprite1);
    grid.add(sprite2);

    const neighbors = grid.getNeighbors(sprite1);
    expect(neighbors.length).toBe(1);
    expect(neighbors[0].id).toBe('sprite2');
  });

  it('should not find distant sprites', () => {
    const sprite1: Sprite = {
      id: 'sprite1',
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    const sprite2: Sprite = {
      id: 'sprite2',
      position: { x: 500, y: 500 }, // Far away
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    grid.add(sprite1);
    grid.add(sprite2);

    const neighbors = grid.getNeighbors(sprite1);
    expect(neighbors.length).toBe(0);
  });

  it('should handle many sprites efficiently', () => {
    // Add 100 sprites
    for (let i = 0; i < 100; i++) {
      grid.add({
        id: `sprite${i}`,
        position: { x: Math.random() * 800, y: Math.random() * 600 },
        velocity: { x: 0, y: 0 },
        width: 32,
        height: 32
      });
    }

    // Get neighbors for one sprite - should be fast
    const sprite: Sprite = {
      id: 'test',
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      width: 32,
      height: 32
    };
    const start = performance.now();
    grid.getNeighbors(sprite);
    const duration = performance.now() - start;

    // Should be much faster than O(n²)
    expect(duration).toBeLessThan(10); // < 10ms
  });
});

// Define flower types - smart packer will detect these
export type FlowerType = 'rose' | 'tulip' | 'lily' | 'daisy' | 'sunflower' | 'cosmo' | 'daffodil' | 'lavender' | 'lilyOfTheValley' | 'orchid' | 'pansy' | 'poppy';

export const FLOWER_TYPES: FlowerType[] = [
  'rose', 'tulip', 'lily', 'daisy', 'sunflower',
  'cosmo', 'daffodil', 'lavender', 'lilyOfTheValley',
  'orchid', 'pansy', 'poppy'
];

// Asset paths - smart packer will detect template literal
export function getFlowerPath(type: FlowerType): string {
  return `./assets/flowers/${type}.png`;
}

export function getSpriteSheetPath(): string {
  return './assets/output/sprites.png';
}

export function getSpriteSheetJsonPath(): string {
  return './assets/output/sprites.json';
}

# Smart Asset Packer

Advanced asset packing system with static code analysis and TypeScript type inference.

## Features

### 🧠 Smart Mode (`--smart` or `-s`)

Analyzes your code to pack only assets that are actually used:

1. **Static Analysis**: Finds direct asset references in string literals, imports, and function calls
2. **TypeScript Type Analysis**: Extracts assets from union types, const arrays, and enums
3. **Directory Fallback**: If analysis can't determine exact assets, packs entire directories

### 📦 Regular Mode

Packs all images in the input directory (original behavior).

## Usage

```bash
# Pack all assets (regular mode)
npm run pack-assets

# Pack only used assets (smart mode)
npm run pack-assets -- --smart

# With custom directories
npm run pack-assets assets output
npm run pack-assets assets output --smart
```

## How Smart Analysis Works

### Layer 1: Static Analysis

Detects these patterns:
```typescript
// Direct imports
import flowerImg from './assets/flowers/rose.png';

// String literals
const path = './assets/flowers/tulip.png';

// Function calls
loadImage('./assets/flowers/lily.png');
new Image('./assets/flowers/daisy.png');

// Template literals (without variables)
const path = `./assets/flowers/orchid.png`;
```

### Layer 2: TypeScript Type Analysis

Detects dynamically constructed paths using type information:

```typescript
// Union types
type FlowerType = 'rose' | 'tulip' | 'lily';
const img = loadImage(`./assets/flowers/${flowerType}.png`);
// → Detects: rose.png, tulip.png, lily.png

// Const arrays
const FLOWERS = ['rose', 'tulip'] as const;
const img = loadImage(`./assets/flowers/${FLOWERS[i]}.png`);
// → Detects: rose.png, tulip.png

// Enums
enum Flower { Rose = 'rose', Tulip = 'tulip' }
const img = loadImage(`./assets/flowers/${Flower.Rose}.png`);
// → Detects: rose.png
```

### Layer 3: Directory Fallback

If analysis can't determine exact assets (e.g., complex dynamic paths), it falls back to packing entire referenced directories:

```typescript
// If analyzer can't determine which files, it packs all .png in the directory
loadImage(`./assets/flowers/${getUserSelectedFlower()}.png`);
// → Packs all .png files in ./assets/flowers/
```

## Output

### Regular Mode
```json
{
  "meta": {
    "image": "sprites.png",
    "size": { "w": 1024, "h": 1024 }
  },
  "frames": {
    "rose.png": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "sourceSize": { "w": 64, "h": 64 }
    }
  }
}
```

### Smart Mode
```json
{
  "meta": {
    "image": "sprites.png",
    "size": { "w": 512, "h": 512 },
    "smart": true
  },
  "frames": {
    "flowers/rose.png": {
      "frame": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "rotated": false,
      "trimmed": false,
      "spriteSourceSize": { "x": 0, "y": 0, "w": 64, "h": 64 },
      "sourceSize": { "w": 64, "h": 64 },
      "originalPath": "assets/flowers/rose.png"
    }
  }
}
```

In smart mode, the JSON map uses relative paths as keys (e.g., `flowers/rose.png` instead of just `rose.png`) and includes the `originalPath` field.

## Benefits of Smart Mode

1. **Smaller Sprite Sheets**: Only pack assets that are actually used
2. **Faster Load Times**: Reduced bundle size
3. **Better Organization**: JSON map preserves directory structure
4. **Easier Debugging**: Can see which assets are referenced in code

## Best Practices

### Use TypeScript Types for Dynamic Assets

```typescript
// ✅ Good - Analyzer can detect all possible values
type FlowerType = 'rose' | 'tulip' | 'lily';

// ❌ Bad - Analyzer can't determine values
function loadFlower(type: string) {
  return loadImage(`./assets/flowers/${type}.png`);
}
```

### Use Const Assertions

```typescript
// ✅ Good - Analyzer can detect all values
const FLOWERS = ['rose', 'tulip', 'lily'] as const;

// ❌ Bad - Analyzer can't determine values
const FLOWERS = ['rose', 'tulip', 'lily'];
```

### Document Dynamic Assets

If you have truly dynamic assets (user-generated content, API responses), document them:

```typescript
/**
 * @assets ./assets/user-content/*.png
 * These assets are loaded dynamically based on user input
 */
function loadUserAvatar(userId: string) {
  return loadImage(`./assets/user-content/${userId}.png`);
}
```

## Limitations

1. **Complex Dynamic Paths**: If asset paths depend on runtime data (API responses, user input), the analyzer can't predict them and falls back to directory packing
2. **String Concatenation**: Simple concatenation like `'./assets/' + name + '.png'` isn't fully supported (use template literals instead)
3. **Multiple Type References**: Templates with multiple type variables (e.g., `${type}/${name}.png`) aren't fully resolved yet

## Technical Details

- **Static Analysis**: Uses regex patterns to find asset references
- **Type Analysis**: Uses TypeScript Compiler API to extract type information
- **Packing Algorithm**: Maximal Rectangles bin packing with rotation support
- **Output Format**: PNG sprite sheet + JSON map

## Files

- `scripts/asset-analyzer.ts` - Static and type analysis engine
- `scripts/pack-assets.ts` - Packing script with smart mode integration

import sharp from 'sharp';
import { writeFileSync, mkdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  rotated?: boolean;
}

interface ImageInfo {
  path: string;
  name: string;
  width: number;
  height: number;
}

interface PackedImage {
  name: string;
  originalPath: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotated: boolean;
}

// Next power of 2
function nextPow2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

class ShelfPacker {
  private shelves: { y: number; height: number; x: number }[] = [];
  private currentShelf: { y: number; height: number; x: number } | null = null;
  private binWidth: number;
  private binHeight: number;
  private padding: number;

  constructor(width: number, height: number, padding: number = 2) {
    this.binWidth = width;
    this.binHeight = height;
    this.padding = padding;
    this.currentShelf = { y: padding, height: 0, x: padding };
  }

  insert(width: number, height: number, allowRotation: boolean = true): Rect | null {
    // Try normal orientation
    let result = this.tryPlace(width, height, false);
    if (result) return result;

    // Try rotated if allowed
    if (allowRotation && width !== height) {
      result = this.tryPlace(height, width, true);
      if (result) {
        result.rotated = true;
        return result;
      }
    }

    return null;
  }

  private tryPlace(width: number, height: number, rotated: boolean): Rect | null {
    const paddedWidth = width + this.padding;
    const paddedHeight = height + this.padding;

    if (!this.currentShelf) return null;

    // Check if fits in current shelf
    if (this.currentShelf.x + paddedWidth <= this.binWidth &&
        this.currentShelf.y + paddedHeight <= this.binHeight) {

      const rect: Rect = {
        x: this.currentShelf.x,
        y: this.currentShelf.y,
        width: width,
        height: height,
        rotated: rotated
      };

      // Update shelf position
      this.currentShelf.x += paddedWidth;

      // Update shelf height if needed
      if (height > this.currentShelf.height) {
        this.currentShelf.height = height;
      }

      return rect;
    }

    // Create new shelf
    const newY = this.currentShelf.y + this.currentShelf.height + this.padding;
    if (newY + paddedHeight > this.binHeight) return null;

    this.currentShelf = {
      y: newY,
      height: height,
      x: this.padding
    };

    if (paddedWidth > this.binWidth) return null;

    const rect: Rect = {
      x: this.currentShelf.x,
      y: this.currentShelf.y,
      width: width,
      height: height,
      rotated: rotated
    };

    this.currentShelf.x += paddedWidth;
    return rect;
  }

  getUsedHeight(): number {
    if (!this.currentShelf) return 0;
    return this.currentShelf.y + this.currentShelf.height;
  }
}

interface AssetManifest {
  [category: string]: string[];
}

async function packAssets(manifestPath: string, outputDir: string): Promise<void> {
  console.log('📦 Packing assets from manifest...');

  // Load manifest
  let manifest: AssetManifest;
  try {
    const manifestContent = readFileSync(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestContent);
  } catch (error) {
    console.error('❌ Failed to load manifest:', error);
    return;
  }

  // Collect all image paths from manifest
  const imageFiles: string[] = [];
  for (const category of Object.keys(manifest)) {
    const assets = manifest[category];
    console.log(`   ${category}: ${assets.length} assets`);
    imageFiles.push(...assets);
  }

  console.log(`\n📦 Total: ${imageFiles.length} images to pack`);

  if (imageFiles.length === 0) {
    console.log('No images found in manifest!');
    return;
  }

  // Load image metadata
  const images: ImageInfo[] = [];
  const missingFiles: string[] = [];

  for (const file of imageFiles) {
    try {
      const metadata = await sharp(file).metadata();
      images.push({
        path: file,
        name: basename(file),
        width: metadata.width!,
        height: metadata.height!
      });
    } catch (error) {
      console.error(`❌ Failed to load ${file}:`, error);
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.log(`\n⚠️  ${missingFiles.length} files missing or invalid`);
  }

  if (images.length === 0) {
    console.log('No valid images to pack!');
    return;
  }

  // Sort by max dimension (largest first) - better for shelf packing
  images.sort((a, b) => Math.max(b.width, b.height) - Math.max(a.width, a.height));

  // Get max dimensions
  const maxDim = Math.max(...images.map(img => Math.max(img.width, img.height)));

  // Calculate bin size (power of 2, with some padding)
  const totalArea = images.reduce((sum, img) => sum + (img.width + 4) * (img.height + 4), 0);
  let binSize = nextPow2(Math.sqrt(totalArea * 1.2));
  binSize = Math.max(binSize, nextPow2(maxDim * 2));
  binSize = Math.min(binSize, 4096); // Cap at 4096x4096

  console.log(`\nUsing bin size: ${binSize}x${binSize} (power of 2)`);
  console.log(`Padding: 2px between sprites`);

  // Pack images using shelf algorithm
  const packer = new ShelfPacker(binSize, binSize, 2);
  const packed: PackedImage[] = [];
  const failedPacks: string[] = [];

  for (const img of images) {
    const rect = packer.insert(img.width, img.height, true);
    if (rect) {
      packed.push({
        name: img.name,
        originalPath: img.path,
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        rotated: rect.rotated || false
      });
    } else {
      console.error(`❌ Failed to pack ${img.name} (${img.width}x${img.height})`);
      failedPacks.push(img.name);
    }
  }

  console.log(`\n✅ Packed ${packed.length}/${images.length} images`);

  if (failedPacks.length > 0) {
    console.log(`⚠️  ${failedPacks.length} images failed to pack`);
  }

  // Create output directory
  mkdirSync(outputDir, { recursive: true });

  // Create sprite sheet
  const composites = [];
  for (const img of packed) {
    let image = sharp(img.originalPath);

    if (img.rotated) {
      image = image.rotate(90);
    }

    composites.push({
      input: await image.toBuffer(),
      left: img.x,
      top: img.y
    });
  }

  const spriteSheetPath = join(outputDir, 'sprites.png');
  await sharp({
    create: {
      width: binSize,
      height: binSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite(composites)
    .png()
    .toFile(spriteSheetPath);

  console.log(`\n📄 Created sprite sheet: ${spriteSheetPath}`);

  // Create JSON map
  const jsonMap = {
    meta: {
      image: 'sprites.png',
      size: { w: binSize, h: binSize },
      padding: 2
    },
    frames: {} as Record<string, any>
  };

  for (const img of packed) {
    const relativePath = img.originalPath.replace('assets/', '');
    jsonMap.frames[relativePath] = {
      frame: { x: img.x, y: img.y, w: img.width, h: img.height },
      rotated: img.rotated,
      trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: img.width, h: img.height },
      sourceSize: { w: img.width, h: img.height },
      originalPath: img.originalPath
    };
  }

  const jsonPath = join(outputDir, 'sprites.json');
  writeFileSync(jsonPath, JSON.stringify(jsonMap, null, 2));
  console.log(`📄 Created JSON map: ${jsonPath}`);

  console.log('\n✨ Asset packing complete!');
}

// Parse command line arguments
const args = process.argv.slice(2);
const manifestPath = args[0] || 'assets/manifest.json';
const outputDir = args[1] || 'assets/output';

packAssets(manifestPath, outputDir).catch(console.error);

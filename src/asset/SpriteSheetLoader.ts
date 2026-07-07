export interface SpriteFrame {
  frame: { x: number; y: number; w: number; h: number };
  rotated: boolean;
  trimmed: boolean;
  spriteSourceSize: { x: number; y: number; w: number; h: number };
  sourceSize: { w: number; h: number };
  originalPath?: string;
}

export interface SpriteSheetData {
  meta: {
    image: string;
    size: { w: number; h: number };
    smart?: boolean;
  };
  frames: Record<string, SpriteFrame>;
}

export class SpriteSheetLoader {
  #image: HTMLImageElement | null = null;
  #data: SpriteSheetData | null = null;
  #loaded = false;

  async load(sheetPath: string, jsonPath: string): Promise<void> {
    // Load JSON data
    const response = await fetch(jsonPath);
    if (!response.ok) {
      throw new Error(`Failed to load sprite sheet JSON: ${response.statusText}`);
    }
    this.#data = await response.json();

    // Load image
    this.#image = new Image();
    await new Promise<void>((resolve, reject) => {
      this.#image!.onload = () => resolve();
      this.#image!.onerror = () => reject(new Error('Failed to load sprite sheet image'));
      this.#image!.src = sheetPath;
    });

    this.#loaded = true;
  }

  isLoaded(): boolean {
    return this.#loaded;
  }

  getFrame(name: string): SpriteFrame | undefined {
    if (!this.#data) return undefined;
    return this.#data.frames[name];
  }

  getFrameNames(): string[] {
    if (!this.#data) return [];
    return Object.keys(this.#data.frames);
  }

  drawFrame(
    ctx: CanvasRenderingContext2D,
    name: string,
    x: number,
    y: number,
    width?: number,
    height?: number
  ): void {
    if (!this.#image || !this.#data) return;

    const frame = this.#data.frames[name];
    if (!frame) {
      console.warn(`Frame not found: ${name}`);
      return;
    }

    const { x: fx, y: fy, w: fw, h: fh } = frame.frame;
    const targetWidth = width || fw;
    const targetHeight = height || fh;

    ctx.save();

    if (frame.rotated) {
      // For rotated frames, we need to swap dimensions and rotate
      ctx.translate(x + targetWidth / 2, y + targetHeight / 2);
      ctx.rotate(Math.PI / 2);
      ctx.drawImage(
        this.#image,
        fx, fy, fw, fh,
        -targetHeight / 2, -targetWidth / 2,
        targetHeight, targetWidth
      );
    } else {
      ctx.drawImage(
        this.#image,
        fx, fy, fw, fh,
        x, y,
        targetWidth, targetHeight
      );
    }

    ctx.restore();
  }

  getImage(): HTMLImageElement | null {
    return this.#image;
  }

  getData(): SpriteSheetData | null {
    return this.#data;
  }
}

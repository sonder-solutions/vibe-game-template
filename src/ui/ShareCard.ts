import { Sprite } from '../core/engine/types.js';

export interface ShareField {
  type: 'username' | 'score' | 'time' | 'date' | 'custom';
  label: string;
  show: boolean;
  key?: string;
}

export interface BackgroundConfig {
  type: 'color' | 'gradient' | 'image';
  value: string; // color, gradient definition, or image URL
}

export interface SectionConfig {
  type: 'title' | 'stat' | 'character' | 'badge' | 'spacer';
  field?: string; // for stat sections
  position?: { x: number; y: number };
  size?: { width: number; height: number };
}

export interface LayoutConfig {
  type: 'vertical' | 'horizontal' | 'grid' | 'custom';
  padding?: number;
  spacing?: number;
  sections: SectionConfig[];
}

export interface CharacterConfig {
  renderType: 'canvas' | 'sprite' | 'callback';
  canvasId?: string; // if renderType is 'canvas'
  sprite?: Sprite; // if renderType is 'sprite'
  renderCallback?: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
}

export interface ImageConfig {
  width: number;
  height: number;
  background: BackgroundConfig;
  layout: LayoutConfig;
  character?: CharacterConfig;
}

export interface ShareCardConfig {
  title: string;
  fields: ShareField[];
  shareText?: string;
  image?: ImageConfig;
}

export class ShareCard extends HTMLElement {
  #shadow: ShadowRoot;
  #config: ShareCardConfig | null = null;
  #data: Record<string, unknown> = {};

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'closed' });
  }

  connectedCallback() {
    this.#render();
  }

  setConfig(config: ShareCardConfig): void {
    this.#config = config;
    this.#render();
  }

  setData(data: Record<string, unknown>): void {
    this.#data = data;
    this.#render();
  }

  getShareText(): string {
    return this.#generateShareText();
  }

  #formatField(field: ShareField): string {
    let value: unknown;

    if (field.type === 'custom' && field.key) {
      value = this.#data[field.key];
    } else {
      value = this.#data[field.type];
    }

    if (value === undefined || value === null) return '';

    switch (field.type) {
      case 'time':
        return this.#formatTime(value as number);

      case 'date':
        return this.#formatDate(value);

      default:
        return String(value);
    }
  }

  #formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  #formatDate(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return String(value);
  }

  #generateShareText(): string {
    if (!this.#config) return '';

    const template = this.#config.shareText || 'Check out my score!';
    return template.replace(/{(\w+)}/g, (match: string, key: string) => {
      const value = this.#data[key];
      if (key === 'time' && typeof value === 'number') {
        return this.#formatTime(value);
      }
      return value !== undefined ? String(value) : match;
    });
  }

  async #generateShareImage(): Promise<Blob> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const { width, height } = this.#config!.image!;

    canvas.width = width;
    canvas.height = height;

    // Draw background
    await this.#drawBackground(ctx, this.#config!.image!.background);

    // Draw sections based on layout
    await this.#drawLayout(ctx, this.#config!.image!.layout);

    // Convert to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob!), 'image/png');
    });
  }

  async #drawBackground(ctx: CanvasRenderingContext2D, bg: BackgroundConfig): Promise<void> {
    const { width, height } = ctx.canvas;

    switch (bg.type) {
      case 'color':
        ctx.fillStyle = bg.value;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'gradient':
        const gradient = this.#parseGradient(bg.value, width, height);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        break;

      case 'image':
        const img = await this.#loadImage(bg.value);
        ctx.drawImage(img, 0, 0, width, height);
        break;
    }
  }

  async #drawLayout(ctx: CanvasRenderingContext2D, layout: LayoutConfig): Promise<void> {
    const { padding = 20, spacing = 10 } = layout;
    let currentY = padding;
    const currentX = padding;

    for (const section of layout.sections) {
      switch (section.type) {
        case 'title':
          await this.#drawTitle(ctx, currentX, currentY);
          currentY += 40 + spacing;
          break;

        case 'stat':
          if (section.field) {
            await this.#drawStat(ctx, section.field, currentX, currentY);
            currentY += 30 + spacing;
          }
          break;

        case 'character':
          await this.#drawCharacter(ctx, currentX, currentY, section.size);
          currentY += (section.size?.height || 100) + spacing;
          break;

        case 'spacer':
          currentY += spacing * 2;
          break;
      }
    }
  }

  async #drawCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, size?: { width: number; height: number }): Promise<void> {
    const charConfig = this.#config!.image!.character;
    if (!charConfig) return;

    const width = size?.width || 100;
    const height = size?.height || 100;

    switch (charConfig.renderType) {
      case 'canvas':
        // Capture from game canvas
        const sourceCanvas = document.getElementById(charConfig.canvasId!) as HTMLCanvasElement;
        if (sourceCanvas) {
          ctx.drawImage(sourceCanvas, x, y, width, height);
        }
        break;

      case 'sprite':
        // Render sprite
        if (charConfig.sprite) {
          const sprite = charConfig.sprite;
          ctx.fillStyle = sprite.color || '#fff';
          ctx.fillRect(x, y, width, height);
        }
        break;

      case 'callback':
        // Use custom render function
        if (charConfig.renderCallback) {
          ctx.save();
          ctx.translate(x, y);
          charConfig.renderCallback(ctx, 0, 0);
          ctx.restore();
        }
        break;
    }
  }

  #parseGradient(definition: string, width: number, height: number): CanvasGradient {
    const tempCanvas = document.createElement('canvas');
    const ctx = tempCanvas.getContext('2d')!;

    if (definition.startsWith('linear')) {
      // Parse linear gradient: "linear(45deg, #000, #fff)"
      const match = definition.match(/linear\((\d+)deg,\s*(#.+),\s*(#.+)\)/);
      if (match) {
        const angle = parseInt(match[1]);
        const color1 = match[2];
        const color2 = match[3];

        // Convert angle to coordinates
        const radians = (angle * Math.PI) / 180;
        const x1 = width / 2 - Math.cos(radians) * width / 2;
        const y1 = height / 2 - Math.sin(radians) * height / 2;
        const x2 = width / 2 + Math.cos(radians) * width / 2;
        const y2 = height / 2 + Math.sin(radians) * height / 2;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
      }
    }

    // Default gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000');
    gradient.addColorStop(1, '#fff');
    return gradient;
  }

  #loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  async #drawTitle(ctx: CanvasRenderingContext2D, x: number, y: number): Promise<void> {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.#config!.title, x, y + 32);
  }

  async #drawStat(ctx: CanvasRenderingContext2D, fieldKey: string, x: number, y: number): Promise<void> {
    const field = this.#config!.fields.find(f => f.type === fieldKey || f.key === fieldKey);
    if (!field) return;

    const value = this.#formatField(field);
    if (!value) return;

    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${field.label}: ${value}`, x, y + 20);
  }

  #render(): void {
    // ShareCard is a utility component - no visible UI
    this.#shadow.innerHTML = '';
  }

  // Public method to trigger sharing
  async share(): Promise<void> {
    await this.#share();
  }

  async #share(): Promise<void> {
    const shareText = this.#generateShareText();

    // Generate image if configured
    let imageFile: File | undefined;
    if (this.#config?.image) {
      const blob = await this.#generateShareImage();
      imageFile = new File([blob], 'share.png', { type: 'image/png' });
    }

    if (navigator.share) {
      try {
        const shareData: ShareData = {
          title: this.#config?.title,
          text: shareText,
          url: window.location.href,
        };

        // Try to add file if we have one
        if (imageFile) {
          shareData.files = [imageFile];

          // Check if the complete share data (with files) is supported
          if (!navigator.canShare || !navigator.canShare(shareData)) {
            // If files aren't supported with text, try without files
            delete shareData.files;
            console.warn('Sharing with files not supported, sharing text only');
          }
        }

        await navigator.share(shareData);
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      // Fallback: download image and copy text
      if (imageFile) {
        this.#downloadImage(imageFile);
        // Also copy share text to clipboard
        try {
          await navigator.clipboard.writeText(shareText);
          alert(`Image downloaded! Share text copied to clipboard:\n\n"${shareText}"`);
        } catch (err) {
          console.error('Copy failed:', err);
          alert(`Image downloaded!\n\nShare message:\n"${shareText}"`);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareText);
          alert('Share text copied to clipboard!');
        } catch (err) {
          console.error('Copy failed:', err);
        }
      }
    }
  }

  #downloadImage(file: File): void {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
  }
}

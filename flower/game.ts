import { EngineFactory } from '../src/core/engine/EngineFactory.js';
import { GameLoop } from '../src/core/engine/GameLoop.js';
import { IEngine } from '../src/core/engine/IEngine.js';
import { InputManager } from '../src/modules/input/index.js';
import { Slider } from '../src/ui/Slider.js';
import { SpriteSheetLoader } from '../src/asset/SpriteSheetLoader.js';
import { Sprite } from '../src/core/engine/types.js';
import { FlowerType, FLOWER_TYPES } from './types.js';
import { CommunicationManager } from '../src/modules/security/CommunicationManager.js';
import { MobileProtection } from '../src/modules/mobile/MobileProtection.js';

// Register custom elements
customElements.define('game-slider', Slider);

class FlowerGame {
  private engine: IEngine | null = null;
  private gameLoop: GameLoop | null = null;
  private input: InputManager | null = null;
  private spriteSheet: SpriteSheetLoader;
  private selectedFlower: Sprite | null = null;
  private rotationSlider: Slider | null = null;
  private sizeSlider: Slider | null = null;
  private flowers: Map<string, Sprite> = new Map();
  private flowerTypes: Map<string, FlowerType> = new Map();
  private flowerCounter = 0;

  constructor() {
    this.spriteSheet = new SpriteSheetLoader();
  }

  async initialize(): Promise<void> {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    // Create security service for dependency injection
    const security = new CommunicationManager();

    // Initialize engine - use EngineFactory to get best available engine
    this.engine = await EngineFactory.createEngine(canvas, undefined, security);
    await this.engine.initialize({
      canvas,
      width: canvas.width,
      height: canvas.height
    });

    // Enable mobile protection
    const protection = new MobileProtection({
      target: canvas,
      preventPullToRefresh: true,
      preventDoubleTapZoom: true,
      preventPinchZoom: true,
      preventContextMenu: true
    });
    protection.enable();

    // Initialize input manager
    this.input = new InputManager();

    // Initialize game loop
    this.gameLoop = new GameLoop();

    // Load sprite sheet (with cache-busting)
    try {
      const timestamp = Date.now();
      await this.spriteSheet.load(
        `../assets/output/sprites.png?t=${timestamp}`,
        `../assets/output/sprites.json?t=${timestamp}`
      );
      console.log('Sprite sheet loaded successfully');
    } catch (error) {
      console.warn('Failed to load sprite sheet, using fallback rendering:', error);
    }

    // Initialize sliders after DOM is ready
    this.rotationSlider = document.querySelector('game-slider[label="Rotation (A/D)"]') as Slider;
    this.sizeSlider = document.querySelector('game-slider[label="Size (W/S)"]') as Slider;

    this.setupUI();
    this.setupControls();
    this.setupDragAndDrop();
    this.setupKeyboardControls();

    // Start game loop
    this.gameLoop.start(
      (deltaTime) => this.update(deltaTime),
      () => this.render()
    );
  }

  private setupUI(): void {
    const palette = document.getElementById('flowerPalette');
    if (!palette) return;

    // Create scroll container
    const scrollContent = document.createElement('div');
    scrollContent.className = 'scroll-content';

    // Map of flower types to their keyboard shortcuts
    const flowerKeyMap: { [key in FlowerType]: string } = {
      'rose': '1',
      'tulip': '2',
      'lily': '3',
      'daisy': '4',
      'sunflower': '5',
      'cosmo': '6',
      'daffodil': '7',
      'lavender': '8',
      'lilyOfTheValley': '9',
      'orchid': '0',
      'pansy': 'i',
      'poppy': 'o'
    };

    // Create flower buttons with image previews
    FLOWER_TYPES.forEach(type => {
      const button = document.createElement('button');
      button.className = 'flower-button';
      button.dataset.flowerType = type;

      // Create canvas for flower preview
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');

      if (ctx && this.spriteSheet.isLoaded()) {
        const spriteName = `flowers/${type}.png`;
        this.spriteSheet.drawFrame(ctx, spriteName, 0, 0, 48, 48);
      }

      button.appendChild(canvas);

      // Add key badge
      const keyBadge = document.createElement('span');
      keyBadge.className = 'flower-key-badge';
      keyBadge.textContent = flowerKeyMap[type];
      button.appendChild(keyBadge);

      button.addEventListener('click', () => this.addFlowerToCanvas(type));
      scrollContent.appendChild(button);
    });

    // Duplicate flowers for infinite scroll
    const clonedContent = scrollContent.cloneNode(true) as HTMLElement;

    // Redraw flowers on cloned canvases (canvas content doesn't clone)
    const clonedButtons = clonedContent.querySelectorAll('.flower-button');
    clonedButtons.forEach((button, index) => {
      const type = FLOWER_TYPES[index];
      const canvas = button.querySelector('canvas') as HTMLCanvasElement;
      if (canvas && type) {
        const ctx = canvas.getContext('2d');
        if (ctx && this.spriteSheet.isLoaded()) {
          const spriteName = `flowers/${type}.png`;
          this.spriteSheet.drawFrame(ctx, spriteName, 0, 0, 48, 48);
        }
      }
    });

    palette.appendChild(scrollContent);
    palette.appendChild(clonedContent);

    // Clear button
    const clearBtn = document.getElementById('clearBtn');
    clearBtn?.addEventListener('click', () => this.clearCanvas());

    // Bring to top button
    const bringToTopBtn = document.getElementById('bringToTopBtn');
    bringToTopBtn?.addEventListener('click', () => this.bringSelectedToTop());

    // Delete button
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn?.addEventListener('click', () => this.deleteSelectedFlower());

    // Flip button
    const flipBtn = document.getElementById('flipBtn');
    flipBtn?.addEventListener('click', () => this.flipSelectedFlower());

    // Share button
    const shareBtn = document.getElementById('shareBtn');
    shareBtn?.addEventListener('click', () => this.shareCanvas());
  }

  private async shareCanvas(): Promise<void> {
    if (!this.engine) return;

    const canvas = this.engine.getCanvas();

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        }, 'image/png');
      });

      // Get the current URL
      const url = window.location.href;
      const text = `Join us on ${url} to make beautiful flower arrangements`;

      // Create file object
      const file = new File([blob], 'flower-arrangement.png', { type: 'image/png' });

      // Check if Web Share API with files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Flower Arrangement',
          text: text
        });
      } else if (navigator.share) {
        // Fallback to sharing just the text if file sharing not supported
        await navigator.share({
          title: 'My Flower Arrangement',
          text: text,
          url: url
        });
        // Also download the image as fallback
        this.downloadCanvasImage(canvas);
      } else {
        // Fallback: just download the image
        this.downloadCanvasImage(canvas);
        alert(`Share this text: "${text}"`);
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error sharing:', error);
        // Fallback: download the image
        this.downloadCanvasImage(canvas);
      }
    }
  }

  private downloadCanvasImage(canvas: HTMLCanvasElement): void {
    const link = document.createElement('a');
    link.download = 'flower-arrangement.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  private deleteSelectedFlower(): void {
    if (!this.selectedFlower || !this.engine) return;

    const id = this.selectedFlower.id;

    // Remove from engine and maps
    this.engine.removeSprite(id);
    this.flowers.delete(id);
    this.flowerTypes.delete(id);

    // Clear selection and disable controls
    this.selectedFlower = null;
    const controls = document.getElementById('controls');
    controls?.classList.add('disabled');
  }

  private bringSelectedToTop(): void {
    if (!this.selectedFlower || !this.engine) return;

    const id = this.selectedFlower.id;
    const flowerType = this.flowerTypes.get(id);

    if (!flowerType) return;

    // Remove and re-add to move to end of map (renders on top)
    this.engine.removeSprite(id);
    this.flowers.delete(id);
    this.flowerTypes.delete(id);

    const newId = `flower_${this.flowerCounter++}`;
    const sprite: Sprite = {
      id: newId,
      position: { ...this.selectedFlower.position },
      velocity: { x: 0, y: 0 },
      width: this.selectedFlower.width,
      height: this.selectedFlower.height,
      rotation: this.selectedFlower.rotation,
      spriteSheet: this.selectedFlower.spriteSheet,
      spriteFrame: this.selectedFlower.spriteFrame
    };

    this.engine.addSprite(sprite);
    this.flowers.set(newId, sprite);
    this.flowerTypes.set(newId, flowerType);
    this.selectedFlower = sprite;
  }

  private flipSelectedFlower(): void {
    if (!this.selectedFlower) return;

    // Negate width to flip horizontally
    this.selectedFlower.width = -this.selectedFlower.width;
  }

  private setupControls(): void {
    if (!this.rotationSlider || !this.sizeSlider) return;

    // Rotation slider
    this.rotationSlider.onChange((rotation) => {
      if (this.selectedFlower) {
        this.selectedFlower.rotation = rotation * Math.PI / 180;
      }
    });

    // Size slider
    this.sizeSlider.onChange((size) => {
      if (this.selectedFlower) {
        this.selectedFlower.width = size;
        this.selectedFlower.height = size;
      }
    });
  }

  private setupDragAndDrop(): void {
    if (!this.input || !this.engine) return;

    const canvas = this.engine.getCanvas();

    // Mouse/Touch down - select flower
    const handlePointerDown = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      // Check if clicked on a flower
      const clickedFlower = this.getFlowerAtPosition(x, y);
      if (clickedFlower) {
        this.selectedFlower = clickedFlower;
        if (this.rotationSlider) {
          this.rotationSlider.setValue((clickedFlower.rotation || 0) * 180 / Math.PI);
        }
        if (this.sizeSlider) {
          this.sizeSlider.setValue(clickedFlower.width);
        }

        // Enable controls
        const controls = document.getElementById('controls');
        controls?.classList.remove('disabled');
      } else {
        this.selectedFlower = null;

        // Disable controls
        const controls = document.getElementById('controls');
        controls?.classList.add('disabled');
      }
    };

    // Mouse events
    canvas.addEventListener('mousedown', (e) => {
      handlePointerDown(e.clientX, e.clientY);
    });

    // Touch events for mobile
    canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      handlePointerDown(touch.clientX, touch.clientY);
    });

    // Mouse/Touch move - drag selected flower
    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!this.selectedFlower) return;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (clientX - rect.left) * scaleX;
      const y = (clientY - rect.top) * scaleY;

      this.selectedFlower.position.x = x - this.selectedFlower.width / 2;
      this.selectedFlower.position.y = y - this.selectedFlower.height / 2;
    };

    canvas.addEventListener('mousemove', (e) => {
      if (!this.selectedFlower || !this.input!.isMouseDown()) return;
      handlePointerMove(e.clientX, e.clientY);
    });

    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!this.selectedFlower) return;
      const touch = e.touches[0];
      handlePointerMove(touch.clientX, touch.clientY);
    });

    // Mouse/Touch up - keep flower selected
    canvas.addEventListener('mouseup', () => {
      // Flower remains selected
    });

    canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      // Flower remains selected
    });
  }

  private setupKeyboardControls(): void {
    // Map number keys and letters to flower types
    const keyToFlowerMap: { [key: string]: FlowerType } = {
      '1': 'rose',
      '2': 'tulip',
      '3': 'lily',
      '4': 'daisy',
      '5': 'sunflower',
      '6': 'cosmo',
      '7': 'daffodil',
      '8': 'lavender',
      '9': 'lilyOfTheValley',
      '0': 'orchid',
      'i': 'pansy',
      'o': 'poppy'
    };

    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // Create flower with number/letter keys
      if (keyToFlowerMap[key]) {
        e.preventDefault();
        this.addFlowerToCanvas(keyToFlowerMap[key]);
        return;
      }

      // Tab - toggle selected flower
      if (key === 'tab') {
        e.preventDefault();
        this.toggleSelectedFlower();
        return;
      }

      // A/D - rotate left/right
      if (key === 'a' && this.selectedFlower) {
        e.preventDefault();
        this.selectedFlower.rotation = (this.selectedFlower.rotation || 0) + Math.PI / 18; // +10 degrees
        this.rotationSlider?.setValue((this.selectedFlower.rotation || 0) * 180 / Math.PI);
        return;
      }
      if (key === 'd' && this.selectedFlower) {
        e.preventDefault();
        this.selectedFlower.rotation = (this.selectedFlower.rotation || 0) - Math.PI / 18; // -10 degrees
        this.rotationSlider?.setValue((this.selectedFlower.rotation || 0) * 180 / Math.PI);
        return;
      }

      // W/S - enlarge/shrink
      if (key === 'w' && this.selectedFlower) {
        e.preventDefault();
        const newSize = Math.min(512, (this.selectedFlower.width || 256) + 16);
        this.selectedFlower.width = newSize;
        this.selectedFlower.height = newSize;
        this.sizeSlider?.setValue(newSize);
        return;
      }
      if (key === 's' && this.selectedFlower) {
        e.preventDefault();
        const newSize = Math.max(128, (this.selectedFlower.width || 256) - 16);
        this.selectedFlower.width = newSize;
        this.selectedFlower.height = newSize;
        this.sizeSlider?.setValue(newSize);
        return;
      }

      // Q - bring to top
      if (key === 'q' && this.selectedFlower) {
        e.preventDefault();
        this.bringSelectedToTop();
        return;
      }

      // E - delete
      if (key === 'e' && this.selectedFlower) {
        e.preventDefault();
        this.deleteSelectedFlower();
        return;
      }

      // / - flip
      if (key === '/' && this.selectedFlower) {
        e.preventDefault();
        this.flipSelectedFlower();
        return;
      }

      // Delete - clear screen
      if (key === 'delete') {
        e.preventDefault();
        this.clearCanvas();
        return;
      }

      // Enter - share
      if (key === 'enter') {
        e.preventDefault();
        this.shareCanvas();
        return;
      }

      // Arrow keys - move selected flower
      if (this.selectedFlower) {
        const moveStep = 10;
        if (key === 'arrowleft') {
          e.preventDefault();
          this.selectedFlower.position.x -= moveStep;
        } else if (key === 'arrowright') {
          e.preventDefault();
          this.selectedFlower.position.x += moveStep;
        } else if (key === 'arrowup') {
          e.preventDefault();
          this.selectedFlower.position.y -= moveStep;
        } else if (key === 'arrowdown') {
          e.preventDefault();
          this.selectedFlower.position.y += moveStep;
        }
      }
    });
  }

  private toggleSelectedFlower(): void {
    if (!this.engine) return;

    const flowerArray = Array.from(this.flowers.values());
    if (flowerArray.length === 0) return;

    if (!this.selectedFlower) {
      // Select first flower
      this.selectedFlower = flowerArray[0];
    } else {
      // Select next flower
      const currentIndex = flowerArray.indexOf(this.selectedFlower);
      const nextIndex = (currentIndex + 1) % flowerArray.length;
      this.selectedFlower = flowerArray[nextIndex];
    }

    // Update sliders
    this.rotationSlider?.setValue((this.selectedFlower.rotation || 0) * 180 / Math.PI);
    this.sizeSlider?.setValue(this.selectedFlower.width);

    // Enable controls
    const controls = document.getElementById('controls');
    controls?.classList.remove('disabled');
  }

  private addFlowerToCanvas(type: FlowerType): void {
    if (!this.engine) return;

    const id = `flower_${this.flowerCounter++}`;
    const spriteName = `flowers/${type}.png`;
    const frame = this.spriteSheet.getFrame(spriteName);

    const sprite: Sprite = {
      id,
      position: { x: 400, y: 300 },
      velocity: { x: 0, y: 0 },
      width: 256,
      height: 256,
      rotation: 0,
      spriteSheet: this.spriteSheet.getImage() || undefined,
      spriteFrame: frame ? {
        x: frame.frame.x,
        y: frame.frame.y,
        w: frame.frame.w,
        h: frame.frame.h,
        rotated: frame.rotated
      } : undefined
    };

    this.engine.addSprite(sprite);
    this.flowers.set(id, sprite);
    this.flowerTypes.set(id, type);
    this.selectedFlower = sprite;

    // Update controls to match new flower
    this.rotationSlider?.setValue(0);
    this.sizeSlider?.setValue(256);

    // Enable controls
    const controls = document.getElementById('controls');
    controls?.classList.remove('disabled');
  }

  private getFlowerAtPosition(x: number, y: number): Sprite | null {
    if (!this.engine) return null;

    // Check flowers in reverse order (top-most first)
    const flowerArray = Array.from(this.flowers.values()).reverse();
    for (const flower of flowerArray) {
      // Normalize bounding box to handle negative width (flipped flowers)
      const left = Math.min(flower.position.x, flower.position.x + flower.width);
      const right = Math.max(flower.position.x, flower.position.x + flower.width);
      const top = Math.min(flower.position.y, flower.position.y + flower.height);
      const bottom = Math.max(flower.position.y, flower.position.y + flower.height);

      if (
        x >= left &&
        x <= right &&
        y >= top &&
        y <= bottom
      ) {
        return flower;
      }
    }
    return null;
  }

  private clearCanvas(): void {
    if (!this.engine) return;

    // Remove all flowers
    this.flowers.forEach((_, id) => {
      this.engine?.removeSprite(id);
    });
    this.flowers.clear();
    this.flowerTypes.clear();
    this.selectedFlower = null;
  }

  private update(deltaTime: number): void {
    this.engine?.update(deltaTime);
  }

  private render(): void {
    // Use engine's render method - no custom rendering
    this.engine?.render();
  }
}

// Initialize game
const game = new FlowerGame();
game.initialize().catch(console.error);

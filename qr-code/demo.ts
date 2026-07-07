/**
 * QArt QR Code Demo - Interactive demonstration of QArt QR code generation
 */

import { QArtGenerator } from '../src/modules/qr/QArtGenerator';
import type { QArtOptions, ErrorCorrectionLevel } from '../src/modules/qr/QArtGenerator.types';
import { QRScanner } from '../src/modules/qr/QRScanner';
import { FountainQREncoder, FountainQRDecoder } from '../src/modules/qr/FountainQR';
import type { QRScanResult } from '../src/modules/qr/QRScanner';
import type { FountainProgress } from '../src/modules/qr/bc-ur';
import QRCode from 'qrcode';

class QArtDemo {
  private generator: QArtGenerator;
  private currentImage: HTMLImageElement | null = null;
  private currentData: string = '';
  private currentOptions: QArtOptions = {};
  private currentMode: 'generate' | 'scan' = 'generate';
  private qrScanner?: QRScanner;
  private fountainEncoder?: FountainQREncoder;
  private fountainDecoder?: FountainQRDecoder;
  private animationInterval?: number;
  private fountainFrames?: string[];
  private fountainFrameIndex: number = 0;
  private isFountainPlaying: boolean = false;
  private fountainFillColor: string = '#000000';
  private fountainBackgroundColor: string = '#ffffff';
  private audioContext?: AudioContext;
  private currentCameraIndex: number = 0;
  private scannerInitialized: boolean = false;

  constructor() {
    this.generator = new QArtGenerator();
    this.initializeEventListeners();
    this.updateCapacityInfo();

    // Enable generate button by default (image is optional)
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    generateBtn.disabled = false;

    // Cleanup on page unload — close AudioContext and release camera
    window.addEventListener('pagehide', () => {
      this.audioContext?.close().catch(() => {});
      this.destroyScanner();
    });
  }

  private initializeEventListeners(): void {
    // QR Data input
    const qrDataInput = document.getElementById('qrData') as HTMLTextAreaElement;
    this.currentData = qrDataInput.value; // Initialize with default value
    qrDataInput.addEventListener('input', () => {
      this.currentData = qrDataInput.value;
      this.updateCapacityInfo();
    });

    // Image upload
    const imageUpload = document.getElementById('imageUpload') as HTMLInputElement;
    imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));

    // Image URL loading
    const loadImageBtn = document.getElementById('loadImageBtn') as HTMLButtonElement;
    loadImageBtn.addEventListener('click', () => this.loadImageFromURL());

    // Sliders
    this.setupSlider('posX', 'posXValue', (value) => {
      this.currentOptions.imageTransform = {
        ...this.currentOptions.imageTransform || { x: 0, y: 0, scale: 1.0 },
        x: value
      };
    });

    this.setupSlider('posY', 'posYValue', (value) => {
      this.currentOptions.imageTransform = {
        ...this.currentOptions.imageTransform || { x: 0, y: 0, scale: 1.0 },
        y: value
      };
    });

    this.setupSlider('scale', 'scaleValue', (value) => {
      this.currentOptions.imageTransform = {
        ...this.currentOptions.imageTransform || { x: 0, y: 0, scale: 1.0 },
        scale: value
      };
    }, true);

    this.setupSlider('threshold', 'thresholdValue', (value) => {
      this.currentOptions.threshold = value;
    });

    this.setupSlider('modulePixelSize', 'modulePixelSizeValue', (value) => {
      this.currentOptions.modulePixelSize = value;
    });

    this.setupSlider('version', 'versionValue', (value) => {
      this.currentOptions.qrVersion = value;
      this.updateModuleCount(value);
      this.updateCapacityInfo();
    });

    // Version buttons
    const decreaseVersion = document.getElementById('decreaseVersion') as HTMLButtonElement;
    decreaseVersion.addEventListener('click', () => this.adjustVersion(-1));

    const increaseVersion = document.getElementById('increaseVersion') as HTMLButtonElement;
    increaseVersion.addEventListener('click', () => this.adjustVersion(1));

    // Error correction level
    const ecLevels = document.querySelectorAll('input[name="ecLevel"]');
    ecLevels.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.currentOptions.errorCorrectionLevel = target.value as ErrorCorrectionLevel;
        this.updateCapacityInfo();
      });
    });

    // Filter type
    const filters = document.querySelectorAll('input[name="filter"]');
    filters.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.currentOptions.filter = target.value as 'threshold' | 'color';
      });
    });

    // Advanced options
    const randCheck = document.getElementById('randCheck') as HTMLInputElement;
    randCheck.addEventListener('change', () => {
      this.currentOptions.rand = randCheck.checked;
    });

    const ditherCheck = document.getElementById('ditherCheck') as HTMLInputElement;
    ditherCheck.addEventListener('change', () => {
      this.currentOptions.dither = ditherCheck.checked;
    });

    const onlyDataBitsCheck = document.getElementById('onlyDataBitsCheck') as HTMLInputElement;
    onlyDataBitsCheck.addEventListener('change', () => {
      this.currentOptions.onlyDataBits = onlyDataBitsCheck.checked;
    });

    // Colors
    const fillColor = document.getElementById('fillColor') as HTMLInputElement;
    fillColor.addEventListener('input', () => {
      this.currentOptions.fillColor = fillColor.value;
    });

    const backgroundColor = document.getElementById('backgroundColor') as HTMLInputElement;
    backgroundColor.addEventListener('input', () => {
      this.currentOptions.backgroundColor = backgroundColor.value;
    });

    // Action buttons
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    generateBtn.addEventListener('click', () => this.generateQR());

    const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
    downloadBtn.addEventListener('click', () => this.downloadQR());

    const downloadSvgBtn = document.getElementById('downloadSvgBtn') as HTMLButtonElement;
    downloadSvgBtn.addEventListener('click', () => this.downloadSVGG());

    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    resetBtn.addEventListener('click', () => this.resetAll());

    // Fountain mode checkboxes (inline + fountain section)
    const fountainEnabledInline = document.getElementById('fountainEnabledInline') as HTMLInputElement;
    const fountainEnabledOld = document.getElementById('fountainEnabled') as HTMLInputElement;

    // Sync both checkboxes and update fountain mode
    fountainEnabledInline?.addEventListener('change', () => {
      if (fountainEnabledOld) fountainEnabledOld.checked = fountainEnabledInline.checked;
      this.updateFountainMode();
    });

    fountainEnabledOld?.addEventListener('change', () => {
      if (fountainEnabledInline) fountainEnabledInline.checked = fountainEnabledOld.checked;
      this.updateFountainMode();
    });

    // Play/pause button
    document.getElementById('playPauseBtn')?.addEventListener('click', () => {
      this.toggleFountainAnimation();
    });

    // Restart button
    document.getElementById('restartBtn')?.addEventListener('click', () => {
      this.restartFountainAnimation();
    });

    // Copy result button
    document.getElementById('copyResultBtn')?.addEventListener('click', () => {
      this.copyScanResult();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Mode tabs
    this.initializeModeTabs();
  }

  private setupSlider(sliderId: string, valueId: string, callback: (value: number) => void, isFloat: boolean = false): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId) as HTMLElement;

    slider.addEventListener('input', () => {
      const value = isFloat ? parseFloat(slider.value) : parseInt(slider.value);
      valueDisplay.textContent = isFloat ? value.toFixed(1) : value.toString();
      callback(value);
    });
  }

  private async handleImageUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.loadImage(dataUrl);
    };

    reader.readAsDataURL(file);
  }

  private async loadImageFromURL(): Promise<void> {
    const urlInput = document.getElementById('imageURL') as HTMLInputElement;
    const url = urlInput.value.trim();

    if (!url) {
      alert('Please enter an image URL');
      return;
    }

    try {
      await this.loadImage(url);
    } catch (error) {
      alert(`Failed to load image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async loadImage(source: string): Promise<void> {
    try {
      this.currentImage = await this.generator.loadImage(source);

      // Show preview
      const preview = document.getElementById('imagePreview') as HTMLElement;
      const previewImg = document.getElementById('previewImg') as HTMLImageElement;
      previewImg.src = source;
      preview.classList.remove('hidden');

      // Enable generate button
      const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
      generateBtn.disabled = false;
    } catch (error) {
      console.error('Failed to load image:', error);
      throw error;
    }
  }

  private async generateQR(): Promise<void> {
    if (!this.currentData) {
      alert('Please enter data to encode');
      return;
    }

    const fountainEnabled = document.getElementById('fountainEnabledInline') as HTMLInputElement;

    if (fountainEnabled?.checked) {
      await this.generateFountainQR();
      return;
    }

    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;
    const qrContainer = document.getElementById('qrContainer') as HTMLElement;

    try {
      generateBtn.classList.add('loading');
      generateBtn.disabled = true;

      const result = await this.generator.generateQR(
        this.currentData,
        this.currentImage,
        this.currentOptions
      );

      // Display result
      const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
      const placeholder = document.getElementById('placeholder') as HTMLElement;

      canvas.width = result.canvas.width;
      canvas.height = result.canvas.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(result.canvas, 0, 0);
      }

      placeholder.classList.add('hidden');
      canvas.classList.remove('hidden');

      // Update stats
      const stats = document.getElementById('stats') as HTMLElement;
      stats.classList.remove('hidden');

      document.getElementById('statModules').textContent = result.moduleCount.toString();
      document.getElementById('statVersion').textContent = result.qrVersion.toString();
      document.getElementById('statCapacity').textContent = result.dataCapacity.toString();

      // Show scan instructions
      const scanInstructions = document.getElementById('scanInstructions') as HTMLElement;
      scanInstructions.classList.remove('hidden');

      // Enable download buttons
      const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
      downloadBtn.disabled = false;
      const downloadSvgBtn = document.getElementById('downloadSvgBtn') as HTMLButtonElement;
      downloadSvgBtn.disabled = false;

    } catch (error) {
      console.error('Failed to generate QR:', error);
      alert(`Failed to generate QR code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      generateBtn.classList.remove('loading');
      generateBtn.disabled = false;
    }
  }

  private downloadQR(): void {
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = `qart-qr-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  private async downloadSVGG(): Promise<void> {
    if (!this.currentImage || !this.currentData) {
      alert('Please generate a QR code first');
      return;
    }

    try {
      const svg = await this.generator.generateQRSVG(
        this.currentData,
        this.currentImage,
        this.currentOptions
      );

      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `qart-qr-${Date.now()}.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate SVG:', error);
      alert(`Failed to generate SVG: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private resetAll(): void {
    // Reset form
    (document.getElementById('qrData') as HTMLTextAreaElement).value = 'https://example.com';
    (document.getElementById('imageUpload') as HTMLInputElement).value = '';
    (document.getElementById('imageURL') as HTMLInputElement).value = '';
    document.getElementById('imagePreview').classList.add('hidden');

    // Reset sliders
    this.resetSlider('posX', 'posXValue', 0);
    this.resetSlider('posY', 'posYValue', 0);
    this.resetSlider('scale', 'scaleValue', 1.0, true);
    this.resetSlider('threshold', 'thresholdValue', 128);
    this.resetSlider('version', 'versionValue', 5);

    // Reset error correction
    const hRadio = document.querySelector('input[name="ecLevel"][value="H"]') as HTMLInputElement;
    hRadio.checked = true;

    // Reset colors
    (document.getElementById('fillColor') as HTMLInputElement).value = '#000000';
    (document.getElementById('backgroundColor') as HTMLInputElement).value = '#FFFFFF';

    // Reset advanced options
    (document.getElementById('randCheck') as HTMLInputElement).checked = false;
    (document.getElementById('ditherCheck') as HTMLInputElement).checked = false;
    (document.getElementById('onlyDataBitsCheck') as HTMLInputElement).checked = false;

    // Reset state
    this.currentImage = null;
    this.currentData = 'https://example.com';
    this.currentOptions = {};

    // Hide QR code
    document.getElementById('qrCanvas').classList.add('hidden');
    document.getElementById('placeholder').classList.remove('hidden');
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('scanInstructions').classList.add('hidden');

    // Disable download buttons (generate button stays enabled since image is optional)
    (document.getElementById('downloadBtn') as HTMLButtonElement).disabled = true;
    (document.getElementById('downloadSvgBtn') as HTMLButtonElement).disabled = true;

    // Reset scanner/fountain state
    this.fountainEncoder = undefined;
    this.fountainDecoder?.reset();
    this.fountainDecoder = undefined;

    // Reset fountain animation state
    this.stopFountainAnimation();
    this.fountainFrames = undefined;
    this.fountainFrameIndex = 0;
    this.isFountainPlaying = false;
    this.fountainFillColor = '#000000';
    this.fountainBackgroundColor = '#ffffff';

    // Reset fountain UI
    const fountainEnabled = document.getElementById('fountainEnabled') as HTMLInputElement;
    if (fountainEnabled) {
      fountainEnabled.checked = false;
    }
    const fountainEnabledInline = document.getElementById('fountainEnabledInline') as HTMLInputElement;
    if (fountainEnabledInline) {
      fountainEnabledInline.checked = false;
    }
    document.getElementById('fountain-controls')?.classList.add('hidden');

    // Hide scan result
    document.getElementById('scan-result')?.classList.add('hidden');
    document.getElementById('scan-progress')?.classList.add('hidden');

    this.updateCapacityInfo();
    this.updateModuleCount(5);
  }

  private resetSlider(sliderId: string, valueId: string, defaultValue: number, isFloat: boolean = false): void {
    const slider = document.getElementById(sliderId) as HTMLInputElement;
    const valueDisplay = document.getElementById(valueId) as HTMLElement;
    slider.value = defaultValue.toString();
    valueDisplay.textContent = isFloat ? defaultValue.toFixed(1) : defaultValue.toString();
  }

  private adjustVersion(delta: number): void {
    const slider = document.getElementById('version') as HTMLInputElement;
    const currentValue = parseInt(slider.value);
    const newValue = Math.max(1, Math.min(20, currentValue + delta));

    slider.value = newValue.toString();
    document.getElementById('versionValue').textContent = newValue.toString();

    this.currentOptions.qrVersion = newValue;
    this.updateModuleCount(newValue);
    this.updateCapacityInfo();
  }

  private updateModuleCount(version: number): void {
    const moduleCount = 17 + version * 4;
    document.getElementById('moduleCount').textContent = moduleCount.toString();
  }

  private updateCapacityInfo(): void {
    const version = parseInt((document.getElementById('version') as HTMLInputElement).value);
    const ecLevel = (document.querySelector('input[name="ecLevel"]:checked') as HTMLInputElement).value as ErrorCorrectionLevel;
    const fountainEnabled = document.getElementById('fountainEnabledInline') as HTMLInputElement;

    const capacity = this.generator.getDataCapacity(version, ecLevel);
    const dataLength = this.currentData.length;

    const infoBox = document.getElementById('capacityInfo');
    if (!infoBox) return;

    // Clear existing content
    infoBox.innerHTML = '';

    if (fountainEnabled?.checked) {
      // Fountain mode: show bytes and frame count
      // Include the 6-byte header (4 bytes data length + 2 bytes frame count)
      // that FountainQREncoder prepends to every payload.
      const totalBytes = dataLength + 6;
      const fragmentSize = this.calculateFragmentSize(version, ecLevel);
      const redundancy = this.calculateRedundancy(ecLevel);
      const frameCount = fragmentSize > 0 ? Math.ceil((totalBytes / fragmentSize) * redundancy) : 0;

      const icon = document.createElement('i');
      icon.className = 'fas fa-layer-group';
      icon.style.color = '#667eea';
      infoBox.appendChild(icon);
      infoBox.appendChild(document.createTextNode(' '));
      infoBox.style.color = '#667eea';
      infoBox.appendChild(document.createTextNode(`${dataLength} bytes will be split into ${frameCount} frames`));
    } else {
      // Normal mode: show capacity info
      const icon = document.createElement('i');
      icon.className = dataLength > capacity ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
      icon.style.color = dataLength > capacity ? '#f44336' : '#667eea';
      infoBox.appendChild(icon);
      infoBox.appendChild(document.createTextNode(' '));

      if (dataLength > capacity) {
        infoBox.style.color = '#f44336';
        infoBox.appendChild(document.createTextNode(`Data too long! ${dataLength}/${capacity} bytes`));
      } else {
        infoBox.style.color = '#667eea';
        infoBox.appendChild(document.createTextNode(`Capacity: ${capacity} bytes (using ${dataLength} bytes)`));
      }
    }
  }

  private updateFountainMode(): void {
    const fountainEnabled = document.getElementById('fountainEnabledInline') as HTMLInputElement;
    const fountainControls = document.getElementById('fountain-controls');

    if (fountainEnabled?.checked) {
      fountainControls?.classList.remove('hidden');
    } else {
      fountainControls?.classList.add('hidden');
      this.stopFountainAnimation();
    }
    this.updateCapacityInfo();
  }

  private calculateFragmentSize(qrVersion: number, ecLevel: string): number {
    const QR_CAPACITY: Record<number, Record<string, number>> = {
      1: { L: 17, M: 14, Q: 11, H: 7 },
      2: { L: 32, M: 26, Q: 20, H: 14 },
      3: { L: 53, M: 42, Q: 32, H: 24 },
      4: { L: 78, M: 62, Q: 46, H: 34 },
      5: { L: 106, M: 84, Q: 60, H: 44 },
      6: { L: 134, M: 106, Q: 74, H: 58 },
      7: { L: 154, M: 122, Q: 86, H: 64 },
      8: { L: 192, M: 152, Q: 108, H: 84 },
      9: { L: 230, M: 180, Q: 130, H: 98 },
      10: { L: 271, M: 213, Q: 151, H: 119 },
      11: { L: 321, M: 251, Q: 177, H: 137 },
      12: { L: 367, M: 287, Q: 203, H: 155 },
      13: { L: 425, M: 331, Q: 241, H: 177 },
      14: { L: 458, M: 362, Q: 258, H: 194 },
      15: { L: 520, M: 412, Q: 292, H: 220 },
      16: { L: 586, M: 450, Q: 322, H: 250 },
      17: { L: 644, M: 504, Q: 364, H: 280 },
      18: { L: 718, M: 560, Q: 394, H: 310 },
      19: { L: 792, M: 624, Q: 442, H: 338 },
      20: { L: 858, M: 666, Q: 482, H: 382 },
    };

    const capacity = QR_CAPACITY[qrVersion]?.[ecLevel] || 50;
    // Reserve some bytes for UR framing overhead
    return Math.max(20, capacity - 20);
  }

  private calculateRedundancy(ecLevel: string): number {
    const REDUNDANCY_MAP: Record<string, number> = {
      L: 1.2,
      M: 1.5,
      Q: 2.0,
      H: 2.5
    };
    return REDUNDANCY_MAP[ecLevel] || 1.5;
  }

  private handleKeyboard(event: KeyboardEvent): void {
    // Don't handle shortcuts in scan mode
    if (this.currentMode === 'scan') {
      return;
    }

    // Ctrl+Enter: Generate QR
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.generateQR();
      return;
    }

    // Ctrl+S: Download QR
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      this.downloadQR();
      return;
    }

    // Arrow keys: Move image
    const step = 1;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.adjustPosition(-step, 0);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.adjustPosition(step, 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.adjustPosition(0, -step);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.adjustPosition(0, step);
    }

    // +/-: Scale image
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.adjustScale(1.1);
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      this.adjustScale(0.9);
    }

    // [/: Adjust QR version
    if (event.key === '[') {
      event.preventDefault();
      this.adjustVersion(-1);
    } else if (event.key === ']') {
      event.preventDefault();
      this.adjustVersion(1);
    }
  }

  private adjustPosition(deltaX: number, deltaY: number): void {
    const posXSlider = document.getElementById('posX') as HTMLInputElement;
    const posYSlider = document.getElementById('posY') as HTMLInputElement;

    const newX = Math.max(-50, Math.min(50, parseInt(posXSlider.value) + deltaX));
    const newY = Math.max(-50, Math.min(50, parseInt(posYSlider.value) + deltaY));

    posXSlider.value = newX.toString();
    posYSlider.value = newY.toString();

    document.getElementById('posXValue').textContent = newX.toString();
    document.getElementById('posYValue').textContent = newY.toString();

    this.currentOptions.imageTransform = {
      ...this.currentOptions.imageTransform || { x: 0, y: 0, scale: 1.0 },
      x: newX,
      y: newY
    };
  }

  private adjustScale(factor: number): void {
    const scaleSlider = document.getElementById('scale') as HTMLInputElement;
    const currentScale = parseFloat(scaleSlider.value);
    const newScale = Math.max(0.1, Math.min(3.0, currentScale * factor));

    scaleSlider.value = newScale.toString();
    document.getElementById('scaleValue').textContent = newScale.toFixed(1);

    this.currentOptions.imageTransform = {
      ...this.currentOptions.imageTransform || { x: 0, y: 0, scale: 1.0 },
      scale: newScale
    };
  }

  private initializeModeTabs(): void {
    const tabs = document.querySelectorAll('.mode-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const mode = (e.currentTarget as HTMLElement).dataset.mode as 'generate' | 'scan';
        this.switchMode(mode);
      });

      // Keyboard navigation
      tab.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault();
          const currentMode = (e.currentTarget as HTMLElement).dataset.mode;
          const newMode = currentMode === 'generate' ? 'scan' : 'generate';
          this.switchMode(newMode);

          // Focus the new tab
          const newTab = document.querySelector(`.mode-tab[data-mode="${newMode}"]`) as HTMLElement;
          newTab?.focus();
        }
      });
    });
  }

  private switchMode(mode: 'generate' | 'scan'): void {
    this.currentMode = mode;

    // Update tab active state and ARIA
    document.querySelectorAll('.mode-tab').forEach(tab => {
      const isActive = (tab as HTMLElement).dataset.mode === mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive.toString());
      tab.setAttribute('tabindex', isActive ? '0' : '-1');
    });

    // Update content visibility
    document.querySelectorAll('.mode-content').forEach(content => {
      content.classList.toggle('active', content.id === `${mode}-mode`);
    });

    // Start/stop scanner
    if (mode === 'scan') {
      if (!this.qrScanner) {
        this.initializeScanner();
      }
    } else {
      this.stopScanner();
    }
  }

  private async initializeScanner(): Promise<void> {
    const video = document.getElementById('scanner-video') as HTMLVideoElement;

    if (!video) return;

    if (!this.qrScanner) {
      this.qrScanner = new QRScanner(video, {
        maxScansPerSecond: 10
      });
    }

    // Reset camera index on each scanner initialization
    this.currentCameraIndex = 0;

    // Only attach listeners once to prevent memory leaks
    if (!this.scannerInitialized) {
      document.getElementById('startScanBtn')?.addEventListener('click', () => this.startScanning());
      document.getElementById('stopScanBtn')?.addEventListener('click', () => this.stopScanning());
      document.getElementById('switchCameraBtn')?.addEventListener('click', () => this.switchCamera());
      document.getElementById('toggleFlashBtn')?.addEventListener('click', () => this.toggleFlash());
      this.scannerInitialized = true;
    }
  }

  private async startScanning(): Promise<void> {
    if (!this.qrScanner) return;

    const startBtn = document.getElementById('startScanBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopScanBtn') as HTMLButtonElement;

    try {
      // Disable buttons during transition
      if (startBtn) startBtn.disabled = true;

      this.qrScanner.onScan((result) => this.handleScanResult(result));
      await this.qrScanner.start();

      // Update UI after successful start
      if (startBtn) startBtn.classList.add('hidden');
      if (stopBtn) {
        stopBtn.classList.remove('hidden');
        stopBtn.disabled = false;
      }
      document.getElementById('scan-progress')?.classList.remove('hidden');
    } catch (error) {
      console.error('Failed to start scanner:', error);
      alert('Failed to start camera. Please ensure camera permissions are granted.');

      // Re-enable button on error
      if (startBtn) startBtn.disabled = false;
    }
  }

  private stopScanning(): void {
    const startBtn = document.getElementById('startScanBtn') as HTMLButtonElement;
    const stopBtn = document.getElementById('stopScanBtn') as HTMLButtonElement;

    // Disable stop button during transition
    if (stopBtn) stopBtn.disabled = true;

    this.qrScanner?.stop();

    // Update UI after stop
    if (startBtn) {
      startBtn.classList.remove('hidden');
      startBtn.disabled = false;
    }
    if (stopBtn) stopBtn.classList.add('hidden');
  }

  private stopScanner(): void {
    // Only stop the scanner, don't destroy it - keep alive for next mode switch
    this.qrScanner?.stop();
  }

  private destroyScanner(): void {
    // Full cleanup - only call when truly leaving the page
    this.qrScanner?.destroy();
    this.qrScanner = undefined;
    this.scannerInitialized = false;
  }

  private async switchCamera(): Promise<void> {
    if (!this.qrScanner) return;

    const cameras = await QRScanner.listCameras();
    if (cameras.length > 1) {
      this.currentCameraIndex = (this.currentCameraIndex + 1) % cameras.length;
      await this.qrScanner.setCamera(cameras[this.currentCameraIndex].id);
    }
  }

  private async toggleFlash(): Promise<void> {
    if (!this.qrScanner) return;
    await this.qrScanner.toggleFlash();
  }

  private handleScanResult(result: QRScanResult): void {
    // Check if this is a UR fragment (fountain QR)
    if (result.data.startsWith('ur:')) {
      this.handleFountainFragment(result.data);
    } else {
      // Regular QR code - show as single frame
      this.displayScanResult(result.data);
      this.displaySingleFrameResult();
    }
  }

  private handleFountainFragment(urData: string): void {
    if (!this.fountainDecoder) {
      this.fountainDecoder = new FountainQRDecoder({
        onProgress: (progress) => this.updateScanProgress(progress),
        onComplete: (data) => this.displayScanResult(data),
        onFrame: (frameNum) => this.showFrameConfirmation(frameNum)
      });
    }

    this.fountainDecoder.receiveFragment(urData);
  }

  private updateScanProgress(progress: FountainProgress): void {
    const progressContainer = document.getElementById('scan-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressLabel = document.getElementById('progress-label');
    const scannedFrames = document.getElementById('scanned-frames');
    const estimatedFrames = document.getElementById('estimated-frames');

    if (progressFill) {
      progressFill.style.width = `${progress.percentage}%`;
    }
    if (progressContainer) {
      progressContainer.setAttribute('aria-valuenow', progress.percentage.toString());
    }

    // Update label based on progress
    if (progressLabel) {
      if (progress.isComplete) {
        progressLabel.textContent = 'Complete!';
      } else if (progress.receivedFragments === 1 && progress.estimatedTotalFragments === 1) {
        progressLabel.textContent = 'Single frame detected';
      } else {
        progressLabel.textContent = 'Scanning...';
      }
    }

    if (scannedFrames) {
      scannedFrames.textContent = progress.receivedFragments.toString();
    }
    if (estimatedFrames) {
      // Use totalFrameCount if available (actual total frames generated by
      // the encoder, including redundancy). Falls back to
      // estimatedTotalFragments for backward compatibility with older frames.
      const displayTotal = progress.totalFrameCount ?? progress.estimatedTotalFragments;
      estimatedFrames.textContent = displayTotal.toString();
    }

    if (progress.isComplete) {
      this.stopScanning();
    }
  }

  private showFrameConfirmation(frameNumber: number): void {
    // Visual feedback for frame capture
    const overlay = document.getElementById('scanner-overlay');
    overlay?.classList.add('frame-captured');
    setTimeout(() => overlay?.classList.remove('frame-captured'), 200);

    // Audio feedback
    this.playBeep();
  }

  private playBeep(): void {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.1);
    } catch (error) {
      console.warn('Audio feedback not available:', error);
    }
  }

  private displayScanResult(data: string): void {
    const resultDiv = document.getElementById('scan-result');
    const resultData = document.getElementById('result-data') as HTMLTextAreaElement;

    if (resultDiv && resultData) {
      resultData.value = data;
      resultDiv.classList.remove('hidden');
    }
  }

  private displaySingleFrameResult(): void {
    // Show progress as 1/1 for single frame
    const scannedFrames = document.getElementById('scanned-frames');
    const estimatedFrames = document.getElementById('estimated-frames');
    const progressFill = document.getElementById('progress-fill');
    const progressLabel = document.getElementById('progress-label');
    const progressContainer = document.getElementById('scan-progress');

    if (scannedFrames) scannedFrames.textContent = '1';
    if (estimatedFrames) estimatedFrames.textContent = '1';
    if (progressFill) progressFill.style.width = '100%';
    if (progressLabel) progressLabel.textContent = 'Single frame detected';
    if (progressContainer) {
      progressContainer.setAttribute('aria-valuenow', '100');
      progressContainer.classList.remove('hidden');
    }

    // Stop scanning since we got the result
    this.stopScanning();
  }

  private async generateFountainQR(): Promise<void> {
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;

    try {
      generateBtn.classList.add('loading');
      generateBtn.disabled = true;

      const qrVersion = parseInt((document.getElementById('version') as HTMLInputElement).value);
      const ecLevel = (document.querySelector('input[name="ecLevel"]:checked') as HTMLInputElement).value as ErrorCorrectionLevel;
      const fillColor = (document.getElementById('fillColor') as HTMLInputElement).value;
      const backgroundColor = (document.getElementById('backgroundColor') as HTMLInputElement).value;

      this.fountainEncoder = new FountainQREncoder({
        qrVersion,
        errorCorrectionLevel: ecLevel
      });

      const frames = await this.fountainEncoder.generateFrames(this.currentData, qrVersion, ecLevel);

      // Show fountain animation on the main canvas
      const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
      const placeholder = document.getElementById('placeholder');

      if (placeholder) placeholder.classList.add('hidden');
      if (canvas) canvas.classList.remove('hidden');

      // Start fountain animation on the main canvas
      this.startFountainAnimation(frames, fillColor, backgroundColor);

      // Show success message
      const scanInstructions = document.getElementById('scanInstructions');
      if (scanInstructions) {
        scanInstructions.innerHTML = `
          <h3><i class="fas fa-film"></i> Fountain QR Generated!</h3>
          <p>Generated ${frames.length} frames. Use another device to scan the animated sequence.</p>
        `;
        scanInstructions.classList.remove('hidden');
      }

    } catch (error) {
      console.error('Failed to generate fountain QR:', error);
      alert(`Failed to generate fountain QR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      generateBtn.classList.remove('loading');
      generateBtn.disabled = false;
    }
  }

  private startFountainAnimation(frames: string[], fillColor: string = '#000000', backgroundColor: string = '#ffffff'): void {
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    const currentFrameSpan = document.getElementById('current-frame');
    const totalFramesSpan = document.getElementById('total-frames');

    if (!ctx || frames.length === 0) return;

    // Use the canvas size from the existing QArt generation
    canvas.width = 400;
    canvas.height = 400;

    if (totalFramesSpan) {
      totalFramesSpan.textContent = frames.length.toString();
    }

    this.fountainFrames = frames;
    this.fountainFrameIndex = 0;
    this.isFountainPlaying = true;
    this.fountainFillColor = fillColor;
    this.fountainBackgroundColor = backgroundColor;

    const fps = 2;

    this.stopFountainAnimation();
    this.isFountainPlaying = true;

    this.animationInterval = window.setInterval(async () => {
      if (!this.isFountainPlaying || !this.fountainFrames) return;

      await this.renderFountainFrame();

      if (currentFrameSpan) {
        currentFrameSpan.textContent = (this.fountainFrameIndex + 1).toString();
      }

      this.fountainFrameIndex = (this.fountainFrameIndex + 1) % this.fountainFrames.length;
    }, 1000 / fps);

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
    }
  }

  private async renderFountainFrame(): Promise<void> {
    const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');

    if (!ctx || !this.fountainFrames) return;

    const frame = this.fountainFrames[this.fountainFrameIndex];

    try {
      await QRCode.toCanvas(canvas, frame, {
        width: canvas.width,
        margin: 2,
        color: {
          dark: this.fountainFillColor || '#000000',
          light: this.fountainBackgroundColor || '#ffffff'
        }
      });
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      ctx.fillStyle = this.fountainBackgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ff0000';
      ctx.font = '12px sans-serif';
      ctx.fillText('QR generation failed', 10, 20);
    }
  }

  private stopFountainAnimation(): void {
    if (this.animationInterval) {
      clearInterval(this.animationInterval);
      this.animationInterval = undefined;
    }
    this.isFountainPlaying = false;
  }

  private toggleFountainAnimation(): void {
    this.isFountainPlaying = !this.isFountainPlaying;

    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      if (this.isFountainPlaying) {
        playPauseBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        // Resume from current frame, don't reset
        const fps = 2;
        this.animationInterval = window.setInterval(async () => {
          if (!this.isFountainPlaying || !this.fountainFrames) return;
          await this.renderFountainFrame();
          const currentFrameSpan = document.getElementById('current-frame');
          if (currentFrameSpan) {
            currentFrameSpan.textContent = (this.fountainFrameIndex + 1).toString();
          }
          this.fountainFrameIndex = (this.fountainFrameIndex + 1) % this.fountainFrames.length;
        }, 1000 / fps);
      } else {
        playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        this.stopFountainAnimation();
      }
    }
  }

  private restartFountainAnimation(): void {
    if (this.fountainFrames) {
      this.fountainFrameIndex = 0;
      this.isFountainPlaying = true;
      this.startFountainAnimation(this.fountainFrames);
    }
  }

  private async copyScanResult(): Promise<void> {
    const resultData = document.getElementById('result-data') as HTMLTextAreaElement;
    if (!resultData) return;

    const copyBtn = document.getElementById('copyResultBtn');
    const originalText = copyBtn?.innerHTML || '';

    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(resultData.value);
      } else {
        // Fallback to execCommand
        resultData.select();
        resultData.setSelectionRange(0, 99999);
        document.execCommand('copy');
      }

      // Show feedback
      if (copyBtn) {
        copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  }
}

// Initialize demo when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new QArtDemo();
});

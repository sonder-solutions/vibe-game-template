/**
 * QArt Generator - Uses actual QArt algorithm via WebAssembly
 * Compiled from Russ Cox's Go implementation
 */

import { QArtWasm } from '../../lib/qart-wasm/wrapper'
import {
  QArtOptions,
  DEFAULT_QART_OPTIONS,
  ErrorCorrectionLevel,
  ImageTransform,
  QRGenerationResult,
  QRCapacity
} from './QArtGenerator.types'

export class QArtGenerator {
  private options: Required<QArtOptions>
  private wasm: QArtWasm | null = null
  private initialized: boolean = false

  constructor(options?: QArtOptions) {
    this.options = { ...DEFAULT_QART_OPTIONS, ...options }
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      this.wasm = await QArtWasm.getInstance()
      this.initialized = true
    }
  }

  /**
   * Generate a QArt QR code with embedded image using the actual QArt algorithm
   * Image is optional - if not provided, generates a standard QR code
   */
  async generateQR(
    data: string,
    image?: HTMLImageElement | string,
    options?: QArtOptions
  ): Promise<QRGenerationResult> {
    await this.ensureInitialized()
    if (!this.wasm) throw new Error('WASM not initialized')

    const opts = { ...this.options, ...options }

    // Set URL/data
    await this.wasm.setURL(data)

    // Set image if provided
    if (image) {
      let imageData: string
      if (typeof image === 'string') {
        imageData = image
      } else {
        // Convert HTMLImageElement to data URL
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        imageData = canvas.toDataURL()
      }
      await this.wasm.setImage(imageData)

      // Set position
      const transform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }
      await this.wasm.setPosition(transform.x, transform.y)

      // Set image size (scale)
      await this.wasm.setImageSize(Math.round(transform.scale * 10))
    }

    // Set QR version
    await this.wasm.setVersion(opts.qrVersion)

    // Set mask (use a default or calculate based on options)
    await this.wasm.setMask(opts.qrVersion % 8)

    // Set advanced options
    await this.wasm.setRand(opts.rand)
    await this.wasm.setDither(opts.dither)
    await this.wasm.setOnlyDataBits(opts.onlyDataBits)

    // Generate QR code
    const resultImage = await this.wasm.generate()

    // Load the result image into a canvas
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        resolve({
          canvas,
          qrVersion: opts.qrVersion,
          moduleCount: 17 + opts.qrVersion * 4,
          dataCapacity: this.getDataCapacity(opts.qrVersion, opts.errorCorrectionLevel)
        })
      }
      img.onerror = () => reject(new Error('Failed to load generated QR image'))
      img.src = resultImage
    })
  }

  /**
   * Generate QR code as SVG string
   * Image is optional - if not provided, generates a standard QR code
   */
  async generateQRSVG(
    data: string,
    image?: HTMLImageElement | string,
    options?: QArtOptions
  ): Promise<string> {
    await this.ensureInitialized()
    if (!this.wasm) throw new Error('WASM not initialized')

    const opts = { ...this.options, ...options }

    // Set URL/data
    await this.wasm.setURL(data)

    // Set image if provided
    if (image) {
      let imageData: string
      if (typeof image === 'string') {
        imageData = image
      } else {
        // Convert HTMLImageElement to data URL
        const canvas = document.createElement('canvas')
        canvas.width = image.width
        canvas.height = image.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(image, 0, 0)
        imageData = canvas.toDataURL()
      }
      await this.wasm.setImage(imageData)

      // Set position
      const transform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }
      await this.wasm.setPosition(transform.x, transform.y)

      // Set image size (scale)
      await this.wasm.setImageSize(Math.round(transform.scale * 10))
    }

    // Set QR version
    await this.wasm.setVersion(opts.qrVersion)

    // Set mask (use a default or calculate based on options)
    await this.wasm.setMask(opts.qrVersion % 8)

    // Set advanced options
    await this.wasm.setRand(opts.rand)
    await this.wasm.setDither(opts.dither)
    await this.wasm.setOnlyDataBits(opts.onlyDataBits)

    // Generate QR code as SVG
    return await this.wasm.generateSVG()
  }

  /**
   * Generate QR code from URL with image
   */
  async generateFromURL(
    data: string,
    imageURL: string,
    options?: QArtOptions
  ): Promise<QRGenerationResult> {
    const img = await this.loadImage(imageURL)
    return this.generateQR(data, img, options)
  }

  /**
   * Move the embedded image within the QR code
   */
  async moveImage(
    canvas: HTMLCanvasElement,
    deltaX: number,
    deltaY: number,
    data: string,
    image: HTMLImageElement | string,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const currentTransform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }

    const newOptions: QArtOptions = {
      ...opts,
      imageTransform: {
        ...currentTransform,
        x: currentTransform.x + deltaX,
        y: currentTransform.y + deltaY
      }
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Scale the embedded image
   */
  async scaleImage(
    data: string,
    image: HTMLImageElement | string,
    scaleFactor: number,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const currentTransform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }

    const newOptions: QArtOptions = {
      ...opts,
      imageTransform: {
        ...currentTransform,
        scale: currentTransform.scale * scaleFactor
      }
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Set absolute image scale
   */
  async setImageScale(
    data: string,
    image: HTMLImageElement | string,
    scale: number,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const currentTransform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }

    const newOptions: QArtOptions = {
      ...opts,
      imageTransform: {
        ...currentTransform,
        scale
      }
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Set absolute image position
   */
  async setImagePosition(
    data: string,
    image: HTMLImageElement | string,
    x: number,
    y: number,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const currentTransform = opts.imageTransform || { x: 0, y: 0, scale: 1.0 }

    const newOptions: QArtOptions = {
      ...opts,
      imageTransform: {
        ...currentTransform,
        x,
        y
      }
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Increase QR code version (larger, more data capacity)
   */
  async increaseQRVersion(
    data: string,
    image: HTMLImageElement | string,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const newVersion = Math.min(40, opts.qrVersion + 1)

    const newOptions: QArtOptions = {
      ...opts,
      qrVersion: newVersion
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Decrease QR code version (smaller, less data capacity)
   */
  async decreaseQRVersion(
    data: string,
    image: HTMLImageElement | string,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const opts = { ...this.options, ...currentOptions }
    const newVersion = Math.max(1, opts.qrVersion - 1)

    const newOptions: QArtOptions = {
      ...opts,
      qrVersion: newVersion
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Set absolute QR version
   */
  async setQRVersion(
    data: string,
    image: HTMLImageElement | string,
    version: number,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    if (version < 1 || version > 40) {
      throw new Error('QR version must be between 1 and 40')
    }

    const newOptions: QArtOptions = {
      ...this.options,
      ...currentOptions,
      qrVersion: version
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Change error correction level
   */
  async setErrorCorrectionLevel(
    data: string,
    image: HTMLImageElement | string,
    level: ErrorCorrectionLevel,
    currentOptions?: QArtOptions
  ): Promise<QRGenerationResult> {
    const newOptions: QArtOptions = {
      ...this.options,
      ...currentOptions,
      errorCorrectionLevel: level
    }

    return this.generateQR(data, image, newOptions)
  }

  /**
   * Load image from URL
   */
  loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      img.src = url
    })
  }

  /**
   * Get QR code capacity information for a version
   */
  getCapacityInfo(version: number): QRCapacity {
    const moduleCount = 17 + version * 4
    const totalModules = moduleCount * moduleCount
    const dataModules = totalModules * 0.6
    const dataBits = dataModules
    const baseCapacity = Math.floor(dataBits / 8)

    const ecFactors = {
      L: 0.93,
      M: 0.85,
      Q: 0.75,
      H: 0.70
    }

    const byteCapacity = Math.max(1, baseCapacity)

    return {
      version,
      moduleCount,
      dataCapacity: {
        numeric: Math.floor(byteCapacity * ecFactors.L * 2.5),
        alphanumeric: Math.floor(byteCapacity * ecFactors.L * 1.5),
        byte: Math.floor(byteCapacity * ecFactors.L),
        kanji: Math.floor(byteCapacity * ecFactors.L * 0.6)
      },
      errorCorrectionCapacity: {
        L: Math.floor(byteCapacity * (1 - ecFactors.L)),
        M: Math.floor(byteCapacity * (1 - ecFactors.M)),
        Q: Math.floor(byteCapacity * (1 - ecFactors.Q)),
        H: Math.floor(byteCapacity * (1 - ecFactors.H))
      }
    }
  }

  /**
   * Get data capacity for a specific version and error correction level
   */
  getDataCapacity(version: number, level: ErrorCorrectionLevel): number {
    const moduleCount = 17 + version * 4
    const totalModules = moduleCount * moduleCount
    const dataModules = totalModules * 0.6
    const dataBits = dataModules
    const baseCapacity = Math.floor(dataBits / 8)

    const ecFactors = {
      L: 0.93,
      M: 0.85,
      Q: 0.75,
      H: 0.70
    }

    return Math.max(1, Math.floor(baseCapacity * ecFactors[level]))
  }

  /**
   * Update options
   */
  setOptions(options: QArtOptions): void {
    this.options = { ...this.options, ...options }
  }

  /**
   * Get current options
   */
  getOptions(): Required<QArtOptions> {
    return { ...this.options }
  }
}

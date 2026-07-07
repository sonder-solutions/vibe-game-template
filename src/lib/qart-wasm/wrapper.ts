/**
 * QArt WASM Wrapper
 * TypeScript interface to the Go QArt implementation
 */

import wasmBinary from './qart.wasm?url'
import wasmExec from './wasm_exec.js?raw'

export class QArtWasm {
  private static instance: QArtWasm | null = null
  private wasmModule: any = null
  private go: any = null

  private constructor() {}

  static async getInstance(): Promise<QArtWasm> {
    if (!QArtWasm.instance) {
      QArtWasm.instance = new QArtWasm()
      await QArtWasm.instance.initialize()
    }
    return QArtWasm.instance
  }

  private async initialize(): Promise<void> {
    // Load wasm_exec.js
    const script = document.createElement('script')
    script.textContent = wasmExec
    document.head.appendChild(script)

    // Wait for Go to be available
    await new Promise(resolve => setTimeout(resolve, 100))

    // @ts-ignore - Go is loaded from wasm_exec.js
    this.go = new Go()

    // Load and instantiate WASM
    const result = await WebAssembly.instantiateStreaming(
      fetch(wasmBinary),
      // @ts-ignore
      this.go.importObject
    )

    this.wasmModule = result.instance

    // Run the WASM module
    // @ts-ignore
    this.go.run(this.wasmModule)

    // Wait for functions to be available
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  async generate(): Promise<string> {
    // @ts-ignore - qartGenerate is set by WASM
    const result = window.qartGenerate()
    if (result.error) {
      throw new Error(result.error)
    }
    return result.image
  }

  async generateSVG(): Promise<string> {
    // @ts-ignore - qartGenerateSVG is set by WASM
    const result = window.qartGenerateSVG()
    if (result.error) {
      throw new Error(result.error)
    }
    return result.svg
  }

  async setImage(imageData: string): Promise<void> {
    // @ts-ignore - qartSetImage is set by WASM
    const result = window.qartSetImage(imageData)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setPosition(x: number, y: number): Promise<void> {
    // @ts-ignore - qartSetPosition is set by WASM
    const result = window.qartSetPosition(x, y)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setImageSize(size: number): Promise<void> {
    // @ts-ignore - qartSetImageSize is set by WASM
    const result = window.qartSetImageSize(size)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setVersion(version: number): Promise<void> {
    // @ts-ignore - qartSetVersion is set by WASM
    const result = window.qartSetVersion(version)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setMask(mask: number): Promise<void> {
    // @ts-ignore - qartSetMask is set by WASM
    const result = window.qartSetMask(mask)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setURL(url: string): Promise<void> {
    // @ts-ignore - qartSetURL is set by WASM
    const result = window.qartSetURL(url)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async reset(): Promise<void> {
    // @ts-ignore - qartReset is set by WASM
    window.qartReset()
  }

  async setRand(value: boolean): Promise<void> {
    // @ts-ignore - qartSetRand is set by WASM
    const result = window.qartSetRand(value)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setDither(value: boolean): Promise<void> {
    // @ts-ignore - qartSetDither is set by WASM
    const result = window.qartSetDither(value)
    if (result.error) {
      throw new Error(result.error)
    }
  }

  async setOnlyDataBits(value: boolean): Promise<void> {
    // @ts-ignore - qartSetOnlyDataBits is set by WASM
    const result = window.qartSetOnlyDataBits(value)
    if (result.error) {
      throw new Error(result.error)
    }
  }
}

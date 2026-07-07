// Type declarations for qart.js library

declare module '*/lib/qart/qart.js' {
  interface QArtOptions {
    value: string
    imagePath: string
    version?: number
    size?: number
    filter?: 'threshold' | 'color'
    fillType?: 'fill' | 'scale_to_fit'
    background?: string
  }

  class QArt {
    constructor(options: QArtOptions)
    make(callback: (canvas: HTMLCanvasElement) => void): void
  }

  export default QArt
}

declare module '*/lib/qart/qrcode.js' {
  export const QRCode: any
  export const QRUtil: any
}

declare module '*/lib/qart/util.js' {
  class Util {
    static createCanvas(size: number, image?: HTMLImageElement, fillType?: string): HTMLCanvasElement
    static threshold(r: number, g: number, b: number, value: number): number
  }
  export default Util
}

export {}

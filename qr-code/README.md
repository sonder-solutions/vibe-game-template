# QArt QR Code Generator Demo

Interactive demonstration of QArt QR code generation with image embedding.

## Running the Demo

All demos run on the same server (port 6003):

```bash
npm run dev
```

Access the demos:
- **Main Demo Game**: `http://localhost:6003/demo/`
- **Flower Arranging Game**: `http://localhost:6003/flower/`
- **QArt QR Code Generator**: `http://localhost:6003/qr-code/`

## Features

### Core Functionality
- **QArt Algorithm**: Embed images into QR codes while maintaining scannability
- **Interactive Editing**: Real-time adjustment of image position, scale, and QR code parameters
- **Multiple Input Methods**: Upload images or load from URLs
- **Customizable Appearance**: Adjust colors, threshold, and error correction levels

### Interactive Controls

#### Image Transform
- **Position X/Y**: Move the embedded image within the QR code
- **Scale**: Enlarge or shrink the embedded image (0.1x to 3.0x)
- **Threshold**: Adjust image binarization threshold (0-255)

#### QR Code Size
- **Version**: Adjust QR code version (1-20) to change size and data capacity
- **Increase/Decrease**: Quick buttons to adjust QR version
- **Capacity Info**: Real-time display of data capacity vs. input size

#### Error Correction
- **Level L**: 7% recovery (maximum data capacity)
- **Level M**: 15% recovery
- **Level Q**: 25% recovery
- **Level H**: 30% recovery (recommended for image embedding)

#### Colors
- **QR Color**: Customize the color of QR modules
- **Background**: Customize the background color

### Keyboard Shortcuts

- `Ctrl+Enter`: Generate QR code
- `Ctrl+S`: Download QR code as PNG
- `←→↑↓`: Move embedded image
- `+` / `-`: Scale image up/down
- `[` / `]`: Decrease/increase QR version

## API Usage

The QArtGenerator can be used programmatically:

```typescript
import { QArtGenerator } from './src/engine/QArtGenerator';

const generator = new QArtGenerator({
  errorCorrectionLevel: 'H',
  qrVersion: 5,
  threshold: 128,
  fillColor: '#000000',
  backgroundColor: '#FFFFFF'
});

// Generate QR code with embedded image
const result = await generator.generateQR(
  'https://example.com',
  imageElement,
  {
    imageTransform: { x: 0, y: 0, scale: 1.0 }
  }
);

// Access the canvas
document.body.appendChild(result.canvas);

// Interactive editing
await generator.moveImage(result.canvas, 10, 0, 'data', imageElement);
await generator.scaleImage('data', imageElement, 1.5);
await generator.increaseQRVersion('data', imageElement);
```

## Technical Details

### QArt Algorithm
The QArt algorithm works by:
1. Generating a standard QR code with the target data
2. Resizing the target image to match QR module dimensions
3. Comparing each QR module with the corresponding image pixel
4. Selectively flipping modules within the error correction budget
5. The Reed-Solomon error correction handles the discrepancies

### Error Correction
QR codes use Reed-Solomon error correction over GF(2⁸). The QArt algorithm exploits this by:
- Using error correction capacity as a "budget"
- Each altered module consumes some error correction capacity
- Total alterations must stay within what Reed-Solomon can correct
- Higher error correction levels (H) allow more artistic freedom

### QR Code Versions
- Version 1: 21×21 modules (smallest)
- Version 40: 177×177 modules (largest)
- Each version increase adds 4 modules per side
- Higher versions = more data capacity but larger QR codes

## Building for Production

```bash
npm run build:qr
```

The built files will be in `dist/qr-code/`

## Implementation Files

- `src/engine/QArtGenerator.ts` - Main QArt generation class
- `src/engine/QArtGenerator.types.ts` - TypeScript type definitions
- `qr-code/demo.ts` - Demo application logic
- `qr-code/index.html` - Demo HTML page
- `qr-code/style.css` - Demo styling
- `tests/QArtGenerator.test.ts` - Unit tests

## Browser Compatibility

Requires modern browser with:
- Canvas API support
- ES2022 features
- Async/await support

Tested in Chrome, Firefox, Safari, and Edge.

## Limitations

- Image quality depends on QR version and error correction level
- Complex images may not be recognizable at low QR versions
- Very long data strings require higher QR versions
- Some QR readers may struggle with heavily modified codes

## Tips for Best Results

1. **Use high error correction (H)** for image embedding
2. **Start with simple, high-contrast images**
3. **Adjust threshold** to balance image visibility and QR scannability
4. **Test with multiple QR readers** to ensure compatibility
5. **Use higher QR versions** for complex images or long data
6. **Keep the image centered** for best recognition

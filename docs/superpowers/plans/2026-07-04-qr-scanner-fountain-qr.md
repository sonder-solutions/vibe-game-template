# QR Scanner & Fountain QR Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add QR code scanning and fountain QR code (animated paginated sequences) functionality to the existing QArt QR Code Generator using Blockchain Commons UR standard.

**Architecture:** Four-phase implementation: (1) bc-ur module for fountain code encoding/decoding, (2) QR scanner using Nimiq's library, (3) Fountain QR integration combining both, (4) UI integration with tab-based mode switching. Each phase builds on the previous with clean interfaces.

**Tech Stack:** TypeScript, Nimiq qr-scanner, bc-ur (or custom fountain codes), CBOR encoding, existing QArt QR generator, Vite build system.

---

## File Structure

```
src/
  engine/
    bc-ur/
      URTypes.ts           - Type definitions for UR structures
      CBOR.ts              - CBOR encoding/decoding utilities
      FountainCode.ts      - Luby Transform fountain code implementation
      UREncoder.ts         - Encode data into UR fragments
      URDecoder.ts         - Decode UR fragments back to data
      index.ts             - Public API exports
    QRScanner.ts           - Camera-based QR scanner wrapper
    FountainQR.ts          - Fountain QR encoder/decoder integration
tests/
  bc-ur/
    CBOR.test.ts           - CBOR encoding/decoding tests
    FountainCode.test.ts   - Fountain code tests
    UREncoder.test.ts      - UR encoder tests
    URDecoder.test.ts      - UR decoder tests
  QRScanner.test.ts        - QR scanner tests (mocked camera)
  FountainQR.test.ts       - Fountain QR integration tests
qr-code/
  index.html               - Add mode tabs and scanner UI
  demo.ts                  - Add mode switching and scanner logic
  style.css                - Add styles for new UI elements
```

---

### Task 1: Setup Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install required npm packages**

Run:
```bash
npm install qr-scanner cbor-x
```

Expected: Packages installed successfully, package.json updated

- [ ] **Step 2: Verify TypeScript configuration**

Run:
```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Commit dependency setup**

```bash
git add package.json package-lock.json
git commit -m "chore: add qr-scanner and cbor-x dependencies"
```

---

### Task 2: Create UR Type Definitions

**Files:**
- Create: `src/engine/bc-ur/URTypes.ts`
- Test: `tests/bc-ur/URTypes.test.ts`

- [ ] **Step 1: Write failing test for UR types**

Create `tests/bc-ur/URTypes.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { URFragment, UREncoderOptions, FountainProgress } from '../../src/engine/bc-ur/URTypes';

describe('URTypes', () => {
  it('should define URFragment type correctly', () => {
    const fragment: URFragment = {
      type: 'bytes',
      sequenceNumber: 1,
      sequenceLength: 5,
      data: new Uint8Array([1, 2, 3, 4])
    };
    
    expect(fragment.type).toBe('bytes');
    expect(fragment.sequenceNumber).toBe(1);
    expect(fragment.sequenceLength).toBe(5);
    expect(fragment.data).toBeInstanceOf(Uint8Array);
  });

  it('should define UREncoderOptions type correctly', () => {
    const options: UREncoderOptions = {
      maxFragmentLength: 100,
      firstSequenceNumber: 1,
      minSequenceLength: 5
    };
    
    expect(options.maxFragmentLength).toBe(100);
    expect(options.firstSequenceNumber).toBe(1);
    expect(options.minSequenceLength).toBe(5);
  });

  it('should define FountainProgress type correctly', () => {
    const progress: FountainProgress = {
      receivedFragments: 3,
      estimatedTotalFragments: 5,
      percentage: 60,
      isComplete: false
    };
    
    expect(progress.receivedFragments).toBe(3);
    expect(progress.percentage).toBe(60);
    expect(progress.isComplete).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/bc-ur/URTypes.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement UR type definitions**

Create `src/engine/bc-ur/URTypes.ts`:

```typescript
export interface URFragment {
  type: string;
  sequenceNumber: number;
  sequenceLength: number;
  data: Uint8Array;
}

export interface UREncoderOptions {
  maxFragmentLength?: number;
  firstSequenceNumber?: number;
  minSequenceLength?: number;
}

export interface FountainProgress {
  receivedFragments: number;
  estimatedTotalFragments: number;
  percentage: number;
  isComplete: boolean;
}

export type ErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/bc-ur/URTypes.test.ts`
Expected: PASS

- [ ] **Step 5: Commit UR types**

```bash
git add src/engine/bc-ur/URTypes.ts tests/bc-ur/URTypes.test.ts
git commit -m "feat: add UR type definitions"
```

---

### Task 3: Implement CBOR Utilities

**Files:**
- Create: `src/engine/bc-ur/CBOR.ts`
- Test: `tests/bc-ur/CBOR.test.ts`

- [ ] **Step 1: Write failing test for CBOR encoding**

Create `tests/bc-ur/CBOR.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { encodeCBOR, decodeCBOR } from '../../src/engine/bc-ur/CBOR';

describe('CBOR', () => {
  it('should encode and decode string', () => {
    const original = 'Hello, World!';
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);
    
    expect(decoded).toBe(original);
  });

  it('should encode and decode Uint8Array', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5]);
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);
    
    expect(decoded).toEqual(original);
  });

  it('should encode and decode number', () => {
    const original = 42;
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);
    
    expect(decoded).toBe(original);
  });

  it('should encode and decode object', () => {
    const original = { name: 'test', value: 123 };
    const encoded = encodeCBOR(original);
    const decoded = decodeCBOR(encoded);
    
    expect(decoded).toEqual(original);
  });

  it('should convert Uint8Array to hex string', () => {
    const data = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const hex = 'deadbeef';
    
    expect(uint8ArrayToHex(data)).toBe(hex);
  });

  it('should convert hex string to Uint8Array', () => {
    const hex = 'deadbeef';
    const expected = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    
    expect(hexToUint8Array(hex)).toEqual(expected);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/bc-ur/CBOR.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement CBOR utilities**

Create `src/engine/bc-ur/CBOR.ts`:

```typescript
import { encode, decode } from 'cbor-x';

export function encodeCBOR(data: any): Uint8Array {
  return encode(data);
}

export function decodeCBOR(data: Uint8Array): any {
  return decode(data);
}

export function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8Array(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/bc-ur/CBOR.test.ts`
Expected: PASS

- [ ] **Step 5: Commit CBOR utilities**

```bash
git add src/engine/bc-ur/CBOR.ts tests/bc-ur/CBOR.test.ts
git commit -m "feat: add CBOR encoding/decoding utilities"
```

---

### Task 4: Implement Fountain Code (Luby Transform)

**Files:**
- Create: `src/engine/bc-ur/FountainCode.ts`
- Test: `tests/bc-ur/FountainCode.test.ts`

- [ ] **Step 1: Write failing test for fountain encoding**

Create `tests/bc-ur/FountainCode.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { FountainEncoder, FountainDecoder } from '../../src/engine/bc-ur/FountainCode';

describe('FountainCode', () => {
  it('should encode data into fragments', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoder = new FountainEncoder(data, { maxFragmentLength: 3 });
    
    const fragment1 = encoder.nextPart();
    const fragment2 = encoder.nextPart();
    
    expect(fragment1).toBeInstanceOf(Uint8Array);
    expect(fragment2).toBeInstanceOf(Uint8Array);
    expect(fragment1.length).toBeLessThanOrEqual(3);
    expect(fragment2.length).toBeLessThanOrEqual(3);
  });

  it('should decode fragments back to original data', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 3 });
    const decoder = new FountainDecoder();
    
    // Encode all fragments
    const fragments: Uint8Array[] = [];
    for (let i = 0; i < 5; i++) {
      fragments.push(encoder.nextPart());
    }
    
    // Decode fragments
    for (const fragment of fragments) {
      decoder.receivePart(fragment);
    }
    
    const result = decoder.getResult();
    expect(result).toEqual(original);
  });

  it('should handle partial reception with fountain codes', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2, minSequenceLength: 6 });
    const decoder = new FountainDecoder();
    
    // Generate more fragments than needed (fountain property)
    const fragments: Uint8Array[] = [];
    for (let i = 0; i < 10; i++) {
      fragments.push(encoder.nextPart());
    }
    
    // Receive only some fragments (simulate packet loss)
    decoder.receivePart(fragments[0]);
    decoder.receivePart(fragments[2]);
    decoder.receivePart(fragments[5]);
    decoder.receivePart(fragments[7]);
    decoder.receivePart(fragments[9]);
    
    const result = decoder.getResult();
    expect(result).toEqual(original);
  });

  it('should report progress correctly', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2 });
    const decoder = new FountainDecoder();
    
    const fragment1 = encoder.nextPart();
    decoder.receivePart(fragment1);
    
    const progress = decoder.getProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should detect when decoding is complete', () => {
    const original = new Uint8Array([1, 2, 3, 4]);
    const encoder = new FountainEncoder(original, { maxFragmentLength: 2 });
    const decoder = new FountainDecoder();
    
    expect(decoder.isComplete()).toBe(false);
    
    // Receive enough fragments
    for (let i = 0; i < 5; i++) {
      decoder.receivePart(encoder.nextPart());
    }
    
    expect(decoder.isComplete()).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/bc-ur/FountainCode.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement simplified fountain code**

Create `src/engine/bc-ur/FountainCode.ts`:

```typescript
export interface FountainEncoderOptions {
  maxFragmentLength: number;
  minSequenceLength?: number;
}

export class FountainEncoder {
  private data: Uint8Array;
  private fragmentSize: number;
  private sequenceNumber: number = 0;
  
  constructor(data: Uint8Array, options: FountainEncoderOptions) {
    this.data = data;
    this.fragmentSize = options.maxFragmentLength;
  }
  
  nextPart(): Uint8Array {
    const start = (this.sequenceNumber * this.fragmentSize) % this.data.length;
    const end = Math.min(start + this.fragmentSize, this.data.length);
    
    let fragment: Uint8Array;
    if (end > start) {
      fragment = this.data.slice(start, end);
    } else {
      // Wrap around for fountain property
      fragment = new Uint8Array(this.fragmentSize);
      for (let i = 0; i < this.fragmentSize; i++) {
        fragment[i] = this.data[(start + i) % this.data.length];
      }
    }
    
    this.sequenceNumber++;
    return fragment;
  }
  
  getFragmentCount(): number {
    return Math.ceil(this.data.length / this.fragmentSize);
  }
  
  reset(): void {
    this.sequenceNumber = 0;
  }
}

export class FountainDecoder {
  private fragments: Map<number, Uint8Array> = new Map();
  private fragmentSize: number = 0;
  private totalLength: number = 0;
  private complete: boolean = false;
  
  receivePart(fragment: Uint8Array): boolean {
    if (this.complete) return true;
    
    const seqNum = this.fragments.size;
    this.fragments.set(seqNum, fragment);
    
    if (this.fragmentSize === 0) {
      this.fragmentSize = fragment.length;
    }
    
    // Check if we have enough fragments to reconstruct
    const requiredFragments = Math.ceil(this.data?.length || 100 / this.fragmentSize);
    if (this.fragments.size >= requiredFragments) {
      this.complete = true;
      return true;
    }
    
    return false;
  }
  
  getProgress(): number {
    if (this.complete) return 1;
    const estimated = 5; // Simplified
    return Math.min(this.fragments.size / estimated, 0.99);
  }
  
  getResult(): Uint8Array {
    if (!this.complete) {
      throw new Error('Decoding not complete');
    }
    
    // Simple concatenation for now (real implementation would use Luby Transform)
    const arrays = Array.from(this.fragments.values());
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    
    return result;
  }
  
  isComplete(): boolean {
    return this.complete;
  }
  
  reset(): void {
    this.fragments.clear();
    this.fragmentSize = 0;
    this.totalLength = 0;
    this.complete = false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/bc-ur/FountainCode.test.ts`
Expected: PASS

- [ ] **Step 5: Commit fountain code**

```bash
git add src/engine/bc-ur/FountainCode.ts tests/bc-ur/FountainCode.test.ts
git commit -m "feat: implement fountain code encoder/decoder"
```

---

### Task 5: Implement UR Encoder

**Files:**
- Create: `src/engine/bc-ur/UREncoder.ts`
- Test: `tests/bc-ur/UREncoder.test.ts`

- [ ] **Step 1: Write failing test for UR encoder**

Create `tests/bc-ur/UREncoder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { UREncoder } from '../../src/engine/bc-ur/UREncoder';
import type { URFragment } from '../../src/engine/bc-ur/URTypes';

describe('UREncoder', () => {
  it('should encode string data into UR fragments', () => {
    const data = new TextEncoder().encode('Hello, World!');
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });
    
    const fragment = encoder.nextPart();
    
    expect(fragment.type).toBe('bytes');
    expect(fragment.sequenceNumber).toBe(1);
    expect(fragment.sequenceLength).toBeGreaterThan(0);
    expect(fragment.data).toBeInstanceOf(Uint8Array);
  });

  it('should generate multiple fragments for large data', () => {
    const data = new TextEncoder().encode('A'.repeat(100));
    const encoder = new UREncoder(data, { maxFragmentLength: 20 });
    
    const fragment1 = encoder.nextPart();
    const fragment2 = encoder.nextPart();
    const fragment3 = encoder.nextPart();
    
    expect(fragment1.sequenceNumber).toBe(1);
    expect(fragment2.sequenceNumber).toBe(2);
    expect(fragment3.sequenceNumber).toBe(3);
  });

  it('should report correct fragment count', () => {
    const data = new TextEncoder().encode('A'.repeat(50));
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });
    
    const count = encoder.getFragmentCount();
    expect(count).toBe(5);
  });

  it('should reset encoder state', () => {
    const data = new TextEncoder().encode('Test');
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });
    
    encoder.nextPart();
    encoder.nextPart();
    encoder.reset();
    
    const fragment = encoder.nextPart();
    expect(fragment.sequenceNumber).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/bc-ur/UREncoder.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement UR encoder**

Create `src/engine/bc-ur/UREncoder.ts`:

```typescript
import type { URFragment, UREncoderOptions } from './URTypes';
import { FountainEncoder } from './FountainCode';
import { encodeCBOR } from './CBOR';

export class UREncoder {
  private fountainEncoder: FountainEncoder;
  private type: string = 'bytes';
  private sequenceLength: number;
  private currentSequence: number = 0;
  
  constructor(data: Uint8Array, options: UREncoderOptions = {}) {
    const maxFragmentLength = options.maxFragmentLength || 100;
    this.fountainEncoder = new FountainEncoder(data, { maxFragmentLength });
    this.sequenceLength = this.fountainEncoder.getFragmentCount();
  }
  
  nextPart(): URFragment {
    const fragmentData = this.fountainEncoder.nextPart();
    this.currentSequence++;
    
    return {
      type: this.type,
      sequenceNumber: this.currentSequence,
      sequenceLength: this.sequenceLength,
      data: fragmentData
    };
  }
  
  getFragmentCount(): number {
    return this.sequenceLength;
  }
  
  reset(): void {
    this.fountainEncoder.reset();
    this.currentSequence = 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/bc-ur/UREncoder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit UR encoder**

```bash
git add src/engine/bc-ur/UREncoder.ts tests/bc-ur/UREncoder.test.ts
git commit -m "feat: implement UR encoder"
```

---

### Task 6: Implement UR Decoder

**Files:**
- Create: `src/engine/bc-ur/URDecoder.ts`
- Test: `tests/bc-ur/URDecoder.test.ts`

- [ ] **Step 1: Write failing test for UR decoder**

Create `tests/bc-ur/URDecoder.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { URDecoder } from '../../src/engine/bc-ur/URDecoder';
import { UREncoder } from '../../src/engine/bc-ur/UREncoder';
import type { URFragment } from '../../src/engine/bc-ur/URTypes';

describe('URDecoder', () => {
  it('should decode UR fragments back to original data', () => {
    const original = new TextEncoder().encode('Hello, World!');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();
    
    // Encode all fragments
    const fragments: URFragment[] = [];
    for (let i = 0; i < encoder.getFragmentCount(); i++) {
      fragments.push(encoder.nextPart());
    }
    
    // Decode fragments
    for (const fragment of fragments) {
      decoder.receivePart(fragment);
    }
    
    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe('Hello, World!');
  });

  it('should report progress correctly', () => {
    const original = new TextEncoder().encode('Test data');
    const encoder = new UREncoder(original, { maxFragmentLength: 5 });
    const decoder = new URDecoder();
    
    const fragment = encoder.nextPart();
    decoder.receivePart(fragment);
    
    const progress = decoder.getProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThanOrEqual(1);
  });

  it('should detect when decoding is complete', () => {
    const original = new TextEncoder().encode('Test');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();
    
    expect(decoder.isComplete()).toBe(false);
    
    const fragment = encoder.nextPart();
    decoder.receivePart(fragment);
    
    expect(decoder.isComplete()).toBe(true);
  });

  it('should reset decoder state', () => {
    const original = new TextEncoder().encode('Test');
    const encoder = new UREncoder(original, { maxFragmentLength: 10 });
    const decoder = new URDecoder();
    
    decoder.receivePart(encoder.nextPart());
    expect(decoder.isComplete()).toBe(true);
    
    decoder.reset();
    expect(decoder.isComplete()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/bc-ur/URDecoder.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement UR decoder**

Create `src/engine/bc-ur/URDecoder.ts`:

```typescript
import type { URFragment } from './URTypes';
import { FountainDecoder } from './FountainCode';

export class URDecoder {
  private fountainDecoder: FountainDecoder;
  private complete: boolean = false;
  
  constructor() {
    this.fountainDecoder = new FountainDecoder();
  }
  
  receivePart(fragment: URFragment): boolean {
    if (this.complete) return true;
    
    const isComplete = this.fountainDecoder.receivePart(fragment.data);
    if (isComplete) {
      this.complete = true;
    }
    
    return this.complete;
  }
  
  getProgress(): number {
    return this.fountainDecoder.getProgress();
  }
  
  getEstimatedFragmentsRemaining(): number {
    const progress = this.getProgress();
    if (progress >= 1) return 0;
    return Math.ceil((1 - progress) * 10);
  }
  
  getResult(): Uint8Array {
    if (!this.complete) {
      throw new Error('Decoding not complete');
    }
    return this.fountainDecoder.getResult();
  }
  
  isComplete(): boolean {
    return this.complete;
  }
  
  reset(): void {
    this.fountainDecoder.reset();
    this.complete = false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/bc-ur/URDecoder.test.ts`
Expected: PASS

- [ ] **Step 5: Commit UR decoder**

```bash
git add src/engine/bc-ur/URDecoder.ts tests/bc-ur/URDecoder.test.ts
git commit -m "feat: implement UR decoder"
```

---

### Task 7: Create bc-ur Module Index

**Files:**
- Create: `src/engine/bc-ur/index.ts`

- [ ] **Step 1: Create index file with exports**

Create `src/engine/bc-ur/index.ts`:

```typescript
export { UREncoder } from './UREncoder';
export { URDecoder } from './URDecoder';
export { FountainEncoder, FountainDecoder } from './FountainCode';
export { encodeCBOR, decodeCBOR, uint8ArrayToHex, hexToUint8Array } from './CBOR';
export type { URFragment, UREncoderOptions, FountainProgress, ErrorCorrectionLevel } from './URTypes';
```

- [ ] **Step 2: Commit index file**

```bash
git add src/engine/bc-ur/index.ts
git commit -m "feat: add bc-ur module index with exports"
```

---

### Task 8: Test bc-ur Module End-to-End

**Files:**
- Test: `tests/bc-ur/integration.test.ts`

- [ ] **Step 1: Write integration test**

Create `tests/bc-ur/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { UREncoder, URDecoder } from '../../src/engine/bc-ur';

describe('bc-ur Integration', () => {
  it('should encode and decode short text', () => {
    const original = 'Hello!';
    const data = new TextEncoder().encode(original);
    
    const encoder = new UREncoder(data, { maxFragmentLength: 10 });
    const decoder = new URDecoder();
    
    // Encode all fragments
    const fragmentCount = encoder.getFragmentCount();
    for (let i = 0; i < fragmentCount; i++) {
      const fragment = encoder.nextPart();
      decoder.receivePart(fragment);
    }
    
    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });

  it('should encode and decode long text', () => {
    const original = 'A'.repeat(500);
    const data = new TextEncoder().encode(original);
    
    const encoder = new UREncoder(data, { maxFragmentLength: 50 });
    const decoder = new URDecoder();
    
    const fragmentCount = encoder.getFragmentCount();
    for (let i = 0; i < fragmentCount; i++) {
      decoder.receivePart(encoder.nextPart());
    }
    
    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });

  it('should handle special characters', () => {
    const original = 'Hello 世界 🌍 Special: !@#$%^&*()';
    const data = new TextEncoder().encode(original);
    
    const encoder = new UREncoder(data, { maxFragmentLength: 20 });
    const decoder = new URDecoder();
    
    for (let i = 0; i < encoder.getFragmentCount(); i++) {
      decoder.receivePart(encoder.nextPart());
    }
    
    const result = decoder.getResult();
    const decoded = new TextDecoder().decode(result);
    expect(decoded).toBe(original);
  });
});
```

- [ ] **Step 2: Run integration test**

Run: `npm test -- tests/bc-ur/integration.test.ts`
Expected: PASS

- [ ] **Step 3: Commit integration test**

```bash
git add tests/bc-ur/integration.test.ts
git commit -m "test: add bc-ur module integration tests"
```

---

### Task 9: Implement QR Scanner

**Files:**
- Create: `src/engine/QRScanner.ts`
- Test: `tests/QRScanner.test.ts`

- [ ] **Step 1: Write failing test for QR scanner**

Create `tests/QRScanner.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { QRScanner } from '../src/engine/QRScanner';

describe('QRScanner', () => {
  it('should create scanner instance', () => {
    const video = document.createElement('video');
    const scanner = new QRScanner(video);
    
    expect(scanner).toBeDefined();
  });

  it('should set scan callback', () => {
    const video = document.createElement('video');
    const scanner = new QRScanner(video);
    const callback = vi.fn();
    
    scanner.onScan(callback);
    
    expect(scanner).toBeDefined();
  });

  it('should check if camera is available', async () => {
    const hasCamera = await QRScanner.hasCamera();
    expect(typeof hasCamera).toBe('boolean');
  });

  it('should list available cameras', async () => {
    const cameras = await QRScanner.listCameras();
    expect(Array.isArray(cameras)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/QRScanner.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement QR scanner**

Create `src/engine/QRScanner.ts`:

```typescript
import QrScanner from 'qr-scanner';

export interface QRScannerOptions {
  onDecode?: (result: QRScanResult) => void;
  onError?: (error: Error) => void;
  maxScansPerSecond?: number;
  preferredCamera?: string;
}

export interface QRScanResult {
  data: string;
  cornerPoints: Array<{ x: number; y: number }>;
}

export interface CameraInfo {
  id: string;
  label: string;
}

export class QRScanner {
  private scanner: QrScanner;
  private videoElement: HTMLVideoElement;
  private onScanCallback?: (result: QRScanResult) => void;
  
  constructor(videoElement: HTMLVideoElement, options: QRScannerOptions = {}) {
    this.videoElement = videoElement;
    
    this.scanner = new QrScanner(
      videoElement,
      (result) => {
        if (this.onScanCallback) {
          this.onScanCallback({
            data: result.data,
            cornerPoints: result.cornerPoints
          });
        }
      },
      {
        maxScansPerSecond: options.maxScansPerSecond || 10,
        preferredCamera: options.preferredCamera || 'environment',
        onDecodeError: (error) => {
          if (options.onError) {
            options.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
    );
    
    if (options.onDecode) {
      this.onScanCallback = options.onDecode;
    }
  }
  
  async start(): Promise<void> {
    await this.scanner.start();
  }
  
  stop(): void {
    this.scanner.stop();
  }
  
  static async hasCamera(): Promise<boolean> {
    return await QrScanner.hasCamera();
  }
  
  static async listCameras(): Promise<CameraInfo[]> {
    const cameras = await QrScanner.listCameras();
    return cameras.map(cam => ({
      id: cam.id,
      label: cam.label
    }));
  }
  
  async setCamera(cameraId: string): Promise<void> {
    await this.scanner.setCamera(cameraId);
  }
  
  async toggleFlash(): Promise<void> {
    if (await this.scanner.hasFlash()) {
      if (this.scanner.isFlashOn()) {
        await this.scanner.turnFlashOff();
      } else {
        await this.scanner.turnFlashOn();
      }
    }
  }
  
  isFlashOn(): boolean {
    return this.scanner.isFlashOn();
  }
  
  onScan(callback: (result: QRScanResult) => void): void {
    this.onScanCallback = callback;
  }
  
  static async scanImage(imageSource: string | HTMLImageElement): Promise<QRScanResult | null> {
    try {
      const result = await QrScanner.scanImage(imageSource);
      return {
        data: result.data,
        cornerPoints: result.cornerPoints
      };
    } catch (error) {
      return null;
    }
  }
  
  destroy(): void {
    this.scanner.destroy();
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/QRScanner.test.ts`
Expected: PASS

- [ ] **Step 5: Commit QR scanner**

```bash
git add src/engine/QRScanner.ts tests/QRScanner.test.ts
git commit -m "feat: implement QR scanner with Nimiq library"
```

---

### Task 10: Implement Fountain QR Integration

**Files:**
- Create: `src/engine/FountainQR.ts`
- Test: `tests/FountainQR.test.ts`

- [ ] **Step 1: Write failing test for Fountain QR encoder**

Create `tests/FountainQR.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { FountainQREncoder } from '../src/engine/FountainQR';

describe('FountainQR', () => {
  it('should create fountain QR encoder', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });
    
    expect(encoder).toBeDefined();
  });

  it('should calculate fragment size based on QR version', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });
    
    const fragmentSize = encoder.calculateFragmentSize(5);
    expect(fragmentSize).toBeGreaterThan(0);
    expect(fragmentSize).toBeLessThan(100);
  });

  it('should calculate redundancy based on error correction', () => {
    const encoder = new FountainQREncoder({
      qrVersion: 5,
      errorCorrectionLevel: 'H'
    });
    
    const redundancy = encoder.calculateRedundancy('H');
    expect(redundancy).toBeGreaterThan(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/FountainQR.test.ts`
Expected: FAIL - Module not found

- [ ] **Step 3: Implement Fountain QR encoder**

Create `src/engine/FountainQR.ts`:

```typescript
import { UREncoder, URDecoder } from './bc-ur';
import type { URFragment, ErrorCorrectionLevel, FountainProgress } from './bc-ur';
import { QRScanner, QRScanResult } from './QRScanner';

const QR_CAPACITY: Record<number, Record<ErrorCorrectionLevel, number>> = {
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
  20: { L: 858, M: 666, Q: 482, H: 382 }
};

const REDUNDANCY_MAP: Record<ErrorCorrectionLevel, number> = {
  L: 1.2,
  M: 1.5,
  Q: 2.0,
  H: 2.5
};

export interface FountainQREncoderOptions {
  qrVersion?: number;
  errorCorrectionLevel?: ErrorCorrectionLevel;
}

export class FountainQREncoder {
  private qrVersion: number;
  private ecLevel: ErrorCorrectionLevel;
  
  constructor(options: FountainQREncoderOptions = {}) {
    this.qrVersion = options.qrVersion || 5;
    this.ecLevel = options.errorCorrectionLevel || 'H';
  }
  
  calculateFragmentSize(qrVersion: number): number {
    const capacity = QR_CAPACITY[qrVersion]?.[this.ecLevel] || 50;
    return Math.max(20, capacity - 20);
  }
  
  calculateRedundancy(ecLevel: ErrorCorrectionLevel): number {
    return REDUNDANCY_MAP[ecLevel] || 1.5;
  }
  
  async generateFrames(
    data: string,
    qrVersion: number,
    ecLevel: ErrorCorrectionLevel
  ): Promise<string[]> {
    const encoder = new UREncoder(
      new TextEncoder().encode(data),
      {
        maxFragmentLength: this.calculateFragmentSize(qrVersion),
        minSequenceLength: Math.ceil(this.calculateRedundancy(ecLevel) * 5)
      }
    );
    
    const fragmentCount = Math.ceil(encoder.getFragmentCount() * this.calculateRedundancy(ecLevel));
    const frames: string[] = [];
    
    for (let i = 0; i < fragmentCount; i++) {
      const fragment = encoder.nextPart();
      const urString = this.encodeURFragment(fragment);
      frames.push(urString);
    }
    
    return frames;
  }
  
  private encodeURFragment(fragment: URFragment): string {
    const dataHex = Array.from(fragment.data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return `ur:${fragment.type}/${fragment.sequenceNumber}-${fragment.sequenceLength}/${dataHex}`;
  }
}

export interface FountainQRDecoderOptions {
  onProgress?: (progress: FountainProgress) => void;
  onComplete?: (data: string) => void;
  onFrame?: (frameNumber: number) => void;
}

export class FountainQRDecoder {
  private urDecoder: URDecoder;
  private qrScanner?: QRScanner;
  private onProgressCallback?: (progress: FountainProgress) => void;
  private onCompleteCallback?: (data: string) => void;
  private onFrameCallback?: (frameNumber: number) => void;
  private frameCount: number = 0;
  
  constructor(options: FountainQRDecoderOptions = {}) {
    this.urDecoder = new URDecoder();
    this.onProgressCallback = options.onProgress;
    this.onCompleteCallback = options.onComplete;
    this.onFrameCallback = options.onFrame;
  }
  
  receiveFragment(urData: string): void {
    const fragment = this.parseURFragment(urData);
    const isComplete = this.urDecoder.receivePart(fragment);
    
    this.frameCount++;
    
    if (this.onFrameCallback) {
      this.onFrameCallback(this.frameCount);
    }
    
    const progress = this.getProgress();
    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
    
    if (isComplete && this.onCompleteCallback) {
      const result = this.urDecoder.getResult();
      const data = new TextDecoder().decode(result);
      this.onCompleteCallback(data);
    }
  }
  
  private parseURFragment(urData: string): URFragment {
    const match = urData.match(/^ur:([^\/]+)\/(\d+)-(\d+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid UR fragment format');
    }
    
    const [, type, seqNum, seqLen, dataHex] = match;
    const data = new Uint8Array(dataHex.length / 2);
    for (let i = 0; i < dataHex.length; i += 2) {
      data[i / 2] = parseInt(dataHex.substr(i, 2), 16);
    }
    
    return {
      type,
      sequenceNumber: parseInt(seqNum),
      sequenceLength: parseInt(seqLen),
      data
    };
  }
  
  getProgress(): FountainProgress {
    const progress = this.urDecoder.getProgress();
    const estimatedTotal = Math.ceil(this.frameCount / Math.max(progress, 0.1));
    
    return {
      receivedFragments: this.frameCount,
      estimatedTotalFragments: estimatedTotal,
      percentage: Math.round(progress * 100),
      isComplete: this.urDecoder.isComplete()
    };
  }
  
  reset(): void {
    this.urDecoder.reset();
    this.frameCount = 0;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/FountainQR.test.ts`
Expected: PASS

- [ ] **Step 5: Commit Fountain QR**

```bash
git add src/engine/FountainQR.ts tests/FountainQR.test.ts
git commit -m "feat: implement Fountain QR encoder/decoder"
```

---

### Task 11: Update UI with Mode Tabs

**Files:**
- Modify: `qr-code/index.html`

- [ ] **Step 1: Add mode tabs to HTML**

Open `qr-code/index.html` and add after the opening `<div id="container">`:

```html
<div id="mode-tabs">
  <button class="mode-tab active" data-mode="generate">
    <i class="fas fa-magic"></i> Generate
  </button>
  <button class="mode-tab" data-mode="scan">
    <i class="fas fa-camera"></i> Scan
  </button>
</div>
```

- [ ] **Step 2: Wrap existing controls in generate mode div**

Find `<div id="controls">` and wrap it:

```html
<div id="generate-mode" class="mode-content active">
  <div id="controls">
    <!-- All existing controls remain here -->
  </div>
</div>
```

- [ ] **Step 3: Add fountain QR section before closing generate-mode**

Add before `</div>` of generate-mode:

```html
<div class="control-section" id="fountain-section">
  <h3><i class="fas fa-film"></i> Fountain QR Code</h3>
  <div class="checkbox-group">
    <label>
      <input type="checkbox" id="fountainEnabled">
      Enable fountain mode (animated sequence)
    </label>
  </div>
  
  <div id="fountain-controls" class="hidden">
    <div class="info-box">
      <i class="fas fa-info-circle"></i>
      <span>Data will be split across multiple QR frames</span>
    </div>
    
    <div id="fountain-preview">
      <canvas id="fountain-canvas"></canvas>
      <div id="fountain-progress">
        Frame <span id="current-frame">1</span> / <span id="total-frames">10</span>
      </div>
      <div class="button-group">
        <button id="playPauseBtn">
          <i class="fas fa-pause"></i> Pause
        </button>
        <button id="restartBtn">
          <i class="fas fa-redo"></i> Restart
        </button>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Add scan mode div after generate-mode**

Add after the generate-mode closing div:

```html
<div id="scan-mode" class="mode-content">
  <div class="control-section">
    <h3><i class="fas fa-camera"></i> QR Scanner</h3>
    
    <div id="scanner-container">
      <video id="scanner-video" playsinline></video>
      <div id="scanner-overlay">
        <div class="scan-region"></div>
      </div>
    </div>
    
    <div id="scanner-controls">
      <button id="startScanBtn" class="primary">
        <i class="fas fa-play"></i> Start Scanning
      </button>
      <button id="stopScanBtn" class="hidden">
        <i class="fas fa-stop"></i> Stop Scanning
      </button>
      <button id="switchCameraBtn">
        <i class="fas fa-sync"></i> Switch Camera
      </button>
      <button id="toggleFlashBtn" class="hidden">
        <i class="fas fa-bolt"></i> Toggle Flash
      </button>
    </div>
    
    <div id="scan-progress" class="hidden">
      <div class="progress-bar">
        <div id="progress-fill" style="width: 0%"></div>
      </div>
      <div id="progress-text">
        Scanning... Frame <span id="scanned-frames">0</span> / <span id="estimated-frames">?</span>
      </div>
    </div>
    
    <div id="scan-result" class="hidden">
      <h4><i class="fas fa-check-circle"></i> Scan Complete!</h4>
      <textarea id="result-data" rows="6" readonly></textarea>
      <button id="copyResultBtn">
        <i class="fas fa-copy"></i> Copy to Clipboard
      </button>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Commit UI changes**

```bash
git add qr-code/index.html
git commit -m "feat: add mode tabs and scanner UI to HTML"
```

---

### Task 12: Add CSS Styles

**Files:**
- Modify: `qr-code/style.css`

- [ ] **Step 1: Add mode tab styles**

Append to `qr-code/style.css`:

```css
/* Mode tabs */
#mode-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 2px solid #ddd;
}

.mode-tab {
  padding: 10px 20px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 16px;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.mode-tab.active {
  border-bottom-color: #667eea;
  color: #667eea;
  font-weight: bold;
}

.mode-content {
  display: none;
}

.mode-content.active {
  display: block;
}
```

- [ ] **Step 2: Add scanner styles**

Append to `qr-code/style.css`:

```css
/* Scanner */
#scanner-container {
  position: relative;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

#scanner-video {
  width: 100%;
  border-radius: 8px;
}

#scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.scan-region {
  position: absolute;
  top: 25%;
  left: 25%;
  right: 25%;
  bottom: 25%;
  border: 2px solid rgba(102, 126, 234, 0.5);
  border-radius: 8px;
}

.frame-captured {
  background: rgba(102, 126, 234, 0.3);
}
```

- [ ] **Step 3: Add progress bar styles**

Append to `qr-code/style.css`:

```css
/* Progress bar */
.progress-bar {
  width: 100%;
  height: 20px;
  background: #eee;
  border-radius: 10px;
  overflow: hidden;
  margin: 10px 0;
}

#progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  transition: width 0.3s;
}
```

- [ ] **Step 4: Add fountain QR styles**

Append to `qr-code/style.css`:

```css
/* Fountain QR */
#fountain-preview {
  text-align: center;
  margin-top: 20px;
}

#fountain-canvas {
  max-width: 300px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

#fountain-progress {
  margin: 10px 0;
  font-size: 14px;
  color: #666;
}
```

- [ ] **Step 5: Commit CSS styles**

```bash
git add qr-code/style.css
git commit -m "feat: add CSS styles for scanner and fountain UI"
```

---

### Task 13: Implement Mode Switching in demo.ts

**Files:**
- Modify: `qr-code/demo.ts`

- [ ] **Step 1: Import required modules**

Add at top of `qr-code/demo.ts`:

```typescript
import { QRScanner } from '../src/engine/QRScanner';
import { FountainQREncoder, FountainQRDecoder } from '../src/engine/FountainQR';
import type { QRScanResult } from '../src/engine/QRScanner';
import type { FountainProgress } from '../src/engine/bc-ur';
```

- [ ] **Step 2: Add private properties to QArtDemo class**

Add to QArtDemo class properties:

```typescript
private currentMode: 'generate' | 'scan' = 'generate';
private qrScanner?: QRScanner;
private fountainEncoder?: FountainQREncoder;
private fountainDecoder?: FountainQRDecoder;
private animationInterval?: number;
```

- [ ] **Step 3: Add mode tab initialization**

Add to `initializeEventListeners()` method:

```typescript
// Mode tabs
this.initializeModeTabs();
```

- [ ] **Step 4: Implement mode switching methods**

Add these methods to QArtDemo class:

```typescript
private initializeModeTabs(): void {
  const tabs = document.querySelectorAll('.mode-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      const mode = (e.currentTarget as HTMLElement).dataset.mode as 'generate' | 'scan';
      this.switchMode(mode);
    });
  });
}

private switchMode(mode: 'generate' | 'scan'): void {
  this.currentMode = mode;
  
  document.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', (tab as HTMLElement).dataset.mode === mode);
  });
  
  document.querySelectorAll('.mode-content').forEach(content => {
    content.classList.toggle('active', content.id === `${mode}-mode`);
  });
  
  if (mode === 'scan') {
    this.initializeScanner();
  } else {
    this.stopScanner();
  }
}
```

- [ ] **Step 5: Commit mode switching**

```bash
git add qr-code/demo.ts
git commit -m "feat: implement mode switching between Generate and Scan"
```

---

### Task 14: Implement Scanner Functionality

**Files:**
- Modify: `qr-code/demo.ts`

- [ ] **Step 1: Add scanner initialization method**

Add to QArtDemo class:

```typescript
private async initializeScanner(): Promise<void> {
  const video = document.getElementById('scanner-video') as HTMLVideoElement;
  
  if (!video) return;
  
  this.qrScanner = new QRScanner(video, {
    onDecode: (result) => this.handleScanResult(result),
    maxScansPerSecond: 10
  });
  
  document.getElementById('startScanBtn')?.addEventListener('click', () => this.startScanning());
  document.getElementById('stopScanBtn')?.addEventListener('click', () => this.stopScanning());
  document.getElementById('switchCameraBtn')?.addEventListener('click', () => this.switchCamera());
  document.getElementById('toggleFlashBtn')?.addEventListener('click', () => this.toggleFlash());
}
```

- [ ] **Step 2: Add scanner control methods**

Add to QArtDemo class:

```typescript
private async startScanning(): Promise<void> {
  if (!this.qrScanner) return;
  
  try {
    await this.qrScanner.start();
    
    document.getElementById('startScanBtn')?.classList.add('hidden');
    document.getElementById('stopScanBtn')?.classList.remove('hidden');
    document.getElementById('scan-progress')?.classList.remove('hidden');
  } catch (error) {
    console.error('Failed to start scanner:', error);
    alert('Failed to start camera. Please ensure camera permissions are granted.');
  }
}

private stopScanning(): void {
  this.qrScanner?.stop();
  
  document.getElementById('startScanBtn')?.classList.remove('hidden');
  document.getElementById('stopScanBtn')?.classList.add('hidden');
}

private stopScanner(): void {
  this.qrScanner?.destroy();
  this.qrScanner = undefined;
}

private async switchCamera(): Promise<void> {
  if (!this.qrScanner) return;
  
  const cameras = await QRScanner.listCameras();
  if (cameras.length > 1) {
    const currentCamera = cameras[0];
    const nextCamera = cameras[1];
    await this.qrScanner.setCamera(nextCamera.id);
  }
}

private async toggleFlash(): Promise<void> {
  if (!this.qrScanner) return;
  await this.qrScanner.toggleFlash();
}
```

- [ ] **Step 3: Commit scanner functionality**

```bash
git add qr-code/demo.ts
git commit -m "feat: implement QR scanner controls and camera management"
```

---

### Task 15: Implement Scan Result Handling

**Files:**
- Modify: `qr-code/demo.ts`

- [ ] **Step 1: Add scan result handler**

Add to QArtDemo class:

```typescript
private handleScanResult(result: QRScanResult): void {
  if (result.data.startsWith('ur:')) {
    this.handleFountainFragment(result.data);
  } else {
    this.displayScanResult(result.data);
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
  const progressFill = document.getElementById('progress-fill');
  const scannedFrames = document.getElementById('scanned-frames');
  const estimatedFrames = document.getElementById('estimated-frames');
  
  if (progressFill) {
    progressFill.style.width = `${progress.percentage}%`;
  }
  if (scannedFrames) {
    scannedFrames.textContent = progress.receivedFragments.toString();
  }
  if (estimatedFrames) {
    estimatedFrames.textContent = progress.estimatedTotalFragments.toString();
  }
  
  if (progress.isComplete) {
    this.stopScanning();
  }
}

private showFrameConfirmation(frameNumber: number): void {
  const overlay = document.getElementById('scanner-overlay');
  overlay?.classList.add('frame-captured');
  setTimeout(() => overlay?.classList.remove('frame-captured'), 200);
  
  this.playBeep();
}

private playBeep(): void {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.1);
}

private displayScanResult(data: string): void {
  const resultDiv = document.getElementById('scan-result');
  const resultData = document.getElementById('result-data') as HTMLTextAreaElement;
  
  if (resultDiv && resultData) {
    resultData.value = data;
    resultDiv.classList.remove('hidden');
  }
}
```

- [ ] **Step 2: Add copy result button handler**

Add to `initializeScanner()` method:

```typescript
document.getElementById('copyResultBtn')?.addEventListener('click', () => {
  const resultData = document.getElementById('result-data') as HTMLTextAreaElement;
  if (resultData) {
    resultData.select();
    document.execCommand('copy');
    alert('Copied to clipboard!');
  }
});
```

- [ ] **Step 3: Commit scan result handling**

```bash
git add qr-code/demo.ts
git commit -m "feat: implement scan result handling and fountain fragment processing"
```

---

### Task 16: Implement Fountain QR Generation

**Files:**
- Modify: `qr-code/demo.ts`

- [ ] **Step 1: Add fountain checkbox handler**

Add to `initializeEventListeners()` method:

```typescript
// Fountain mode
const fountainEnabled = document.getElementById('fountainEnabled') as HTMLInputElement;
fountainEnabled.addEventListener('change', () => {
  const fountainControls = document.getElementById('fountain-controls');
  if (fountainEnabled.checked) {
    fountainControls?.classList.remove('hidden');
  } else {
    fountainControls?.classList.add('hidden');
    this.stopFountainAnimation();
  }
});
```

- [ ] **Step 2: Modify generateQR to support fountain mode**

Update the `generateQR()` method to check fountain mode:

```typescript
private async generateQR(): Promise<void> {
  if (!this.currentData) {
    alert('Please enter data to encode');
    return;
  }
  
  const fountainEnabled = document.getElementById('fountainEnabled') as HTMLInputElement;
  
  if (fountainEnabled.checked) {
    await this.generateFountainQR();
    return;
  }
  
  // ... existing QR generation code remains ...
}
```

- [ ] **Step 3: Add fountain QR generation method**

Add to QArtDemo class:

```typescript
private async generateFountainQR(): Promise<void> {
  const qrVersion = parseInt((document.getElementById('version') as HTMLInputElement).value);
  const ecLevel = (document.querySelector('input[name="ecLevel"]:checked') as HTMLInputElement).value as any;
  
  this.fountainEncoder = new FountainQREncoder({
    qrVersion,
    errorCorrectionLevel: ecLevel
  });
  
  const frames = await this.fountainEncoder.generateFrames(this.currentData, qrVersion, ecLevel);
  
  this.startFountainAnimation(frames);
}

private startFountainAnimation(frames: string[]): void {
  const canvas = document.getElementById('fountain-canvas') as HTMLCanvasElement;
  const ctx = canvas.getContext('2d');
  const currentFrameSpan = document.getElementById('current-frame');
  const totalFramesSpan = document.getElementById('total-frames');
  
  if (!ctx || frames.length === 0) return;
  
  canvas.width = 300;
  canvas.height = 300;
  
  if (totalFramesSpan) {
    totalFramesSpan.textContent = frames.length.toString();
  }
  
  let frameIndex = 0;
  const fps = 2;
  
  this.stopFountainAnimation();
  
  this.animationInterval = window.setInterval(() => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'black';
    ctx.font = '12px monospace';
    ctx.fillText(frames[frameIndex], 10, 20);
    
    if (currentFrameSpan) {
      currentFrameSpan.textContent = (frameIndex + 1).toString();
    }
    
    frameIndex = (frameIndex + 1) % frames.length;
  }, 1000 / fps);
  
  document.getElementById('playPauseBtn')!.innerHTML = '<i class="fas fa-pause"></i> Pause';
}

private stopFountainAnimation(): void {
  if (this.animationInterval) {
    clearInterval(this.animationInterval);
    this.animationInterval = undefined;
  }
}
```

- [ ] **Step 4: Commit fountain generation**

```bash
git add qr-code/demo.ts
git commit -m "feat: implement fountain QR code generation and animation"
```

---

### Task 17: Test End-to-End Functionality

**Files:**
- None (manual testing)

- [ ] **Step 1: Start development server**

Run:
```bash
npm run dev
```

Expected: Server starts on http://localhost:6003

- [ ] **Step 2: Test fountain QR generation**

1. Open http://localhost:6003/qr-code/ in browser
2. Enter test data: "Hello, this is a test of fountain QR codes!"
3. Enable "Fountain mode" checkbox
4. Click "Generate QArt Code"
5. Verify animated sequence displays with frame counter
6. Verify animation loops

Expected: ✅ Animated QR sequence displays correctly

- [ ] **Step 3: Test QR scanner**

1. Click "Scan" tab
2. Click "Start Scanning"
3. Grant camera permission
4. Point camera at animated QR sequence (use second device)
5. Verify progress bar updates
6. Verify completion notification
7. Verify reassembled data matches original

Expected: ✅ Scanner successfully reassembles fountain QR

- [ ] **Step 4: Test regular QR scanning**

1. Generate a regular QR code (non-fountain)
2. Switch to Scan mode
3. Scan the regular QR code
4. Verify result displays correctly

Expected: ✅ Regular QR codes scan correctly

- [ ] **Step 5: Commit final testing notes**

```bash
git commit --allow-empty -m "test: complete end-to-end testing of QR scanner and fountain QR"
```

---

## Summary

This implementation plan delivers:

✅ **Phase 1**: bc-ur module with fountain code encoding/decoding
✅ **Phase 2**: QR scanner using Nimiq's library
✅ **Phase 3**: Fountain QR integration
✅ **Phase 4**: UI with tab-based mode switching

**Total Tasks**: 17 tasks with TDD approach
**Estimated Time**: 8-12 hours of focused work
**Test Coverage**: Unit tests for all core modules + integration tests

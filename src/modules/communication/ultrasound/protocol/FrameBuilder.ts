/**
 * Frame Builder
 * Assembles and parses data frames for ultrasound transmission
 *
 * Frame format:
 * [length (1 byte)] [deviceId (4 bytes)] [payload (0-256 bytes)]
 */

export class FrameBuilder {
  #deviceId: string;
  #maxPayloadSize: number;

  constructor(deviceId: string, maxPayloadSize: number = 256) {
    this.#deviceId = deviceId;
    this.#maxPayloadSize = maxPayloadSize;
  }

  /**
   * Build a frame from payload data
   */
  buildFrame(payload: Uint8Array): Uint8Array {
    if (payload.length > this.#maxPayloadSize) {
      throw new Error(`Payload too large: ${payload.length} > ${this.#maxPayloadSize}`);
    }

    // Frame: [length: 1 byte] [deviceId: 4 bytes] [payload: N bytes]
    const frame = new Uint8Array(1 + 4 + payload.length);

    // Length (payload only, not including header)
    frame[0] = payload.length;

    // Device ID (4 bytes - hash of string)
    const deviceIdBytes = this.encodeDeviceId(this.#deviceId);
    frame.set(deviceIdBytes, 1);

    // Payload
    frame.set(payload, 5);

    return frame;
  }

  /**
   * Parse a frame and extract payload
   */
  parseFrame(frame: Uint8Array): { deviceId: string; payload: Uint8Array } | null {
    if (frame.length < 5) {
      return null; // Too short
    }

    const length = frame[0];
    if (frame.length < 5 + length) {
      return null; // Incomplete frame
    }

    const deviceIdBytes = frame.slice(1, 5);
    const deviceId = this.decodeDeviceId(deviceIdBytes);
    const payload = frame.slice(5, 5 + length);

    return { deviceId, payload };
  }

  /**
   * Encode device ID string to 4 bytes
   */
  private encodeDeviceId(deviceId: string): Uint8Array {
    // Simple hash to 4 bytes
    let hash = 0;
    for (let i = 0; i < deviceId.length; i++) {
      const char = deviceId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    const bytes = new Uint8Array(4);
    bytes[0] = (hash >> 24) & 0xFF;
    bytes[1] = (hash >> 16) & 0xFF;
    bytes[2] = (hash >> 8) & 0xFF;
    bytes[3] = hash & 0xFF;
    return bytes;
  }

  /**
   * Decode device ID from 4 bytes
   */
  private decodeDeviceId(bytes: Uint8Array): string {
    // Return hex representation since we can't reverse the hash
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Get device ID
   */
  getDeviceId(): string {
    return this.#deviceId;
  }

  /**
   * Get max payload size
   */
  getMaxPayloadSize(): number {
    return this.#maxPayloadSize;
  }
}

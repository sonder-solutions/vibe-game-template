import init, { encrypt, decrypt, generate_command_hash, generate_time_code, generate_hash, get_time, increment_time, reset_time } from './wasm/pkg/game_security_wasm.js';
import type { ISecurityService } from '../../services/interfaces/ISecurityService';

export class CommunicationManager implements ISecurityService {
  #wasmInitialized = false;

  async initialize(): Promise<void> {
    if (!this.#wasmInitialized) {
      try {
        await init();
        this.#wasmInitialized = true;
      } catch {}
    }
  }

  isInitialized(): boolean {
    return this.#wasmInitialized;
  }

  encrypt(data: unknown): string {
    const json = JSON.stringify(data);
    return encrypt(json);
  }

  decrypt<T = unknown>(encrypted: string): T {
    const json = decrypt(encrypted);
    return JSON.parse(json) as T;
  }

  generateCommandHash(functionId: number): string {
    const time = Number(get_time());
    return generate_command_hash(functionId, BigInt(time));
  }

  generateTimeCode(): string {
    return generate_time_code();
  }

  generateHash(input: string): string {
    return generate_hash(input);
  }

  getTime(): bigint {
    return get_time();
  }

  incrementTime(): void {
    increment_time();
  }

  resetTime(): void {
    reset_time();
  }
}

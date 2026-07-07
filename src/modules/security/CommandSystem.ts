import init, { generate_command_hash, get_time } from './wasm/pkg/game_security_wasm.js';

export class CommandSystem {
  #commands: Map<number, () => void> = new Map();
  #wasmInitialized = false;

  async initialize(): Promise<void> {
    if (!this.#wasmInitialized) {
      try {
        await init();
        this.#wasmInitialized = true;
      } catch {}
    }
  }

  register(functionId: number, handler: () => void): void {
    this.#commands.set(functionId, handler);
  }

  getCommandHash(functionId: number): string {
    const time = Number(get_time());
    return generate_command_hash(functionId, BigInt(time));
  }

  execute(hash: string): boolean {
    for (const [functionId, handler] of this.#commands.entries()) {
      const expectedHash = this.getCommandHash(functionId);
      if (hash === expectedHash) {
        handler();
        return true;
      }
    }
    return false;
  }
}

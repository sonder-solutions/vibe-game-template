/**
 * Security Service Interface
 * Provides encryption, decryption, command validation, and time management
 * Optional module - can be tree-shaken if not used
 */
export interface ISecurityService {
  /**
   * Initialize the security service (e.g., load WASM module)
   */
  initialize(): Promise<void>;

  /**
   * Check if the service is initialized and ready
   */
  isInitialized(): boolean;

  /**
   * Encrypt data
   * @param data - Data to encrypt (will be JSON stringified)
   * @returns Encrypted string
   */
  encrypt(data: unknown): string;

  /**
   * Decrypt data
   * @param encrypted - Encrypted string
   * @returns Decrypted data
   */
  decrypt<T = unknown>(encrypted: string): T;

  /**
   * Generate a command hash for validation
   * @param functionId - Function identifier
   * @returns Hash string
   */
  generateCommandHash(functionId: number): string;

  /**
   * Generate a time-based authentication code
   * @returns Time code string
   */
  generateTimeCode(): string;

  /**
   * Generate a hash from input string
   * @param input - Input to hash
   * @returns Hash string
   */
  generateHash(input: string): string;

  /**
   * Get current game time
   * @returns Current time as bigint
   */
  getTime(): bigint;

  /**
   * Increment game time by one unit
   */
  incrementTime(): void;

  /**
   * Reset game time to zero
   */
  resetTime(): void;
}

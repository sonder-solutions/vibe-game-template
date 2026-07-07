export default function init(): Promise<void>;
export function encrypt(data: unknown): string;
export function decrypt(data: string): string;
export function generate_command_hash(functionId: number, time: bigint): string;
export function generate_time_code(): string;
export function generate_hash(input: string): string;
export function get_time(): bigint;
export function increment_time(): void;
export function reset_time(): void;

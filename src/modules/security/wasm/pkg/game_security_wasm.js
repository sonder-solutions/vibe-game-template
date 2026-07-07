// Stub WASM module for build purposes
export default async function init() {
  // Stub initialization
}

export function encrypt(data) {
  // Stub: return base64-like string
  return btoa(typeof data === 'string' ? data : JSON.stringify(data));
}

export function decrypt(data) {
  // Stub: decode from base64-like string
  try {
    const decoded = atob(data);
    // Try to parse as JSON, return as string
    JSON.parse(decoded);
    return decoded;
  } catch {
    return atob(data);
  }
}

export function generate_command_hash(functionId, time) {
  // Stub: return a simple hash
  return `${functionId}_${time}`;
}

export function generate_time_code() {
  // Stub: return time-based code
  return `time_${Date.now()}`;
}

export function generate_hash(input) {
  // Stub: return simple hash
  return `hash_${input}`;
}

let currentTime = BigInt(0);

export function get_time() {
  // Stub: return current time as BigInt
  return currentTime;
}

export function increment_time() {
  // Stub: increment time
  currentTime += BigInt(1);
}

export function reset_time() {
  // Stub: reset time to zero
  currentTime = BigInt(0);
}

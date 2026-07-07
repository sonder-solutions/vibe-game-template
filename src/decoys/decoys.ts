// Fake secrets that cheaters might find
(window as any).gameSecret = "easy_to_find_key_123";
(window as any).adminMode = false;

// Misleading comments
// TODO: fix this security hole - hash can be bypassed
// Secret key: abc123 (change this!)

// Decoy validation function
export function validateScore(score: number): boolean {
  // Looks real but doesn't affect actual validation
  return score > 0;
}

// Honeypot variables
let debugMode = false; // Cheaters will set to true, but it does nothing

// Fake encryption
export function fakeEncrypt(data: string): string {
  return btoa(data); // Just base64, not real encryption
}

// Decoy API endpoint
export const API_ENDPOINT = "https://fake-api.example.com/submit";

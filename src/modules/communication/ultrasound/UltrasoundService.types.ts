/**
 * Ultrasound Service Type Definitions
 * Based on DTMF multi-frequency encoding with Goertzel detection
 */

import type { UltrasoundConfig, UltrasoundPeer, UltrasoundEvent, UltrasoundState } from '../../../services/interfaces/IUltrasoundService.js';

// Re-export from interface
export type { UltrasoundConfig, UltrasoundPeer, UltrasoundEvent, UltrasoundState };

/**
 * Frequency plan for full-duplex DTMF communication
 * CH1: Master TX / Slave RX
 * CH2: Slave TX / Master RX
 */
export const FREQUENCY_PLAN = {
  CH1: [17000, 17500, 18000] as const,  // [low, mid, high]
  CH2: [18500, 19000, 19500] as const,  // [low, mid, high]
  NOISE_BAND: 15000,
} as const;

/**
 * Symbol encoding using frequency pairs
 * Each symbol is represented by transmitting two frequencies simultaneously
 */
export const SYMBOLS = ['0', '1', 'fn'] as const;
export type Symbol = typeof SYMBOLS[number];

/**
 * Symbol to frequency pair mapping
 * 0 = low + mid
 * 1 = high + mid
 * fn = low + high
 */
export const SYMBOL_PAIRS = [
  [0, 1], // 0: low + mid
  [2, 1], // 1: high + mid
  [0, 2], // fn: low + high
] as const;

/**
 * Goertzel detector state for single-frequency power detection
 */
export interface GoertzelState {
  freq: number;
  coeff: number;
  s1: number;
  s2: number;
  N: number;
  count: number;
  power: number;
}

/**
 * Transmitter oscillator state
 */
export interface OscillatorState {
  oscillator: OscillatorNode;
  gain: GainNode;
}

/**
 * Detection result from symbol decoder
 */
export interface DetectionResult {
  symbolIndex: number;  // -1 if no valid symbol detected
  confidence: number;   // 0-1 confidence level
  powers: {
    low: number;
    mid: number;
    high: number;
    noise: number;
  };
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<Omit<UltrasoundConfig, 'deviceId' | 'audioInputId' | 'audioOutputId'>> = {
  role: 'master',
  symbolDuration: 250,
  txPower: 0.35,
  confirmationCount: 2,
  noiseGateMultiplier: 8,
  discovery: false,
  beaconInterval: 2000,
  maxPayloadSize: 256,
  noiseFloorEstimationMs: 500,
};

/**
 * Get frequency array for a given role
 */
export function getTxFrequencies(role: 'master' | 'slave'): readonly number[] {
  return role === 'master' ? FREQUENCY_PLAN.CH1 : FREQUENCY_PLAN.CH2;
}

/**
 * Get receive frequency array for a given role
 */
export function getRxFrequencies(role: 'master' | 'slave'): readonly number[] {
  return role === 'master' ? FREQUENCY_PLAN.CH2 : FREQUENCY_PLAN.CH1;
}

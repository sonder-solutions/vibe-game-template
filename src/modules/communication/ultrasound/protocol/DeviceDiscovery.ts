/**
 * Device Discovery
 * Handles beacon broadcast and peer discovery
 */

import type { UltrasoundPeer } from '../../../../services/interfaces/IUltrasoundService.js';

export class DeviceDiscovery {
  #peers: Map<string, UltrasoundPeer> = new Map();
  #beaconInterval: number;
  #beaconTimer: number | null = null;
  #onBroadcastBeacon?: () => void;

  constructor(
    beaconInterval: number,
    onBroadcastBeacon?: () => void
  ) {
    this.#beaconInterval = beaconInterval;
    this.#onBroadcastBeacon = onBroadcastBeacon;
  }

  /**
   * Start discovery (broadcast beacons periodically)
   */
  start(): void {
    if (this.#beaconTimer !== null) {
      return;
    }

    this.#beaconTimer = window.setInterval(() => {
      this.#onBroadcastBeacon?.();
      this.cleanupStalePeers();
    }, this.#beaconInterval);
  }

  /**
   * Stop discovery
   */
  stop(): void {
    if (this.#beaconTimer !== null) {
      window.clearInterval(this.#beaconTimer);
      this.#beaconTimer = null;
    }
  }

  /**
   * Register or update a peer
   */
  updatePeer(deviceId: string, rssi: number, metadata?: Record<string, unknown>): void {
    const existing = this.#peers.get(deviceId);

    if (existing) {
      existing.rssi = rssi;
      existing.lastHeard = Date.now();
      if (metadata) {
        existing.metadata = { ...existing.metadata, ...metadata };
      }
    } else {
      this.#peers.set(deviceId, {
        deviceId,
        rssi,
        lastHeard: Date.now(),
        metadata,
      });
    }
  }

  /**
   * Get all known peers
   */
  getPeers(): UltrasoundPeer[] {
    return Array.from(this.#peers.values());
  }

  /**
   * Get a specific peer
   */
  getPeer(deviceId: string): UltrasoundPeer | undefined {
    return this.#peers.get(deviceId);
  }

  /**
   * Remove stale peers (not heard in 3x beacon interval)
   */
  private cleanupStalePeers(): void {
    const now = Date.now();
    const timeout = this.#beaconInterval * 3;

    for (const [deviceId, peer] of this.#peers.entries()) {
      if (now - peer.lastHeard > timeout) {
        this.#peers.delete(deviceId);
      }
    }
  }

  /**
   * Clear all peers
   */
  clearPeers(): void {
    this.#peers.clear();
  }

  /**
   * Get peer count
   */
  getPeerCount(): number {
    return this.#peers.size;
  }

  /**
   * Update beacon interval
   */
  setBeaconInterval(interval: number): void {
    this.#beaconInterval = interval;

    // Restart timer if running
    if (this.#beaconTimer !== null) {
      this.stop();
      this.start();
    }
  }
}

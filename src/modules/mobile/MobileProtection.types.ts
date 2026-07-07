/**
 * Mobile Protection Type Definitions
 * Configuration and interfaces for mobile gesture protection
 */

/**
 * Configuration for mobile protection features
 */
export interface MobileProtectionConfig {
  /**
   * Prevent pull-to-refresh gesture
   * @default true
   */
  preventPullToRefresh?: boolean;

  /**
   * Prevent double-tap zoom gesture
   * @default true
   */
  preventDoubleTapZoom?: boolean;

  /**
   * Prevent pinch-to-zoom gesture
   * @default true
   */
  preventPinchZoom?: boolean;

  /**
   * Prevent context menu on target element
   * @default true
   */
  preventContextMenu?: boolean;

  /**
   * Target element to protect
   * If not provided, protects entire document.body
   */
  target?: HTMLElement;
}

/**
 * Interface for mobile protection functionality
 */
export interface IMobileProtection {
  /**
   * Enable all configured protections
   */
  enable(): void;

  /**
   * Disable all protections and restore default behavior
   */
  disable(): void;

  /**
   * Check if protection is currently enabled
   */
  isEnabled(): boolean;
}

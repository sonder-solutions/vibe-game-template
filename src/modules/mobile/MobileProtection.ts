import type { IMobileProtection, MobileProtectionConfig } from './MobileProtection.types';

/**
 * Mobile Protection
 * Prevents unwanted mobile gestures and behaviors
 *
 * Features:
 * - Pull-to-refresh prevention
 * - Double-tap zoom prevention
 * - Pinch-to-zoom prevention
 * - Context menu prevention
 *
 * @example
 * ```typescript
 * const protection = new MobileProtection({
 *   target: canvas,
 *   preventPullToRefresh: true,
 *   preventDoubleTapZoom: true,
 *   preventPinchZoom: true,
 *   preventContextMenu: true
 * });
 * protection.enable();
 * ```
 */
export class MobileProtection implements IMobileProtection {
  private config: Required<MobileProtectionConfig>;
  private enabled: boolean = false;
  private lastTouchEnd: number = 0;

  constructor(config?: MobileProtectionConfig) {
    this.config = {
      preventPullToRefresh: config?.preventPullToRefresh ?? true,
      preventDoubleTapZoom: config?.preventDoubleTapZoom ?? true,
      preventPinchZoom: config?.preventPinchZoom ?? true,
      preventContextMenu: config?.preventContextMenu ?? true,
      target: config?.target ?? document.body
    };
  }

  /**
   * Enable all configured protections
   */
  enable(): void {
    if (this.enabled) return;

    // Prevent pull-to-refresh
    if (this.config.preventPullToRefresh) {
      document.body.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.touchAction = 'none';
    }

    // Prevent context menu on target
    if (this.config.preventContextMenu) {
      this.config.target.addEventListener('contextmenu', this.preventContextMenu);
    }

    // Prevent double-tap zoom
    if (this.config.preventDoubleTapZoom) {
      document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    }

    // Prevent pinch-to-zoom
    if (this.config.preventPinchZoom) {
      document.addEventListener('gesturestart', this.preventGesture);
      document.addEventListener('gesturechange', this.preventGesture);
      document.addEventListener('gestureend', this.preventGesture);
    }

    this.enabled = true;
  }

  /**
   * Disable all protections and restore default behavior
   */
  disable(): void {
    if (!this.enabled) return;

    // Restore default behaviors
    if (this.config.preventPullToRefresh) {
      document.body.style.overscrollBehavior = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.touchAction = '';
    }

    // Remove event listeners
    if (this.config.preventContextMenu) {
      this.config.target.removeEventListener('contextmenu', this.preventContextMenu);
    }

    if (this.config.preventDoubleTapZoom) {
      document.removeEventListener('touchend', this.handleTouchEnd);
    }

    if (this.config.preventPinchZoom) {
      document.removeEventListener('gesturestart', this.preventGesture);
      document.removeEventListener('gesturechange', this.preventGesture);
      document.removeEventListener('gestureend', this.preventGesture);
    }

    this.enabled = false;
  }

  /**
   * Check if protection is currently enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Prevent context menu handler
   */
  private preventContextMenu = (e: Event): void => {
    e.preventDefault();
  };

  /**
   * Handle touch end to prevent double-tap zoom
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    const now = Date.now();
    if (now - this.lastTouchEnd <= 300) {
      e.preventDefault();
    }
    this.lastTouchEnd = now;
  };

  /**
   * Prevent gesture handler (pinch-to-zoom)
   */
  private preventGesture = (e: Event): void => {
    e.preventDefault();
  };
}

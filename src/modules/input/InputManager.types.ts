/**
 * Input Module Type Definitions
 * Comprehensive input handling for games and applications
 */

/**
 * Input directions for movement-based input
 */
export type InputDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Input events that can be subscribed to
 */
export type InputEvent = 'tap' | 'double-tap' | 'swipe' | 'pinch' | 'rotate';

/**
 * Input actions - custom named actions that can be mapped to any input
 */
export type InputAction = string;

/**
 * Configuration for InputManager
 */
export interface InputManagerConfig {
  /** Threshold in ms for double-tap detection (default: 300) */
  doubleTapThreshold?: number;

  /** Minimum distance in pixels for swipe detection (default: 30) */
  swipeThreshold?: number;

  /** Maximum movement during tap (default: 10) */
  tapMoveThreshold?: number;

  /** Deadzone for analog inputs (default: 0.15) */
  deadzone?: number;

  /** Enable scroll wheel input (default: true) */
  enableScroll?: boolean;

  /** Scroll sensitivity multiplier (default: 1.0) */
  scrollSensitivity?: number;

  /** Enable trackpad gestures (default: true) */
  enableTrackpadGestures?: boolean;

  /** Enable pressure sensitivity (default: false) */
  enablePressure?: boolean;

  /** Custom keybindings map */
  keybindings?: Record<string, InputDirection | InputAction>;

  /** Custom action definitions */
  actions?: Record<InputAction, InputActionConfig>;
}

/**
 * Configuration for a custom input action
 */
export interface InputActionConfig {
  /** Keyboard keys that trigger this action */
  keys?: string[];

  /** Gamepad buttons that trigger this action */
  gamepadButtons?: number[];

  /** Whether this action is digital (on/off) or analog (0-1) */
  type?: 'digital' | 'analog';

  /** Default value for analog actions */
  defaultValue?: number;
}

/**
 * Touch point information
 */
export interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  pressure: number;
  startTime: number;
  startTimeStamp: number;
}

/**
 * Swipe event data
 */
export interface SwipeEvent {
  direction: InputDirection;
  distance: number;
  duration: number;
  velocity: number;
}

/**
 * Pinch event data
 */
export interface PinchEvent {
  scale: number;
  deltaScale: number;
  centerX: number;
  centerY: number;
}

/**
 * Rotate event data
 */
export interface RotateEvent {
  angle: number;
  deltaAngle: number;
  centerX: number;
  centerY: number;
}

/**
 * Scroll event data
 */
export interface ScrollEvent {
  deltaX: number;
  deltaY: number;
  deltaZ: number;
}

/**
 * Input state snapshot
 */
export interface InputState {
  directions: Record<InputDirection, number>;
  actions: Record<InputAction, number>;
  mouse: {
    x: number;
    y: number;
    down: boolean;
    wheel: { x: number; y: number };
  };
  touches: TouchPoint[];
  gamepad: {
    connected: boolean;
    buttons: Record<number, number>;
    axes: number[];
  } | null;
}

/**
 * Interface for input manager functionality
 */
export interface IInputManager {
  /**
   * Update input state (call each frame)
   */
  update(): void;

  /**
   * Get magnitude for a direction (0-1)
   */
  getMagnitude(direction: InputDirection): number;

  /**
   * Get value for a custom action (0-1 for analog, 0 or 1 for digital)
   */
  getAction(action: InputAction): number;

  /**
   * Subscribe to an input event
   */
  on(event: InputEvent, callback: (data?: any) => void): void;

  /**
   * Unsubscribe from an input event
   */
  off(event: InputEvent, callback: (data?: any) => void): void;

  /**
   * Get current mouse position
   */
  getMousePosition(): { x: number; y: number };

  /**
   * Check if mouse button is down
   */
  isMouseDown(): boolean;

  /**
   * Get scroll delta
   */
  getScrollDelta(): { x: number; y: number };

  /**
   * Get clicked sprite ID (if any)
   */
  getClickedSprite(): string | null;

  /**
   * Set clicked sprite ID
   */
  setClickedSprite(id: string | null): void;

  /**
   * Get complete input state snapshot
   */
  getState(): InputState;

  /**
   * Check if any input is active
   */
  hasActiveInput(): boolean;

  /**
   * Reset all input state
   */
  reset(): void;

  /**
   * Clean up event listeners
   */
  destroy(): void;
}

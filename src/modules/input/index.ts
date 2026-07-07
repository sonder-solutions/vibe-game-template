/**
 * Input Module - Centralized input handling
 * Provides comprehensive input support for keyboard, mouse, touch, gamepad, and trackpad gestures
 */

export { InputManager } from './InputManager.js';
export type {
  IInputManager,
  InputManagerConfig,
  InputDirection,
  InputEvent,
  InputAction,
  InputActionConfig,
  TouchPoint,
  SwipeEvent,
  PinchEvent,
  RotateEvent,
  ScrollEvent,
  InputState
} from './InputManager.types.js';

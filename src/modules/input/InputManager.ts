/**
 * Enhanced InputManager - Centralized input handling
 * Supports keyboard, mouse, touch, gamepad, and trackpad gestures
 * Fully configurable with custom keybindings and actions
 */

import type {
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
} from './InputManager.types';

export class InputManager implements IInputManager {
  private config: Required<Omit<InputManagerConfig, 'keybindings' | 'actions'>> & {
    keybindings: Record<string, InputDirection | InputAction>;
    actions: Record<InputAction, InputActionConfig>;
  };

  private directions: Record<InputDirection, number> = {
    up: 0,
    down: 0,
    left: 0,
    right: 0
  };

  private actions: Record<InputAction, number> = {};

  private eventCallbacks: Record<InputEvent, Array<(data?: any) => void>> = {
    tap: [],
    'double-tap': [],
    swipe: [],
    pinch: [],
    rotate: []
  };

  // Keyboard state
  private keys: Set<string> = new Set();

  // Mouse state
  private mousePosition = { x: 0, y: 0 };
  private mouseDown = false;
  private mouseWheel = { x: 0, y: 0 };
  private clickedSpriteId: string | null = null;

  // Touch state
  private touches: Map<number, TouchPoint> = new Map();
  private lastTapTime = 0;
  private lastTapPosition = { x: 0, y: 0 };
  private pinchStartDistance = 0;
  private rotateStartAngle = 0;

  // Gamepad state
  private gamepadState: {
    connected: boolean;
    buttons: Record<number, number>;
    axes: number[];
  } | null = null;

  // Input buffering
  private inputBuffer: Array<{ type: InputEvent; data: any; timestamp: number }> = [];
  private bufferStartTime = 0;

  constructor(config: InputManagerConfig = {}) {
    this.config = {
      doubleTapThreshold: config.doubleTapThreshold ?? 300,
      swipeThreshold: config.swipeThreshold ?? 30,
      tapMoveThreshold: config.tapMoveThreshold ?? 10,
      deadzone: config.deadzone ?? 0.15,
      enableScroll: config.enableScroll ?? true,
      scrollSensitivity: config.scrollSensitivity ?? 1.0,
      enableTrackpadGestures: config.enableTrackpadGestures ?? true,
      enablePressure: config.enablePressure ?? false,
      keybindings: config.keybindings ?? {
        'w': 'up',
        'arrowup': 'up',
        's': 'down',
        'arrowdown': 'down',
        'a': 'left',
        'arrowleft': 'left',
        'd': 'right',
        'arrowright': 'right'
      },
      actions: config.actions ?? {}
    };

    this.setupEventListeners();
    this.setupGamepad();
  }

  private setupEventListeners(): void {
    // Keyboard
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // Mouse
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);

    // Scroll
    if (this.config.enableScroll) {
      window.addEventListener('wheel', this.handleWheel, { passive: false });
    }

    // Touch
    window.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    window.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    window.addEventListener('touchend', this.handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', this.handleTouchEnd, { passive: false });

    // Trackpad gestures (Safari)
    if (this.config.enableTrackpadGestures) {
      window.addEventListener('gesturestart', this.handleGestureStart);
      window.addEventListener('gesturechange', this.handleGestureChange);
      window.addEventListener('gestureend', this.handleGestureEnd);
    }
  }

  private setupGamepad(): void {
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.add(key);

    const binding = this.config.keybindings[key];
    if (binding && this.config.actions[binding]?.type === 'digital') {
      this.actions[binding] = 1;
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.keys.delete(key);

    const binding = this.config.keybindings[key];
    if (binding && this.config.actions[binding]?.type === 'digital') {
      this.actions[binding] = 0;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.mousePosition.x = e.clientX;
    this.mousePosition.y = e.clientY;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    this.mouseDown = true;
    this.lastTapTime = Date.now();
    this.lastTapPosition = { x: e.clientX, y: e.clientY };
  };

  private handleMouseUp = (e: MouseEvent): void => {
    const wasDown = this.mouseDown;
    this.mouseDown = false;

    if (wasDown) {
      const now = Date.now();
      const timeDiff = now - this.lastTapTime;
      const distance = Math.hypot(
        e.clientX - this.lastTapPosition.x,
        e.clientY - this.lastTapPosition.y
      );

      if (timeDiff < this.config.doubleTapThreshold && distance < this.config.tapMoveThreshold) {
        this.triggerEvent('double-tap');
      } else if (distance < this.config.tapMoveThreshold) {
        this.triggerEvent('tap');
      }
    }
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.mouseWheel.x = e.deltaX * this.config.scrollSensitivity;
    this.mouseWheel.y = e.deltaY * this.config.scrollSensitivity;

    this.triggerEvent('swipe', {
      deltaX: this.mouseWheel.x,
      deltaY: this.mouseWheel.y,
      deltaZ: e.deltaZ
    } as ScrollEvent);
  };

  private handleTouchStart = (e: TouchEvent): void => {
    // Don't prevent default - allow normal touch behavior for buttons
    // Only prevent if we're specifically handling canvas gestures

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      this.touches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        pressure: this.config.enablePressure ? (touch.force || 0.5) : 0.5,
        startTime: Date.now(),
        startTimeStamp: performance.now()
      });
    }

    // Detect pinch/rotate start
    if (this.touches.size === 2) {
      const touchArray = Array.from(this.touches.values());
      this.pinchStartDistance = this.getTouchDistance(touchArray[0], touchArray[1]);
      this.rotateStartAngle = this.getTouchAngle(touchArray[0], touchArray[1]);
    }
  };

  private handleTouchMove = (e: TouchEvent): void => {
    // Don't prevent default - allow normal scrolling and touch behavior

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const existing = this.touches.get(touch.identifier);
      if (existing) {
        existing.x = touch.clientX;
        existing.y = touch.clientY;
        if (this.config.enablePressure) {
          existing.pressure = touch.force || 0.5;
        }
      }
    }

    // Detect pinch/rotate
    if (this.touches.size === 2) {
      const touchArray = Array.from(this.touches.values());
      const currentDistance = this.getTouchDistance(touchArray[0], touchArray[1]);
      const currentAngle = this.getTouchAngle(touchArray[0], touchArray[1]);

      if (this.pinchStartDistance > 0) {
        const scale = currentDistance / this.pinchStartDistance;
        this.triggerEvent('pinch', {
          scale,
          deltaScale: scale - 1,
          centerX: (touchArray[0].x + touchArray[1].x) / 2,
          centerY: (touchArray[0].y + touchArray[1].y) / 2
        } as PinchEvent);
      }

      if (this.rotateStartAngle !== 0) {
        const angleDiff = currentAngle - this.rotateStartAngle;
        this.triggerEvent('rotate', {
          angle: angleDiff,
          deltaAngle: angleDiff,
          centerX: (touchArray[0].x + touchArray[1].x) / 2,
          centerY: (touchArray[0].y + touchArray[1].y) / 2
        } as RotateEvent);
      }
    }
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    // Don't prevent default - allow normal touch behavior

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const existing = this.touches.get(touch.identifier);

      if (existing) {
        const now = Date.now();
        const duration = now - existing.startTime;
        const distance = Math.hypot(touch.clientX - existing.x, touch.clientY - existing.y);

        // Detect swipe
        if (distance > this.config.swipeThreshold) {
          const direction = this.getSwipeDirection(existing.x, existing.y, touch.clientX, touch.clientY);
          const velocity = distance / duration;

          this.triggerEvent('swipe', {
            direction,
            distance,
            duration,
            velocity
          } as SwipeEvent);
        } else if (distance < this.config.tapMoveThreshold) {
          // Detect tap
          const timeDiff = now - this.lastTapTime;
          if (timeDiff < this.config.doubleTapThreshold) {
            this.triggerEvent('double-tap');
          } else {
            this.triggerEvent('tap');
          }
          this.lastTapTime = now;
        }

        this.touches.delete(touch.identifier);
      }
    }

    // Reset pinch/rotate if less than 2 touches
    if (this.touches.size < 2) {
      this.pinchStartDistance = 0;
      this.rotateStartAngle = 0;
    }
  };

  private handleGestureStart = (e: Event): void => {
    e.preventDefault();
  };

  private handleGestureChange = (e: any): void => {
    e.preventDefault();

    if (e.scale !== undefined && e.scale !== 1) {
      this.triggerEvent('pinch', {
        scale: e.scale,
        deltaScale: e.scale - 1,
        centerX: e.clientX,
        centerY: e.clientY
      } as PinchEvent);
    }

    if (e.rotation !== undefined && e.rotation !== 0) {
      this.triggerEvent('rotate', {
        angle: e.rotation,
        deltaAngle: e.rotation,
        centerX: e.clientX,
        centerY: e.clientY
      } as RotateEvent);
    }
  };

  private handleGestureEnd = (e: Event): void => {
    e.preventDefault();
  };

  private handleGamepadConnected = (e: GamepadEvent): void => {
    this.gamepadState = {
      connected: true,
      buttons: {},
      axes: []
    };
  };

  private handleGamepadDisconnected = (e: GamepadEvent): void => {
    this.gamepadState = null;
  };

  private updateGamepad(): void {
    if (!this.gamepadState) return;

    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0]; // Use first connected gamepad

    if (!gamepad) {
      this.gamepadState.connected = false;
      return;
    }

    this.gamepadState.connected = true;

    // Update buttons
    for (let i = 0; i < gamepad.buttons.length; i++) {
      const value = gamepad.buttons[i].value;
      this.gamepadState.buttons[i] = value;

      // Check if this button is mapped to an action
      for (const [actionName, actionConfig] of Object.entries(this.config.actions)) {
        if (actionConfig.gamepadButtons?.includes(i)) {
          this.actions[actionName] = value;
        }
      }
    }

    // Update axes
    this.gamepadState.axes = Array.from(gamepad.axes);

    // Apply deadzone to axes
    const deadzone = this.config.deadzone;
    const leftStickX = Math.abs(gamepad.axes[0]) > deadzone ? gamepad.axes[0] : 0;
    const leftStickY = Math.abs(gamepad.axes[1]) > deadzone ? gamepad.axes[1] : 0;

    // Map to directions
    this.directions.left = Math.max(0, -leftStickX);
    this.directions.right = Math.max(0, leftStickX);
    this.directions.up = Math.max(0, -leftStickY);
    this.directions.down = Math.max(0, leftStickY);
  }

  private getTouchDistance(t1: TouchPoint, t2: TouchPoint): number {
    return Math.hypot(t2.x - t1.x, t2.y - t1.y);
  }

  private getTouchAngle(t1: TouchPoint, t2: TouchPoint): number {
    return Math.atan2(t2.y - t1.y, t2.x - t1.x);
  }

  private getSwipeDirection(startX: number, startY: number, endX: number, endY: number): InputDirection {
    const dx = endX - startX;
    const dy = endY - startY;

    if (Math.abs(dx) > Math.abs(dy)) {
      return dx > 0 ? 'right' : 'left';
    } else {
      return dy > 0 ? 'down' : 'up';
    }
  }

  private triggerEvent(event: InputEvent, data?: any): void {
    this.inputBuffer.push({ type: event, data, timestamp: Date.now() });
    this.eventCallbacks[event].forEach(callback => callback(data));
  }

  update(): void {
    // Reset directions
    this.directions.up = 0;
    this.directions.down = 0;
    this.directions.left = 0;
    this.directions.right = 0;

    // Update keyboard
    for (const key of this.keys) {
      const binding = this.config.keybindings[key];
      if (binding === 'up') this.directions.up = 1;
      else if (binding === 'down') this.directions.down = 1;
      else if (binding === 'left') this.directions.left = 1;
      else if (binding === 'right') this.directions.right = 1;
      else if (this.config.actions[binding]?.type === 'analog') {
        this.actions[binding] = 1;
      }
    }

    // Update touch (single-finger swipe for directional input)
    this.updateTouch();

    // Update gamepad
    this.updateGamepad();

    // Reset scroll delta after processing
    this.mouseWheel.x = 0;
    this.mouseWheel.y = 0;

    // Clear old buffer entries (older than 1 second)
    const now = Date.now();
    this.inputBuffer = this.inputBuffer.filter(entry => now - entry.timestamp < 1000);
  }

  private updateTouch(): void {
    // Only process single-finger touch for directional input
    if (this.touches.size !== 1) return;

    const touch = Array.from(this.touches.values())[0];
    const deltaX = touch.x - touch.startX;
    const deltaY = touch.y - touch.startY;
    const distance = Math.hypot(deltaX, deltaY);

    // Ignore if too small (not a swipe)
    if (distance < this.config.swipeThreshold) return;

    // Calculate magnitude (0-1) based on distance
    const maxDistance = 200;
    const magnitude = Math.min(1.0, distance / maxDistance);

    // Determine primary direction
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0) {
        this.directions.right = magnitude;
      } else {
        this.directions.left = magnitude;
      }
    } else {
      // Vertical swipe
      if (deltaY > 0) {
        this.directions.down = magnitude;
      } else {
        this.directions.up = magnitude;
      }
    }
  }

  getMagnitude(direction: InputDirection): number {
    return this.directions[direction];
  }

  getAction(action: InputAction): number {
    return this.actions[action] ?? 0;
  }

  on(event: InputEvent, callback: (data?: any) => void): void {
    this.eventCallbacks[event].push(callback);
  }

  off(event: InputEvent, callback: (data?: any) => void): void {
    const index = this.eventCallbacks[event].indexOf(callback);
    if (index > -1) {
      this.eventCallbacks[event].splice(index, 1);
    }
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  getScrollDelta(): { x: number; y: number } {
    return { ...this.mouseWheel };
  }

  getClickedSprite(): string | null {
    return this.clickedSpriteId;
  }

  setClickedSprite(id: string | null): void {
    this.clickedSpriteId = id;
  }

  getState(): InputState {
    return {
      directions: { ...this.directions },
      actions: { ...this.actions },
      mouse: {
        x: this.mousePosition.x,
        y: this.mousePosition.y,
        down: this.mouseDown,
        wheel: { ...this.mouseWheel }
      },
      touches: Array.from(this.touches.values()),
      gamepad: this.gamepadState ? { ...this.gamepadState } : null
    };
  }

  hasActiveInput(): boolean {
    return (
      Object.values(this.directions).some(v => v > 0) ||
      Object.values(this.actions).some(v => v > 0) ||
      this.mouseDown ||
      this.touches.size > 0 ||
      (this.gamepadState?.connected && Object.values(this.gamepadState.buttons).some(v => v > 0)) ||
      false
    );
  }

  reset(): void {
    this.directions = { up: 0, down: 0, left: 0, right: 0 };
    this.actions = {};
    this.mouseDown = false;
    this.mouseWheel = { x: 0, y: 0 };
    this.touches.clear();
    this.inputBuffer = [];
    this.clickedSpriteId = null;
  }

  destroy(): void {
    // Remove all event listeners
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('touchstart', this.handleTouchStart);
    window.removeEventListener('touchmove', this.handleTouchMove);
    window.removeEventListener('touchend', this.handleTouchEnd);
    window.removeEventListener('touchcancel', this.handleTouchEnd);
    window.removeEventListener('gesturestart', this.handleGestureStart);
    window.removeEventListener('gesturechange', this.handleGestureChange);
    window.removeEventListener('gestureend', this.handleGestureEnd);
    window.removeEventListener('gamepadconnected', this.handleGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.handleGamepadDisconnected);

    this.reset();
  }
}

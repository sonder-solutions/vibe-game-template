import { describe, it, expect, beforeEach } from 'vitest';
import { HealthBar } from '../../src/ui/HealthBar';

describe('HealthBar', () => {
  beforeEach(() => {
    if (!customElements.get('health-bar')) {
      customElements.define('health-bar', HealthBar);
    }
  });

  it('should create health bar element', () => {
    const element = document.createElement('health-bar');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(HealthBar);
  });

  it('should set health percentage', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(75, 100);
    expect(element.percentage).toBe(75);
  });

  it('should default max to 100', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(42);
    expect(element.percentage).toBe(42);
  });

  it('should clamp current health to zero minimum', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(-10, 100);
    expect(element.percentage).toBe(0);
  });

  it('should use green color for high health (>60%)', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(80, 100);
    expect(element.currentColor).toBe('#4CAF50');
  });

  it('should use yellow color for medium health (30-60%)', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(45, 100);
    expect(element.currentColor).toBe('#FFC107');
  });

  it('should use red color for low health (<30%)', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(20, 100);
    expect(element.currentColor).toBe('#F44336');
  });

  it('should allow CSS custom properties to override colors', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    element.style.setProperty('--health-color-high', 'lime');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setHealth(80, 100);
    expect(element.currentColor).toBe('lime');
  });

  it('should have a closed shadow root', async () => {
    const element = document.createElement('health-bar') as HealthBar;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    // closed shadow DOM means shadowRoot is not accessible from outside
    expect(element.shadowRoot).toBeNull();
  });
});

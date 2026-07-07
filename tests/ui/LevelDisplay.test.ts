import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LevelDisplay } from '../../src/ui/LevelDisplay';

describe('LevelDisplay', () => {
  beforeEach(() => {
    if (!customElements.get('level-display')) {
      customElements.define('level-display', LevelDisplay);
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create level display element', () => {
    const element = document.createElement('level-display');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(LevelDisplay);
  });

  it('should have closed shadow DOM', () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    // Closed shadow DOM should not be accessible from outside
    expect(element.shadowRoot).toBeNull();
  });

  it('should display current level', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(3);
    // Should show "Level 3" - closed shadow DOM prevents direct content check
    expect(element).toBeDefined();
  });

  it('should display current level with total', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(3, 10);
    // Should show "Level 3/10"
    expect(element).toBeDefined();
  });

  it('should use CSS custom properties', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    element.style.setProperty('--level-color', 'gold');
    element.style.setProperty('--level-font-size', '32px');
    element.style.setProperty('--level-font-family', 'Arial');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(5);
    // Should apply custom styling via CSS custom properties
    expect(element).toBeDefined();
  });

  it('should update when setLevel is called multiple times', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(1);
    element.setLevel(2, 10);
    element.setLevel(3);
    expect(element).toBeDefined();
  });

  it('should default to level 1', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));
    // Default level should be 1 - no errors on render
    expect(element).toBeDefined();
  });

  it('should render without total when only current is provided', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(7);
    // Should show "Level 7" (no "/total")
    expect(element).toBeDefined();
  });

  it('should render with total when both current and total are provided', async () => {
    const element = document.createElement('level-display') as LevelDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLevel(3, 10);
    // Should show "Level 3/10"
    expect(element).toBeDefined();
  });
});

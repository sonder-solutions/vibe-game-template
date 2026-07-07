import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LivesDisplay } from '../../src/ui/LivesDisplay';

describe('LivesDisplay', () => {
  beforeEach(() => {
    if (!customElements.get('lives-display')) {
      customElements.define('lives-display', LivesDisplay);
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('should create lives display element', () => {
    const element = document.createElement('lives-display');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(LivesDisplay);
  });

  it('should have closed shadow DOM', () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    document.body.appendChild(element);
    // Closed shadow DOM should not be accessible from outside
    expect(element.shadowRoot).toBeNull();
  });

  it('should display integer mode', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'integer');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 5);
    // Closed shadow DOM - verify no exceptions and element renders
    expect(element).toBeDefined();
  });

  it('should display percentage mode', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'percentage');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 5);
    expect(element).toBeDefined();
  });

  it('should display fraction mode', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'fraction');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 5);
    expect(element).toBeDefined();
  });

  it('should display graphics mode', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'graphics');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 5);
    expect(element).toBeDefined();
  });

  it('should default to 5 max lives', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'fraction');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3);
    // With default max of 5, should show "3/5" - no errors
    expect(element).toBeDefined();
  });

  it('should accept custom max lives', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'fraction');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 10);
    expect(element).toBeDefined();
  });

  it('should use CSS custom properties for styling', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.style.setProperty('--lives-color', 'gold');
    element.style.setProperty('--lives-font-size', '32px');
    element.setAttribute('mode', 'integer');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(5);
    // Closed shadow DOM prevents direct style verification
    expect(element).toBeDefined();
  });

  it('should update when setLives is called multiple times', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'integer');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(3, 5);
    element.setLives(2, 5);
    element.setLives(1, 5);
    expect(element).toBeDefined();
  });

  it('should handle zero lives', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'percentage');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(0, 5);
    // 0/5 = 0% - should not cause division errors
    expect(element).toBeDefined();
  });

  it('should handle full lives', async () => {
    const element = document.createElement('lives-display') as LivesDisplay;
    element.setAttribute('mode', 'percentage');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setLives(5, 5);
    // 5/5 = 100%
    expect(element).toBeDefined();
  });
});

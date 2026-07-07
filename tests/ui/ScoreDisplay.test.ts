import { describe, it, expect, beforeEach } from 'vitest';
import { ScoreDisplay } from '../../src/ui/ScoreDisplay';

describe('ScoreDisplay', () => {
  beforeEach(() => {
    if (!customElements.get('score-display')) {
      customElements.define('score-display', ScoreDisplay);
    }
  });

  it('should create score display element', () => {
    const element = document.createElement('score-display');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(ScoreDisplay);
  });

  it('should update score in Shadow DOM', async () => {
    const element = document.createElement('score-display') as ScoreDisplay;
    document.body.appendChild(element);
    // Wait for connectedCallback (async) to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    element.setScore(100);
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).not.toBeNull();
    const scoreEl = shadowRoot!.querySelector('.score');
    expect(scoreEl).not.toBeNull();
    expect(scoreEl!.textContent).toBe('Score: 100');
  });

  it('should use CSS variables for styling', async () => {
    const element = document.createElement('score-display') as ScoreDisplay;
    element.style.setProperty('--score-color', 'gold');
    element.style.setProperty('--score-font-size', '32px');
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));
    element.setScore(50);
    const shadowRoot = element.shadowRoot;
    expect(shadowRoot).not.toBeNull();
    const styleEl = shadowRoot!.querySelector('style');
    expect(styleEl).not.toBeNull();
    const cssText = styleEl!.textContent || '';
    expect(cssText).toContain('gold');
    expect(cssText).toContain('32px');
  });
});

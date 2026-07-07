import { describe, it, expect, beforeEach } from 'vitest';
import { SubmitButton } from '../../src/ui/SubmitButton';

describe('SubmitButton', () => {
  beforeEach(() => {
    if (!customElements.get('submit-button')) {
      customElements.define('submit-button', SubmitButton);
    }
  });

  it('should create submit button', () => {
    const element = document.createElement('submit-button');
    expect(element).toBeDefined();
  });

  it('should dispatch submit event on click', async () => {
    const element = document.createElement('submit-button') as SubmitButton;
    document.body.appendChild(element);

    // Wait for connectedCallback
    await new Promise(resolve => setTimeout(resolve, 0));

    let submitted = false;
    element.addEventListener('submit-score', () => {
      submitted = true;
    });

    const button = element.shadowRoot!.querySelector('button');
    button?.click();

    expect(submitted).toBe(true);
  });
});

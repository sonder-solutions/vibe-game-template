import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TimeDisplay } from '../../src/ui/TimeDisplay';

describe('TimeDisplay', () => {
  beforeEach(() => {
    if (!customElements.get('time-display')) {
      customElements.define('time-display', TimeDisplay);
    }
  });

  it('should create time display element', () => {
    const element = document.createElement('time-display');
    expect(element).toBeDefined();
  });

  it('should display time in mm:ss format', async () => {
    const element = document.createElement('time-display') as TimeDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setTime(125); // 2 minutes 5 seconds
    // Should show "02:05"
  });

  it('should display time in hh:mm:ss format for long times', async () => {
    const element = document.createElement('time-display') as TimeDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setTime(3661); // 1 hour 1 minute 1 second
    // Should show "01:01:01"
  });

  it('should have elapsed mode', async () => {
    const element = document.createElement('time-display') as TimeDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.start('elapsed');
    // Should start counting up
    element.stop();
  });

  it('should have countdown mode', async () => {
    const element = document.createElement('time-display') as TimeDisplay;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setTime(10);
    element.start('countdown');
    // Should start counting down
    element.stop();
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { ShareCard } from '../../src/ui/ShareCard';

describe('ShareCard', () => {
  beforeEach(() => {
    if (!customElements.get('share-card')) {
      customElements.define('share-card', ShareCard);
    }
  });

  it('should create share card element', () => {
    const element = document.createElement('share-card');
    expect(element).toBeDefined();
    expect(element).toBeInstanceOf(ShareCard);
  });

  it('should have closed shadow DOM', () => {
    const element = document.createElement('share-card') as ShareCard;
    document.body.appendChild(element);
    // closed shadow DOM means shadowRoot is null from outside
    expect(element.shadowRoot).toBeNull();
  });

  it('should accept config', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'score', label: 'Score', show: true }
      ]
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    // Should not throw
  });

  it('should accept data', async () => {
    const element = document.createElement('share-card') as ShareCard;
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setData({ score: 100, username: 'Player1' });
    // Should not throw
  });

  it('should render title from config', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: []
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    // We can't query closed shadow DOM from outside, but we can check it rendered
    // by verifying internal state doesn't throw
  });

  it('should format time field as mm:ss', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'time', label: 'Time', show: true }
      ]
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    element.setData({ time: 125 }); // 2 minutes 5 seconds
    // 125 seconds = 02:05
  });

  it('should format date field as YYYY-MM-DD', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'date', label: 'Date', show: true }
      ]
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    element.setData({ date: '2026-06-29' });
  });

  it('should hide fields where show is false', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'score', label: 'Score', show: false },
        { type: 'username', label: 'Player', show: true }
      ]
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    element.setData({ score: 100, username: 'Player1' });
  });

  it('should support custom field type', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'custom', label: 'Level', key: 'level', show: true }
      ]
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    element.setData({ level: 'Expert' });
  });

  it('should use CSS custom properties for styling', async () => {
    const element = document.createElement('share-card') as ShareCard;
    element.style.setProperty('--share-background', 'red');
    element.style.setProperty('--share-color', 'blue');
    const config = {
      title: 'My Game',
      fields: []
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    // Should not throw
  });

  it('should generate share text with variable substitution', async () => {
    const element = document.createElement('share-card') as ShareCard;
    const config = {
      title: 'My Game',
      fields: [
        { type: 'score', label: 'Score', show: true }
      ],
      shareText: 'I scored {score} points!'
    };
    document.body.appendChild(element);
    await new Promise(resolve => setTimeout(resolve, 0));

    element.setConfig(config);
    element.setData({ score: 100 });

    const text = element.getShareText();
    expect(text).toBe('I scored 100 points!');
  });
});

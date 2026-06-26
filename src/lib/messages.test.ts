import { describe, it, expect } from 'vitest';
import { buildTriggerMessage } from './messages';

describe('buildTriggerMessage', () => {
  it('builds a trigger message with url and title', () => {
    const message = buildTriggerMessage('https://example.com', 'Example Title');
    expect(message).toEqual({
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: 'https://example.com',
      title: 'Example Title',
    });
  });

  it('preserves empty strings verbatim', () => {
    const message = buildTriggerMessage('', '');
    expect(message).toEqual({
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: '',
      title: '',
    });
  });
});

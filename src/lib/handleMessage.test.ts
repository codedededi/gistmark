import { describe, it, expect, vi } from 'vitest';
import { handleTriggerMessage } from './handleMessage';

describe('handleTriggerMessage', () => {
  it('logs and returns true for a valid trigger message', () => {
    const log = vi.fn();
    const message = {
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: 'https://example.com',
      title: 'Example',
    };
    expect(handleTriggerMessage(message, log)).toBe(true);
    expect(log).toHaveBeenCalledWith(message);
  });

  it('returns false without logging for unrelated message types', () => {
    const log = vi.fn();
    expect(handleTriggerMessage({ type: 'SOMETHING_ELSE' }, log)).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('returns false without logging for malformed payloads', () => {
    const log = vi.fn();
    expect(
      handleTriggerMessage(
        { type: 'GISTMARK_TRIGGER_CLICKED', url: 'x' },
        log,
      ),
    ).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('returns false for non-object messages', () => {
    const log = vi.fn();
    expect(handleTriggerMessage(null, log)).toBe(false);
    expect(handleTriggerMessage(undefined, log)).toBe(false);
    expect(handleTriggerMessage('string', log)).toBe(false);
    expect(handleTriggerMessage(42, log)).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});

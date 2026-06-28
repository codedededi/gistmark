import type { TriggerMessage } from '@/shared/messages';

function isTriggerMessage(value: unknown): value is TriggerMessage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === 'GISTMARK_TRIGGER_CLICKED' &&
    typeof v.url === 'string' &&
    typeof v.title === 'string'
  );
}

export function handleTriggerMessage(
  message: unknown,
  log: (...args: unknown[]) => void,
): boolean {
  if (!isTriggerMessage(message)) return false;
  log(message);
  return true;
}

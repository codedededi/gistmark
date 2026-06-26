export interface TriggerMessage {
  type: 'GISTMARK_TRIGGER_CLICKED';
  url: string;
  title: string;
}

export function buildTriggerMessage(url: string, title: string): TriggerMessage {
  return { type: 'GISTMARK_TRIGGER_CLICKED', url, title };
}

import { handleTriggerMessage } from '@/lib/handleMessage';

export default defineBackground(() => {
  console.log('[GistMark] background ready', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message) => {
    handleTriggerMessage(message, (...args) => console.log('[GistMark]', ...args));
  });
});

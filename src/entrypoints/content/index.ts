import { buildTriggerMessage } from '@/shared/messages';
import { createTriggerButton } from './triggerUi';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: false,
  runAt: 'document_idle',
  main() {
    const triggerButton = createTriggerButton(async () => {
      const message = buildTriggerMessage(location.href, document.title);
      try {
        await browser.runtime.sendMessage(message);
      } catch (error) {
        console.warn('[GistMark] Failed to send trigger message:', error);
      }
    });
    document.documentElement.append(triggerButton);
  },
});

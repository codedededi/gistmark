import { buildTriggerMessage } from '@/lib/messages';
import { createTriggerButton } from '@/lib/triggerUi';

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

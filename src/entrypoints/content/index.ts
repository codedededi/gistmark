import { buildTriggerMessage } from '@/shared/messages';
import { createTriggerButton } from './triggerUi';
import { createSidebar } from './sidebarUi';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: false,
  runAt: 'document_idle',
  main() {
    const sidebar = createSidebar(() => {
      // Reveal the trigger after the sidebar has mostly slid away.
      window.setTimeout(() => triggerHost.classList.remove('gm-hidden'), 220);
    });

    const triggerHost = createTriggerButton(async () => {
      sidebar.open();
      triggerHost.classList.add('gm-hidden');
      const message = buildTriggerMessage(location.href, document.title);
      try {
        await browser.runtime.sendMessage(message);
      } catch (error) {
        console.warn('[GistMark] Failed to send trigger message:', error);
      }
    });

    document.documentElement.append(triggerHost, sidebar.host);
  },
});

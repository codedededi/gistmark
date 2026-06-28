import { buildTriggerMessage } from '@/shared/messages';
import { MOCK_SUMMARY, type SummaryData } from '@/shared/summary';
import { createTriggerButton } from './triggerUi';
import { createSidebar } from './sidebarUi';

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: false,
  runAt: 'document_idle',
  main() {
    const sidebar = createSidebar({
      onClose: () => {
        // Reveal the trigger after the sidebar has mostly slid away.
        window.setTimeout(() => triggerHost.classList.remove('gm-hidden'), 220);
      },
      process: mockProcess,
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

/**
 * Mock processing pipeline: wait 3s, then return canned summary data.
 *
 * Evolution seam — replace the body with a background round-trip to go real:
 *   return browser.runtime.sendMessage(
 *     { type: 'GISTMARK_PROCESS', url: location.href, title: document.title },
 *   ) as Promise<SummaryData>;
 *
 * The sidebar code is unchanged by that swap; `SummaryData` is the contract.
 */
async function mockProcess(): Promise<SummaryData> {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  return MOCK_SUMMARY;
}

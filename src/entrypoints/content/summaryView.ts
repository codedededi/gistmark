/**
 * Summary view renderer. Pure DOM builders that populate the sidebar's main
 * and footer slots when the sidebar transitions into the summary state.
 * Styles for the returned class names live in sidebarUi.ts (shared Shadow DOM
 * stylesheet). Icons are inline SVG (CSP-safe, no external font).
 */
import type { SummaryData } from '@/shared/summary';

const COPY_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="9" y="9" width="13" height="13"></rect>
  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
</svg>`;

const SEND_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="22" y1="2" x2="11" y2="13"></line>
  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
</svg>`;

const CHECK_SVG = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="20 6 9 17 4 12"></polyline>
</svg>`;

/** Render the summary main content: TL;DR block + timestamped chapter outline. */
export function renderSummaryMain(data: SummaryData): HTMLElement {
  const root = document.createElement('div');
  root.className = 'gm-summary';

  const tldr = document.createElement('section');
  tldr.className = 'gm-tldr';
  const tldrLabel = document.createElement('h2');
  tldrLabel.className = 'gm-tldr-label';
  tldrLabel.textContent = '[ TL;DR SUMMARY ]';
  const tldrText = document.createElement('p');
  tldrText.className = 'gm-tldr-text';
  tldrText.textContent = data.tldr;
  tldr.append(tldrLabel, tldrText);

  const chapters = document.createElement('section');
  chapters.className = 'gm-chapters';
  for (const chapter of data.chapters) {
    chapters.append(renderChapter(chapter));
  }

  root.append(tldr, chapters);
  return root;
}

function renderChapter(chapter: SummaryData['chapters'][number]): HTMLElement {
  const article = document.createElement('article');
  article.className = 'gm-chapter';

  const timeCol = document.createElement('div');
  timeCol.className = 'gm-chapter-time';
  const tsBtn = document.createElement('button');
  tsBtn.type = 'button';
  tsBtn.className = 'gm-timestamp';
  tsBtn.textContent = `[${chapter.timestamp}]`;
  timeCol.append(tsBtn);

  const body = document.createElement('div');
  body.className = 'gm-chapter-body';
  const title = document.createElement('h3');
  title.className = 'gm-chapter-title';
  title.textContent = chapter.title;
  const list = document.createElement('ul');
  list.className = 'gm-points';
  for (const point of chapter.points) {
    const li = document.createElement('li');
    li.className = 'gm-point';
    const bullet = document.createElement('span');
    bullet.className = 'gm-point-bullet';
    bullet.textContent = '▪';
    const text = document.createElement('span');
    text.className = 'gm-point-text';
    text.textContent = point;
    li.append(bullet, text);
    list.append(li);
  }
  body.append(title, list);

  article.append(timeCol, body);
  return article;
}

/**
 * Render the sticky footer toolbar. Copy button writes markdown to the
 * clipboard and flashes a 2-second "[COPIED]" success state; Notion button
 * invokes the supplied callback (mock placeholder).
 */
export function renderSummaryFooter(
  data: SummaryData,
  onNotion: () => void = () => console.log('[GistMark] Notion export (mock)'),
): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'gm-summary-footer';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'gm-action gm-action-primary';
  copyBtn.setAttribute('aria-label', 'Copy markdown');
  const copyIcon = document.createElement('span');
  copyIcon.className = 'gm-action-icon';
  copyIcon.innerHTML = COPY_SVG;
  const copyText = document.createElement('span');
  copyText.className = 'gm-action-text';
  copyText.textContent = '[COPY MD]';
  copyBtn.append(copyIcon, copyText);

  const notionBtn = document.createElement('button');
  notionBtn.type = 'button';
  notionBtn.className = 'gm-action gm-action-primary';
  notionBtn.setAttribute('aria-label', 'Send to Notion');
  const notionIcon = document.createElement('span');
  notionIcon.className = 'gm-action-icon';
  notionIcon.innerHTML = SEND_SVG;
  const notionText = document.createElement('span');
  notionText.className = 'gm-action-text';
  notionText.textContent = '[TO NOTION]';
  notionBtn.append(notionIcon, notionText);

  footer.append(copyBtn, notionBtn);

  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  copyBtn.addEventListener('click', async () => {
    const markdown = buildMarkdown(data);
    try {
      await navigator.clipboard.writeText(markdown);
    } catch (error) {
      console.warn('[GistMark] Clipboard write failed:', error);
    }
    copyBtn.classList.add('gm-action-success');
    copyIcon.innerHTML = CHECK_SVG;
    copyText.textContent = '[COPIED]';
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      copyBtn.classList.remove('gm-action-success');
      copyIcon.innerHTML = COPY_SVG;
      copyText.textContent = '[COPY MD]';
      resetTimer = null;
    }, 2000);
  });

  notionBtn.addEventListener('click', () => onNotion());

  return footer;
}

/** Build a markdown representation of the summary for clipboard export. */
export function buildMarkdown(data: SummaryData): string {
  const lines: string[] = [];
  lines.push(`# ${data.title}`);
  lines.push('');
  lines.push(`> [${data.sourceType}] · DURATION: ${data.duration}`);
  lines.push('');
  lines.push('## TL;DR');
  lines.push('');
  lines.push(data.tldr);
  lines.push('');
  for (const chapter of data.chapters) {
    lines.push(`## [${chapter.timestamp}] ${chapter.title}`);
    lines.push('');
    for (const point of chapter.points) {
      lines.push(`- ${point}`);
    }
    lines.push('');
  }
  return lines.join('\n').trimEnd() + '\n';
}

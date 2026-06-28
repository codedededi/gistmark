/**
 * GistMark sidebar — a small state machine that drives the content-script
 * overlay. States: idle → processing → summary → closed.
 *
 * The `process` option is the single evolution seam: it returns a
 * SummaryData promise. Mock callers pass a setTimeout-based delay; real
 * callers pass a background runtime message round-trip. The sidebar code
 * never needs to change for that swap.
 *
 * All markup/styles live inside a Shadow DOM so the host page cannot leak
 * styles in or out. No external fonts: system stacks only, to stay CSP-safe.
 * Processing design: .output/stitch_gistmark_prd/sidebar_processing_light.
 * Summary design: .output/stitch_gistmark_prd/sidebar_summary_light_refined_buttons.
 */
import type { SummaryData } from '@/shared/summary';
import { renderSummaryMain, renderSummaryFooter } from './summaryView';

const TERMINAL_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="4 17 10 11 4 5"></polyline>
  <line x1="12" y1="19" x2="20" y2="19"></line>
</svg>`;

const CLOSE_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>`;

const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }

@keyframes gm-progress {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes gm-spin {
  to { transform: rotate(360deg); }
}
@keyframes gm-pulse {
  50% { opacity: 0.5; }
}

.gm-sidebar-root {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', sans-serif;
  color: #0A0A0A;
}

.gm-overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  background: transparent;
  pointer-events: none;
}
.gm-sidebar-root.gm-open .gm-overlay {
  pointer-events: auto;
}

.gm-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 50;
  width: 400px;
  height: 100vh;
  background: #FFFFFF;
  border-left: 1px solid #E0E0E0;
  display: flex;
  flex-direction: column;
  box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
  transform: translateX(100%);
  transition: transform 300ms cubic-bezier(0.4, 0, 1, 1);
  pointer-events: auto;
  will-change: transform;
}
.gm-sidebar-root.gm-open .gm-sidebar {
  transform: translateX(0);
  transition: transform 440ms cubic-bezier(0.22, 1, 0.36, 1);
}

.gm-progress-track {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  overflow: hidden;
  background: #F5F5F5;
}
.gm-progress-bar {
  width: 50%;
  height: 100%;
  background: #0033FF;
  transform-origin: left;
  animation: gm-progress 1.5s infinite linear;
}

/* ---- Header (shared) ----
   Both variants share the same min-height so the main content starts at the
   same Y position across states — no jump when transitioning. The summary
   variant reserves room for a 2-line title; the processing variant centers
   its single status row within the same height. */
.gm-header {
  flex: none;
  border-bottom: 1px solid #E0E0E0;
  background: #FFFFFF;
  min-height: 113px;
}
.gm-header-processing {
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: #F5F5F5;
}
.gm-header-icon {
  color: #666666;
  margin-right: 12px;
  display: flex;
  align-items: center;
}
.gm-header-title {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.05em;
  color: #0A0A0A;
  text-transform: uppercase;
  margin: 0;
}
.gm-header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.gm-pulse-dot {
  width: 8px;
  height: 8px;
  background: #0033FF;
  animation: gm-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.gm-timer {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  color: #666666;
  text-transform: uppercase;
}

/* ---- Summary header ---- */
.gm-header-summary {
  padding: 16px;
}
.gm-header-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.gm-header-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #666666;
}
.gm-source-badge {
  padding: 1px 4px;
  border: 1px solid #E0E0E0;
  background: #F5F5F5;
  color: #0A0A0A;
}
.gm-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  color: #666666;
  cursor: pointer;
  transition: color 150ms ease;
  padding: 0;
}
.gm-close-btn:hover { color: #0A0A0A; }
.gm-close-btn:focus-visible {
  outline: 2px solid #0A0A0A;
  outline-offset: 2px;
}
.gm-summary-title {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 18px;
  line-height: 1.25;
  text-transform: uppercase;
  color: #0A0A0A;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ---- Main + stage ---- */
.gm-main {
  flex: 1 1 auto;
  background: #FFFFFF;
  overflow: hidden;
  position: relative;
}
.gm-stage {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  scrollbar-width: none;
  transition: opacity 180ms ease;
}
.gm-stage::-webkit-scrollbar { display: none; }
.gm-stage.gm-leaving { opacity: 0; }

/* ---- Processing view ---- */
.gm-processing {
  min-height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 16px;
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 200ms ease-in, transform 200ms ease-in;
}
.gm-sidebar-root.gm-open .gm-processing {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 420ms ease-out 120ms, transform 440ms cubic-bezier(0.22, 1, 0.36, 1) 120ms;
}
.gm-spinner {
  position: relative;
  width: 48px;
  height: 48px;
}
.gm-spinner-ring {
  position: absolute;
  inset: 0;
  border: 2px solid #E0E0E0;
  opacity: 0.5;
}
.gm-spinner-spin {
  position: absolute;
  inset: 0;
  border: 2px solid #0033FF;
  border-top-color: transparent;
  animation: gm-spin 1s linear infinite;
}
.gm-processing-labels {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.gm-processing-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
.gm-processing-percent {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #0A0A0A;
  font-weight: 700;
  animation: gm-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.gm-abort-button {
  padding: 8px 24px;
  background: #0033FF;
  border: none;
  border-radius: 0;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #FFFFFF;
  transition: background 150ms ease;
  cursor: pointer;
  outline: none;
}
.gm-abort-button:hover { background: #0029CC; }
.gm-abort-button:focus-visible {
  outline: 2px solid #0A0A0A;
  outline-offset: 2px;
}

/* ---- Summary view ---- */
.gm-summary {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.gm-tldr {
  background: #F5F5F5;
  padding: 16px;
  border-left: 2px solid #0033FF;
}
.gm-tldr-label {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #0033FF;
  text-transform: uppercase;
  margin: 0 0 8px;
  letter-spacing: 0.05em;
}
.gm-tldr-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #0A0A0A;
  margin: 0;
}
.gm-chapters {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
.gm-chapter {
  display: flex;
  gap: 12px;
}
.gm-chapter-time {
  width: 64px;
  flex: none;
}
.gm-timestamp {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #0033FF;
  background: #F5F5F5;
  border: 1px solid #E0E0E0;
  padding: 2px 6px;
  cursor: pointer;
  transition: background 150ms ease, color 150ms ease;
}
.gm-timestamp:hover {
  background: #0033FF;
  color: #FFFFFF;
}
.gm-chapter-body {
  flex: 1;
  border-left: 1px solid #E0E0E0;
  padding-left: 12px;
  padding-bottom: 4px;
}
.gm-chapter-title {
  font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 600;
  font-size: 15px;
  text-transform: uppercase;
  color: #0A0A0A;
  margin: 0 0 8px;
  line-height: 1.3;
}
.gm-points {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.gm-point {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.gm-point-bullet {
  color: #666666;
  font-size: 10px;
  line-height: 1.6;
  flex: none;
}
.gm-point-text {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'IBM Plex Sans', sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #0A0A0A;
}

/* ---- Footer toolbar ---- */
.gm-footer {
  flex: none;
  background: #FFFFFF;
  border-top: 1px solid #E0E0E0;
}
.gm-footer:empty { display: none; }
.gm-summary-footer {
  display: flex;
  gap: 12px;
  padding: 16px;
}
.gm-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: #0033FF;
  border: 1px solid #0033FF;
  color: #FFFFFF;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 10px;
  cursor: pointer;
  transition: background 150ms ease, border-color 150ms ease, color 150ms ease;
}
.gm-action:hover {
  background: #000000;
  border-color: #000000;
}
.gm-action:focus-visible {
  outline: 2px solid #0A0A0A;
  outline-offset: 2px;
}
.gm-action-success {
  background: #00CC52 !important;
  border-color: #00CC52 !important;
  color: #FFFFFF !important;
}
.gm-action-icon {
  display: flex;
  align-items: center;
}

@media (prefers-reduced-motion: reduce) {
  .gm-progress-bar,
  .gm-spinner-spin,
  .gm-pulse-dot,
  .gm-processing-percent {
    animation: none;
  }
  .gm-sidebar,
  .gm-processing,
  .gm-stage {
    transition: none;
  }
  .gm-sidebar-root.gm-open .gm-processing {
    opacity: 1;
    transform: none;
  }
  .gm-stage.gm-leaving { opacity: 1; }
}
`;

export interface SidebarOptions {
  onClose: () => void;
  /** Produces the summary data. Mock: setTimeout delay; real: background round-trip. */
  process: () => Promise<SummaryData>;
}

export interface SidebarController {
  host: HTMLElement;
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createSidebar(options: SidebarOptions): SidebarController {
  const { onClose, process } = options;

  const host = document.createElement('div');
  host.id = 'gistmark-sidebar-host';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;

  const root = document.createElement('div');
  root.className = 'gm-sidebar-root';
  root.setAttribute('aria-hidden', 'true');

  const overlay = document.createElement('div');
  overlay.className = 'gm-overlay';

  const sidebar = document.createElement('aside');
  sidebar.className = 'gm-sidebar';
  sidebar.setAttribute('role', 'dialog');
  sidebar.setAttribute('aria-label', 'GistMark');

  const progressTrack = document.createElement('div');
  progressTrack.className = 'gm-progress-track';
  const progressBar = document.createElement('div');
  progressBar.className = 'gm-progress-bar';
  progressTrack.append(progressBar);

  const headerSlot = document.createElement('div');
  headerSlot.className = 'gm-header-slot';

  const main = document.createElement('main');
  main.className = 'gm-main';
  const stage = document.createElement('div');
  stage.className = 'gm-stage';
  main.append(stage);

  const footerSlot = document.createElement('div');
  footerSlot.className = 'gm-footer';

  sidebar.append(progressTrack, headerSlot, main, footerSlot);
  root.append(overlay, sidebar);
  shadow.append(style, root);

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;
  let open = false;
  let state: 'idle' | 'processing' | 'summary' = 'idle';
  let generation = 0;

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimer(timerEl: HTMLElement) {
    stopTimer();
    elapsed = 0;
    timerEl.textContent = formatElapsed(0);
    timerInterval = setInterval(() => {
      elapsed += 1;
      timerEl.textContent = formatElapsed(elapsed);
    }, 1000);
  }

  function buildProcessingHeader(): HTMLElement {
    const header = document.createElement('header');
    header.className = 'gm-header gm-header-processing';
    const iconWrap = document.createElement('span');
    iconWrap.className = 'gm-header-icon';
    iconWrap.innerHTML = TERMINAL_SVG;
    const title = document.createElement('h2');
    title.className = 'gm-header-title';
    title.textContent = 'Status: Parsing';
    const headerRight = document.createElement('div');
    headerRight.className = 'gm-header-right';
    const dot = document.createElement('div');
    dot.className = 'gm-pulse-dot';
    const timer = document.createElement('span');
    timer.className = 'gm-timer';
    timer.textContent = '00:00:00';
    headerRight.append(dot, timer);
    header.append(iconWrap, title, headerRight);
    startTimer(timer);
    return header;
  }

  function buildProcessingMain(): HTMLElement {
    const processing = document.createElement('div');
    processing.className = 'gm-processing';
    const spinner = document.createElement('div');
    spinner.className = 'gm-spinner';
    const ring = document.createElement('div');
    ring.className = 'gm-spinner-ring';
    const spin = document.createElement('div');
    spin.className = 'gm-spinner-spin';
    spinner.append(ring, spin);
    const labels = document.createElement('div');
    labels.className = 'gm-processing-labels';
    const label = document.createElement('span');
    label.className = 'gm-processing-label';
    label.textContent = 'Processing Data';
    const percent = document.createElement('span');
    percent.className = 'gm-processing-percent';
    percent.textContent = '78.4%';
    labels.append(label, percent);
    const abortButton = document.createElement('button');
    abortButton.type = 'button';
    abortButton.className = 'gm-abort-button';
    abortButton.textContent = '[Abort]';
    abortButton.addEventListener('click', () => doClose());
    processing.append(spinner, labels, abortButton);
    return processing;
  }

  function buildSummaryHeader(data: SummaryData): HTMLElement {
    const header = document.createElement('header');
    header.className = 'gm-header gm-header-summary';
    const meta = document.createElement('div');
    meta.className = 'gm-header-meta';
    const badges = document.createElement('div');
    badges.className = 'gm-header-badges';
    const badge = document.createElement('span');
    badge.className = 'gm-source-badge';
    badge.textContent = `[${data.sourceType}]`;
    const duration = document.createElement('span');
    duration.textContent = `DURATION: ${data.duration}`;
    badges.append(badge, duration);
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'gm-close-btn';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = CLOSE_SVG;
    closeBtn.addEventListener('click', () => doClose());
    meta.append(badges, closeBtn);
    const title = document.createElement('h1');
    title.className = 'gm-summary-title';
    title.textContent = data.title;
    header.append(meta, title);
    return header;
  }

  function showProcessing() {
    state = 'processing';
    progressTrack.style.display = '';
    footerSlot.replaceChildren();
    headerSlot.replaceChildren(buildProcessingHeader());
    stage.replaceChildren(buildProcessingMain());
  }

  async function showSummary(data: SummaryData) {
    state = 'summary';
    stopTimer();
    progressTrack.style.display = 'none';

    const summaryEl = renderSummaryMain(data);
    if (prefersReducedMotion()) {
      headerSlot.replaceChildren(buildSummaryHeader(data));
      stage.replaceChildren(summaryEl);
    } else {
      stage.classList.add('gm-leaving');
      await new Promise((r) => setTimeout(r, 180));
      if (state !== 'summary') return; // closed mid-transition
      headerSlot.replaceChildren(buildSummaryHeader(data));
      stage.replaceChildren(summaryEl);
      stage.classList.remove('gm-leaving');
    }

    footerSlot.replaceChildren(renderSummaryFooter(data));
  }

  function doOpen() {
    if (open) return;
    open = true;
    generation++;
    const myGen = generation;
    root.classList.add('gm-open');
    root.setAttribute('aria-hidden', 'false');
    showProcessing();
    process()
      .then((data) => {
        if (myGen === generation && state === 'processing') {
          void showSummary(data);
        }
      })
      .catch((error) => {
        console.warn('[GistMark] process failed:', error);
      });
  }

  function doClose() {
    if (!open) return;
    open = false;
    generation++;
    root.classList.remove('gm-open');
    root.setAttribute('aria-hidden', 'true');
    stopTimer();
    state = 'idle';
    onClose();
  }

  overlay.addEventListener('click', () => doClose());

  return {
    host,
    open: doOpen,
    close: doClose,
    isOpen: () => open,
  };
}

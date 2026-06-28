/**
 * Processing sidebar UI. Renders an overlay + right-hand sidebar that slides in
 * when opened. All markup/styles live inside a Shadow DOM so the host page
 * cannot leak styles in or out. No external fonts: system stacks only, to stay
 * CSP-safe. Design source: .output/stitch_gistmark_prd/sidebar_processing_light.
 */

const TERMINAL_SVG = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <polyline points="4 17 10 11 4 5"></polyline>
  <line x1="12" y1="19" x2="20" y2="19"></line>
</svg>
`;

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

.gm-header {
  height: 48px;
  flex: none;
  border-bottom: 1px solid #E0E0E0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  margin-top: 2px;
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

.gm-main {
  flex: 1 1 auto;
  padding: 16px;
  background: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}
.gm-processing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  width: 100%;
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
.gm-abort-button:hover {
  background: #0029CC;
}
.gm-abort-button:focus-visible {
  outline: 2px solid #0A0A0A;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .gm-progress-bar,
  .gm-spinner-spin,
  .gm-pulse-dot,
  .gm-processing-percent {
    animation: none;
  }
  .gm-sidebar,
  .gm-processing {
    transition: none;
  }
  .gm-sidebar-root.gm-open .gm-processing {
    opacity: 1;
    transform: none;
  }
}
`;

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

export function createSidebar(onClose: () => void): SidebarController {
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
  sidebar.setAttribute('aria-label', 'GistMark processing status');

  // Indeterminate progress bar
  const progressTrack = document.createElement('div');
  progressTrack.className = 'gm-progress-track';
  const progressBar = document.createElement('div');
  progressBar.className = 'gm-progress-bar';
  progressTrack.append(progressBar);

  // Header
  const header = document.createElement('header');
  header.className = 'gm-header';
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

  // Main: processing spinner
  const main = document.createElement('main');
  main.className = 'gm-main';
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

  processing.append(spinner, labels, abortButton);
  main.append(processing);

  sidebar.append(progressTrack, header, main);
  root.append(overlay, sidebar);
  shadow.append(style, root);

  let timerInterval: ReturnType<typeof setInterval> | null = null;
  let elapsed = 0;
  let open = false;

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function startTimer() {
    stopTimer();
    elapsed = 0;
    timer.textContent = formatElapsed(0);
    timerInterval = setInterval(() => {
      elapsed += 1;
      timer.textContent = formatElapsed(elapsed);
    }, 1000);
  }

  function doOpen() {
    if (open) return;
    open = true;
    root.classList.add('gm-open');
    root.setAttribute('aria-hidden', 'false');
    startTimer();
  }

  function doClose() {
    if (!open) return;
    open = false;
    root.classList.remove('gm-open');
    root.setAttribute('aria-hidden', 'true');
    stopTimer();
  }

  overlay.addEventListener('click', () => {
    doClose();
    onClose();
  });

  abortButton.addEventListener('click', () => {
    doClose();
    onClose();
  });

  return {
    host,
    open: doOpen,
    close: doClose,
    isOpen: () => open,
  };
}

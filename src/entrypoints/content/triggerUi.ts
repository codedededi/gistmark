const LOGO_URL = browser.runtime.getURL('/icon/96.png');

const STYLES = `
:host { all: initial; }
.gm-container {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 9999;
}
.gm-trigger {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translate(50%, -50%);
  transition: transform 300ms ease-in-out, opacity 160ms ease;
  display: flex;
  align-items: center;
  padding-right: 16px;
  pointer-events: auto;
}
:host(.gm-hidden) .gm-trigger {
  opacity: 0;
  pointer-events: none;
}
.gm-trigger:hover {
  transform: translate(0, -50%);
}
.gm-connector {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 40px;
  background: rgb(240, 239, 237);
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
}
.gm-button {
  position: relative;
  z-index: 1;
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: #FFFFFF;
  border: none;
  opacity: 0.5;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 200ms ease, box-shadow 200ms ease;
  outline: none;
  padding: 0;
}
.gm-button img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  border-radius: 50%;
  pointer-events: none;
}
.gm-trigger:hover .gm-connector {
  opacity: 1;
}
.gm-button:hover,
.gm-trigger:hover .gm-button {
  opacity: 1;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
}
.gm-button:focus-visible {
  box-shadow: 0 0 0 2px #8B5CF6;
}
.gm-tooltip {
  position: absolute;
  z-index: 2;
  right: calc(100% + 12px);
  background: #FFFFFF;
  border: 1px solid #E0E0E0;
  padding: 6px 12px;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.gm-trigger:hover .gm-tooltip {
  opacity: 1;
}
.gm-tooltip-kbd {
  color: #666666;
  margin-right: 8px;
}
.gm-tooltip-text {
  color: #0A0A0A;
}
`;

export function createTriggerButton(onClick: () => void): HTMLElement {
  const host = document.createElement('div');
  host.id = 'gistmark-trigger-host';
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;

  const container = document.createElement('div');
  container.className = 'gm-container';

  const trigger = document.createElement('div');
  trigger.className = 'gm-trigger';

  const tooltip = document.createElement('div');
  tooltip.className = 'gm-tooltip';
  const kbd = document.createElement('span');
  kbd.className = 'gm-tooltip-kbd';
  kbd.textContent = '[CMD+SHIFT+G]';
  const text = document.createElement('span');
  text.className = 'gm-tooltip-text';
  text.textContent = 'EXTRACT';
  tooltip.append(kbd, text);

  const connector = document.createElement('div');
  connector.className = 'gm-connector';

  const button = document.createElement('button');
  button.className = 'gm-button';
  button.setAttribute('aria-label', 'Extract Gist');
  const icon = document.createElement('img');
  icon.src = LOGO_URL;
  icon.alt = '';
  button.append(icon);

  trigger.append(connector, button, tooltip);
  container.append(trigger);
  shadow.append(style, container);

  button.addEventListener('click', onClick);

  return host;
}

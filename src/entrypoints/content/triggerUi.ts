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
  transition: transform 300ms ease-in-out;
  display: flex;
  align-items: center;
  padding-right: 16px;
  pointer-events: auto;
}
.gm-trigger:hover {
  transform: translate(0, -50%);
}
.gm-button {
  width: 40px;
  height: 40px;
  border-radius: 9999px;
  background: #000000;
  color: #ffffff;
  border: 1px solid #E0E0E0;
  opacity: 0.4;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 200ms ease, border-color 200ms ease, box-shadow 200ms ease;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: -1px;
  outline: none;
}
.gm-button:hover,
.gm-trigger:hover .gm-button {
  opacity: 1;
  border-color: #0033FF;
}
.gm-button:focus-visible {
  box-shadow: 0 0 0 1px #0033FF;
}
.gm-tooltip {
  position: absolute;
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

  const button = document.createElement('button');
  button.className = 'gm-button';
  button.setAttribute('aria-label', 'Extract Gist');
  button.textContent = '</>';

  trigger.append(tooltip, button);
  container.append(trigger);
  shadow.append(style, container);

  button.addEventListener('click', onClick);

  return host;
}

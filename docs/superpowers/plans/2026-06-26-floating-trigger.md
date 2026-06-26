# Floating Trigger Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject a half-hidden circular `</>` floating button on all web pages that sends a `GISTMARK_TRIGGER_CLICKED` message to the background script on click.

**Architecture:** A content script injects an isolated Shadow DOM root containing the button. Pure logic (message construction, message handling) is extracted into `lib/` modules and unit-tested with Vitest. WXT entrypoint files stay thin — they wire the pure logic to `browser.runtime` APIs. No React, no external fonts, no host-page style leakage.

**Tech Stack:** WXT, TypeScript, Vitest, webextension-polyfill (`browser.*` provided by WXT)

---

## File Structure

- `lib/messages.ts` — `TriggerMessage` type + `buildTriggerMessage` (pure)
- `lib/messages.test.ts` — tests for message builder
- `lib/handleMessage.ts` — `handleTriggerMessage` (pure, injectable logger)
- `lib/handleMessage.test.ts` — tests for handler
- `lib/triggerUi.ts` — `createTriggerUi(onClick)` builds Shadow DOM host element (no unit test; verified manually)
- `entrypoints/content.ts` — wires UI + message builder to content script lifecycle
- `entrypoints/background.ts` — wires `onMessage` listener to `handleTriggerMessage`
- `vitest.config.ts` — test config
- `package.json` — add `test` scripts + vitest devDependency

---

## Task 1: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `lib/sanity.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Install vitest**

Run: `npm i -D vitest`
Expected: vitest added to devDependencies, package-lock.json updated.

- [ ] **Step 2: Create vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add test scripts to package.json**

Modify `package.json` `scripts` to add two entries (keep existing scripts unchanged):

```json
"test": "vitest run",
"test:watch": "vitest"
```

The full `scripts` block should read:

```json
"scripts": {
  "dev": "wxt",
  "dev:firefox": "wxt -b firefox",
  "build": "wxt build",
  "build:firefox": "wxt build -b firefox",
  "zip": "wxt zip",
  "zip:firefox": "wxt zip -b firefox",
  "compile": "tsc --noEmit",
  "postinstall": "wxt prepare",
  "test": "vitest run",
  "test:watch": "vitest"
},
```

- [ ] **Step 4: Write a sanity test**

Create `lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run the sanity test**

Run: `npm test`
Expected: 1 test passed in `lib/sanity.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/sanity.test.ts
git commit -m "test: add vitest setup"
```

---

## Task 2: Message Contract (TDD)

**Files:**
- Create: `lib/messages.ts`
- Create: `lib/messages.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/messages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildTriggerMessage } from './messages';

describe('buildTriggerMessage', () => {
  it('builds a trigger message with url and title', () => {
    const message = buildTriggerMessage('https://example.com', 'Example Title');
    expect(message).toEqual({
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: 'https://example.com',
      title: 'Example Title',
    });
  });

  it('preserves empty strings verbatim', () => {
    const message = buildTriggerMessage('', '');
    expect(message).toEqual({
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: '',
      title: '',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './messages'` or similar resolution error.

- [ ] **Step 3: Write minimal implementation**

Create `lib/messages.ts`:

```ts
export interface TriggerMessage {
  type: 'GISTMARK_TRIGGER_CLICKED';
  url: string;
  title: string;
}

export function buildTriggerMessage(url: string, title: string): TriggerMessage {
  return { type: 'GISTMARK_TRIGGER_CLICKED', url, title };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: 3 tests passed (sanity + 2 message tests).

- [ ] **Step 5: Commit**

```bash
git add lib/messages.ts lib/messages.test.ts
git commit -m "feat: add trigger message contract"
```

---

## Task 3: Background Message Handler (TDD)

**Files:**
- Create: `lib/handleMessage.ts`
- Create: `lib/handleMessage.test.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/handleMessage.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { handleTriggerMessage } from './handleMessage';

describe('handleTriggerMessage', () => {
  it('logs and returns true for a valid trigger message', () => {
    const log = vi.fn();
    const message = {
      type: 'GISTMARK_TRIGGER_CLICKED',
      url: 'https://example.com',
      title: 'Example',
    };
    expect(handleTriggerMessage(message, log)).toBe(true);
    expect(log).toHaveBeenCalledWith(message);
  });

  it('returns false without logging for unrelated message types', () => {
    const log = vi.fn();
    expect(handleTriggerMessage({ type: 'SOMETHING_ELSE' }, log)).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('returns false without logging for malformed payloads', () => {
    const log = vi.fn();
    expect(
      handleTriggerMessage(
        { type: 'GISTMARK_TRIGGER_CLICKED', url: 'x' },
        log,
      ),
    ).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it('returns false for non-object messages', () => {
    const log = vi.fn();
    expect(handleTriggerMessage(null, log)).toBe(false);
    expect(handleTriggerMessage(undefined, log)).toBe(false);
    expect(handleTriggerMessage('string', log)).toBe(false);
    expect(handleTriggerMessage(42, log)).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './handleMessage'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/handleMessage.ts`:

```ts
import type { TriggerMessage } from './messages';

function isTriggerMessage(value: unknown): value is TriggerMessage {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.type === 'GISTMARK_TRIGGER_CLICKED' &&
    typeof v.url === 'string' &&
    typeof v.title === 'string'
  );
}

export function handleTriggerMessage(
  message: unknown,
  log: (...args: unknown[]) => void,
): boolean {
  if (!isTriggerMessage(message)) return false;
  log(message);
  return true;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: all tests passed (sanity + 2 message + 4 handler tests).

- [ ] **Step 5: Commit**

```bash
git add lib/handleMessage.ts lib/handleMessage.test.ts
git commit -m "feat: add background trigger message handler"
```

---

## Task 4: Wire Background Script

**Files:**
- Modify: `entrypoints/background.ts`

- [ ] **Step 1: Replace background.ts contents**

Overwrite `entrypoints/background.ts` with:

```ts
import { handleTriggerMessage } from '@/lib/handleMessage';

export default defineBackground(() => {
  console.log('[GistMark] background ready', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message) => {
    handleTriggerMessage(message, (...args) => console.log('[GistMark]', ...args));
  });
});
```

- [ ] **Step 2: Run type check**

Run: `npm run compile`
Expected: no errors. (WXT provides `defineBackground` and `browser` globals via `.wxt/wxt.d.ts`.)

- [ ] **Step 3: Commit**

```bash
git add entrypoints/background.ts
git commit -m "feat: wire background onMessage listener"
```

---

## Task 5: Trigger UI (Shadow DOM)

**Files:**
- Create: `lib/triggerUi.ts`

This module builds the Shadow DOM host element. No unit test — the rendering is verified manually in Task 7. The function takes an `onClick` callback (dependency-injected) so the click side-effect is isolated from DOM construction.

- [ ] **Step 1: Create the UI builder**

Create `lib/triggerUi.ts`:

```ts
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

export function createTriggerUi(onClick: () => void): HTMLElement {
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
```

- [ ] **Step 2: Run type check**

Run: `npm run compile`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/triggerUi.ts
git commit -m "feat: add shadow DOM trigger UI builder"
```

---

## Task 6: Wire Content Script

**Files:**
- Modify: `entrypoints/content.ts`

- [ ] **Step 1: Replace content.ts contents**

Overwrite `entrypoints/content.ts` with:

```ts
import { buildTriggerMessage } from '@/lib/messages';
import { createTriggerUi } from '@/lib/triggerUi';

export default defineContentScript({
  matches: ['<all_urls>'],
  all_frames: false,
  run_at: 'document_idle',
  main() {
    const ui = createTriggerUi(async () => {
      const message = buildTriggerMessage(location.href, document.title);
      try {
        await browser.runtime.sendMessage(message);
      } catch (error) {
        console.warn('[GistMark] Failed to send trigger message:', error);
      }
    });
    document.documentElement.append(ui);
  },
});
```

- [ ] **Step 2: Run type check**

Run: `npm run compile`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add entrypoints/content.ts
git commit -m "feat: wire content script to inject trigger UI"
```

---

## Task 7: End-to-End Manual Verification

**Files:** none (verification only)

- [ ] **Step 1: Run full test suite + type check**

Run: `npm test && npm run compile`
Expected: all tests pass; tsc exits 0.

- [ ] **Step 2: Start the dev build**

Run: `npm run dev`
Expected: WXT launches a Chrome window with the extension loaded. Watch the terminal for background logs.

- [ ] **Step 3: Verify the trigger renders**

In the WXT-launched Chrome, navigate to `https://example.com`.
Expected: a small dark circle is visible at the right edge of the viewport, vertically centered, partially off-screen.

- [ ] **Step 4: Verify hover behavior**

Hover over the right edge near the trigger.
Expected: the button slides fully into view, opacity increases to fully visible, border turns blue, and the `[CMD+SHIFT+G] EXTRACT` tooltip fades in to the left.

- [ ] **Step 5: Verify click → background log**

Click the trigger.
Expected: the WXT dev terminal prints `[GistMark] { type: 'GISTMARK_TRIGGER_CLICKED', url: 'https://example.com/', title: 'Example Domain' }`.

- [ ] **Step 6: Verify style isolation**

Open DevTools on the page, inspect the page's root elements.
Expected: a single `div#gistmark-trigger-host` is appended to `<html>`. Its shadow root contains all trigger styles. The host page's own styles are unaffected (no leaked CSS rules, no shifted layout).

- [ ] **Step 7: Stop dev server**

Stop the `npm run dev` process (Ctrl+C in its terminal).

- [ ] **Step 8: Final commit (if any verification artifacts)**

No code changes in this task — skip commit unless the verification surfaced a fix.

---

## Self-Review Notes

- **Spec coverage**: Trigger renders on all pages (Task 6 `matches: ['<all_urls>']`); Shadow DOM isolation (Task 5 `attachShadow`); click sends `GISTMARK_TRIGGER_CLICKED` (Task 6); background logs (Task 4); visual spec translated faithfully (Task 5 STYLES — black bg, 40×40, opacity 0.4→1, border #E0E0E0→#0033FF, tooltip with `[CMD+SHIFT+G]` + `EXTRACT`, system mono font, 300ms slide, 200ms opacity/tooltip).
- **Out of scope honored**: no keyboard shortcut wiring; no extraction logic; no popup/panel; no dark mode; no positioning/drag.
- **Type consistency**: `TriggerMessage` defined in Task 2, imported in Task 3 (`handleMessage.ts`) and Task 6 (`content.ts` via `buildTriggerMessage`). `handleTriggerMessage(message, log)` signature consistent across Task 3 test, Task 3 impl, and Task 4 wiring. `createTriggerUi(onClick)` consistent across Task 5 and Task 6.
- **No placeholders**: every code step contains complete code.

# 悬浮触发按钮实现计划

> **给 agentic worker：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 按任务逐条实现。步骤使用 checkbox（`- [ ]`）语法跟踪进度。

**目标：** 在所有网页注入一个半隐藏的圆形 `</>` 悬浮按钮，点击后向 background script 发送 `GISTMARK_TRIGGER_CLICKED` 消息。

**架构：** content script 注入一个隔离的 Shadow DOM 根节点，内含按钮。纯逻辑（消息构造、消息处理）抽离到 `lib/` 模块并用 Vitest 单测。WXT 入口文件保持纤薄——仅把纯逻辑接到 `browser.runtime` API。不使用 React，不加载外部字体，不影响宿主页面样式。

**技术栈：** WXT、TypeScript、Vitest、webextension-polyfill（`browser.*` 由 WXT 提供）

---

## 文件结构

- `lib/messages.ts` — `TriggerMessage` 类型 + `buildTriggerMessage`（纯函数）
- `lib/messages.test.ts` — 消息构建器测试
- `lib/handleMessage.ts` — `handleTriggerMessage`（纯函数，logger 可注入）
- `lib/handleMessage.test.ts` — 处理器测试
- `lib/triggerUi.ts` — `createTriggerButton(onClick)` 构建 Shadow DOM 宿主元素（无单测；Task 7 手动验证）
- `entrypoints/content.ts` — 把 UI + 消息构建器接到 content script 生命周期
- `entrypoints/background.ts` — 把 `onMessage` 监听器接到 `handleTriggerMessage`
- `vitest.config.ts` — 测试配置
- `package.json` — 新增 `test` 脚本 + vitest devDependency

---

## Task 1: Vitest 配置

**文件：**
- 新建：`vitest.config.ts`
- 新建：`lib/sanity.test.ts`
- 修改：`package.json`

- [ ] **Step 1: 安装 vitest**

运行：`npm i -D vitest`
预期：vitest 加入 devDependencies，package-lock.json 更新。

- [ ] **Step 2: 创建 vitest 配置**

新建 `vitest.config.ts`：

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: 在 package.json 添加测试脚本**

修改 `package.json` 的 `scripts`，新增两条（保留既有脚本不变）：

```json
"test": "vitest run",
"test:watch": "vitest"
```

完整的 `scripts` 块应如下：

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

- [ ] **Step 4: 写一个 sanity 测试**

新建 `lib/sanity.test.ts`：

```ts
import { describe, it, expect } from 'vitest';

describe('vitest sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: 运行 sanity 测试**

运行：`npm test`
预期：`lib/sanity.test.ts` 中 1 个测试通过。

- [ ] **Step 6: 提交**

```bash
git add package.json package-lock.json vitest.config.ts lib/sanity.test.ts
git commit -m "test: add vitest setup"
```

---

## Task 2: 消息契约（TDD）

**文件：**
- 新建：`lib/messages.ts`
- 新建：`lib/messages.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `lib/messages.test.ts`：

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

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test`
预期：FAIL — `Cannot find module './messages'` 或类似解析错误。

- [ ] **Step 3: 写最小实现**

新建 `lib/messages.ts`：

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

- [ ] **Step 4: 运行测试确认通过**

运行：`npm test`
预期：3 个测试通过（sanity + 2 个消息测试）。

- [ ] **Step 5: 提交**

```bash
git add lib/messages.ts lib/messages.test.ts
git commit -m "feat: add trigger message contract"
```

---

## Task 3: 后台消息处理器（TDD）

**文件：**
- 新建：`lib/handleMessage.ts`
- 新建：`lib/handleMessage.test.ts`

- [ ] **Step 1: 写失败测试**

新建 `lib/handleMessage.test.ts`：

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

- [ ] **Step 2: 运行测试确认失败**

运行：`npm test`
预期：FAIL — `Cannot find module './handleMessage'`。

- [ ] **Step 3: 写最小实现**

新建 `lib/handleMessage.ts`：

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

- [ ] **Step 4: 运行测试确认通过**

运行：`npm test`
预期：全部测试通过（sanity + 2 个消息测试 + 4 个处理器测试）。

- [ ] **Step 5: 提交**

```bash
git add lib/handleMessage.ts lib/handleMessage.test.ts
git commit -m "feat: add background trigger message handler"
```

---

## Task 4: 接线后台脚本

**文件：**
- 修改：`entrypoints/background.ts`

- [ ] **Step 1: 替换 background.ts 内容**

用以下内容覆盖 `entrypoints/background.ts`：

```ts
import { handleTriggerMessage } from '@/lib/handleMessage';

export default defineBackground(() => {
  console.log('[GistMark] background ready', { id: browser.runtime.id });

  browser.runtime.onMessage.addListener((message) => {
    handleTriggerMessage(message, (...args) => console.log('[GistMark]', ...args));
  });
});
```

- [ ] **Step 2: 运行类型检查**

运行：`npm run compile`
预期：无错误。（WXT 通过 `.wxt/wxt.d.ts` 提供 `defineBackground` 和 `browser` 全局。）

- [ ] **Step 3: 提交**

```bash
git add entrypoints/background.ts
git commit -m "feat: wire background onMessage listener"
```

---

## Task 5: 触发器 UI（Shadow DOM）

**文件：**
- 新建：`lib/triggerUi.ts`

本模块构建 Shadow DOM 宿主元素。无单测——渲染在 Task 7 手动验证。函数接收 `onClick` 回调（依赖注入），把点击副作用与 DOM 构造解耦。

- [ ] **Step 1: 创建 UI 构建器**

新建 `lib/triggerUi.ts`：

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
```

- [ ] **Step 2: 运行类型检查**

运行：`npm run compile`
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add lib/triggerUi.ts
git commit -m "feat: add shadow DOM trigger UI builder"
```

---

## Task 6: 接线 content script

**文件：**
- 修改：`entrypoints/content.ts`

- [ ] **Step 1: 替换 content.ts 内容**

用以下内容覆盖 `entrypoints/content.ts`：

```ts
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
```

- [ ] **Step 2: 运行类型检查**

运行：`npm run compile`
预期：无错误。

- [ ] **Step 3: 提交**

```bash
git add entrypoints/content.ts
git commit -m "feat: wire content script to inject trigger UI"
```

---

## Task 7: 端到端手动验证

**文件：** 无（仅验证）

- [ ] **Step 1: 运行完整测试套件 + 类型检查**

运行：`npm test && npm run compile`
预期：全部测试通过；tsc 退出码 0。

- [ ] **Step 2: 启动 dev 构建**

运行：`npm run dev`
预期：WXT 启动一个加载了扩展的 Chrome 窗口。在终端观察 background 日志。

- [ ] **Step 3: 验证触发器渲染**

在 WXT 启动的 Chrome 中，访问 `https://example.com`。
预期：视口右边缘垂直居中位置可见一个深色小圆，部分在屏外。

- [ ] **Step 4: 验证悬停行为**

把鼠标移到右侧边缘触发器附近。
预期：按钮完全滑入，不透明度升到满，边框变蓝，`[CMD+SHIFT+G] EXTRACT` 工具提示在左侧淡入。

- [ ] **Step 5: 验证点击 → background 日志**

点击触发器。
预期：WXT dev 终端打印 `[GistMark] { type: 'GISTMARK_TRIGGER_CLICKED', url: 'https://example.com/', title: 'Example Domain' }`。

- [ ] **Step 6: 验证样式隔离**

在页面上打开 DevTools，检查页面根元素。
预期：`<html>` 上追加了一个 `div#gistmark-trigger-host`。其 shadow root 包含全部触发器样式。宿主页面自身样式未受影响（无 CSS 规则泄漏，无布局位移）。

- [ ] **Step 7: 停止 dev 服务器**

停止 `npm run dev` 进程（在其终端按 Ctrl+C）。

- [ ] **Step 8: 最终提交（如有验证产物）**

本任务无代码改动——除非验证中发现需要修复的问题，否则跳过提交。

---

## 自检备注

- **规格覆盖**：触发器在所有页面渲染（Task 6 `matches: ['<all_urls>']`）；Shadow DOM 隔离（Task 5 `attachShadow`）；点击发送 `GISTMARK_TRIGGER_CLICKED`（Task 6）；background 记录日志（Task 4）；视觉规格忠实翻译（Task 5 STYLES——黑底、40×40、opacity 0.4→1、border #E0E0E0→#0033FF、工具提示含 `[CMD+SHIFT+G]` + `EXTRACT`、系统等宽字体、300ms 滑动、200ms 不透明度/工具提示）。
- **范围外已遵守**：不绑定键盘快捷键；不实现提取逻辑；不做 popup/面板；不做暗色模式；不做定位/拖拽。
- **类型一致性**：`TriggerMessage` 在 Task 2 定义，在 Task 3（`handleMessage.ts`）和 Task 6（`content.ts` 经 `buildTriggerMessage`）中导入。`handleTriggerMessage(message, log)` 签名在 Task 3 测试、Task 3 实现、Task 4 接线中一致。`createTriggerButton(onClick)` 在 Task 5 和 Task 6 中一致。
- **无占位符**：每个代码步骤都含完整代码。

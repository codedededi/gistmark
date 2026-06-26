# 悬浮触发按钮设计规格

**日期**: 2026-06-26
**主题**: GistMark 浏览器扩展悬浮触发按钮（floating trigger）

## 目标

在所有网页右侧边缘注入一个半隐藏的圆形 `</>` 悬浮按钮，点击后向 background script 发送 `GISTMARK_TRIGGER_CLICKED` 消息，为未来的提取逻辑预留通信接缝。

## 架构

单个 content script 注入隔离的 Shadow DOM 根节点，包含触发按钮。点击时通过 `browser.runtime.sendMessage` 向 background script 发送消息，background 记录日志。不使用 React，不加载外部字体，不影响宿主页面样式。

```
entrypoints/
  content.ts       — 内容脚本（注入 UI + 点击 → sendMessage）
  background.ts    — 接收 GISTMARK_TRIGGER_CLICKED，记录日志
```

## 组件

### 1. 内容脚本（`entrypoints/content.ts`）

- `matches: ['<all_urls>']`，`all_frames: false`，`run_at: 'document_idle'`
- 创建一个 `<div>` 挂载到 `document.documentElement`，附加 `attachShadow({ mode: 'open' })`
- 在 shadow root 内渲染触发按钮标记 + `<style>` 样式块
- 点击处理：`browser.runtime.sendMessage({ type: 'GISTMARK_TRIGGER_CLICKED', url: location.href, title: document.title })`
- 发送消息出错时（如 background 未就绪）用 `console.warn` 静默捕获

### 2. 后台脚本（`entrypoints/background.ts`）

- 通过 `browser.runtime.onMessage` 监听
- 收到 `GISTMARK_TRIGGER_CLICKED` 时：`console.log('[GistMark]', message)` — 为未来提取逻辑预留的接缝

## 视觉规格

源自 `.output/stitch_gistmark_prd/floating_trigger_light` 设计稿，已锁定：

- **容器**：`position: fixed; inset: 0; pointer-events: none; z-index: 9999` — 透明遮罩层，除按钮本身外不捕获点击
- **触发器外壳**：`position: absolute; right: 0; top: 50%; transform: translateY(-50%) translateX(50%)`（半隐藏在屏幕外）→ 悬停时 `translateX(0)`，300ms ease-in-out 过渡
- **按钮**：40×40，`border-radius: 9999px`，`background: #000`，`color: #fff`，`border: 1px solid #E0E0E0`，`opacity: 0.4` → 悬停时 `opacity: 1; border-color: #0033FF`，200ms 过渡
- **图标**：`</>`，使用 `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace` 字体栈，`letter-spacing: -1px`，14px
- **工具提示**：位于按钮左侧 12px 处，白底，`1px solid #E0E0E0` 边框，带 `box-shadow`，内边距 6px 12px；内容为 `[CMD+SHIFT+G]`（`#666` 色）+ `EXTRACT`（`#0A0A0A` 色），大写，10px，字距加宽。悬停时淡入（200ms）。
- **聚焦态**：无 `outline`，用 `box-shadow: 0 0 0 1px #0033FF` 作为键盘可访问性焦点环

## 边界情况

- **样式隔离**：所有 CSS 限定在 Shadow DOM 内 — 宿主页面样式无法渗入或渗出
- **无外部资源**：系统等宽字体栈，不依赖 Google Fonts，不受 CSP 限制
- **仅顶层框架**：`all_frames: false` 防止在 iframe 中出现重复触发器
- **现有 content.ts**：替换（目前是 google.com 占位脚本）
- **现有 background.ts**：扩展（目前仅是 hello-world 日志）

## 不在范围内（YAGNI）

- 不绑定键盘快捷键（工具提示 `[CMD+SHIFT+G]` 仅为装饰）
- 不实现提取逻辑，点击时不弹出 popup/面板
- 不做定位逻辑 / 拖拽 / 位置持久化 — 固定在右侧居中
- 不做暗色模式变体（设计稿仅为亮色）

## 测试策略

- **content script**：单元测试覆盖消息发送逻辑（mock `browser.runtime.sendMessage`），验证点击产生正确的消息载荷
- **background script**：单元测试覆盖 `onMessage` 监听器，验证收到 `GISTMARK_TRIGGER_CLICKED` 时正确处理
- **手动验证**：`npm run dev` 加载扩展，在任意页面验证按钮渲染、悬停动画、点击日志

# WXT Browser Extension Init Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Initialize the current repository as a WXT browser extension project with React, TypeScript, and npm.

**Architecture:** Use WXT's generated project structure as the application baseline. The generated entrypoints, config, and package scripts remain authoritative until feature-specific requirements are added later.

**Tech Stack:** WXT, React, TypeScript, npm.

---

### Task 1: Scaffold WXT Project

**Files:**
- Create: WXT generated project files in repository root.
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Run WXT init**

```bash
npx wxt@latest init . --template react --pm npm
```

Expected: WXT creates a React TypeScript browser extension project in the current directory and installs dependencies with npm.

- [ ] **Step 2: Inspect generated package scripts**

```bash
npm pkg get scripts
```

Expected: Output includes WXT development and verification scripts such as `dev`, `build`, and `compile`.

- [ ] **Step 3: Run generated verification**

```bash
npm run compile
```

Expected: WXT completes TypeScript generation and type checking without errors.

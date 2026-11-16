# ApplyFlow — Development Guide

## Prerequisites

- Node.js 18+ (tested on v24)
- Chrome 114+ (Manifest V3 support)

## Setup

```bash
npm install
npm run build
```

## Development with hot reload

```bash
npm run dev
```

WXT will start Vite in watch mode and rebuild on every file change.

## Loading the extension in Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `.output/chrome-mv3/` folder
5. The ApplyFlow lightning bolt icon appears in your toolbar

If the icon is not visible, click the puzzle-piece Extensions menu and pin ApplyFlow.

## Reloading after changes

After `npm run build` completes:
1. Go to `chrome://extensions`
2. Click the refresh icon on the ApplyFlow card
3. Reload any tabs where the content script runs

With `npm run dev` (watch mode), WXT hot-reloads automatically for most changes.
Reload the extension manually if you change `background.ts` or `manifest`-related config.

## Debugging

### Popup
- Right-click the extension icon → **Inspect popup**
- Opens DevTools scoped to popup.html

### Background service worker
- Go to `chrome://extensions`
- Click **Service Worker** link on the ApplyFlow card
- Opens DevTools for background.ts
- All `console.log("[ApplyFlow]...")` messages appear here

### Content scripts
- Open DevTools on any job page (F12)
- **Console** tab — filter by `[ApplyFlow]`
- **Sources** → Content scripts → ApplyFlow

### Dashboard
- Open `chrome://extensions`
- Click **Open side panel** or directly navigate to:
  `chrome-extension://<extension-id>/dashboard.html`
- Right-click anywhere on the dashboard → **Inspect**

## Running tests

```bash
npm test          # Run all tests once
npm run test:watch  # Watch mode
```

Tests run in jsdom with a full chrome API mock (see `tests/setup.ts`).

## TypeScript

```bash
npm run typecheck  # Check without building
```

## Production build

```bash
npm run build      # Build in production mode
npm run zip        # Create .zip for Chrome Web Store submission
```

## Directory layout

```
src/
  entrypoints/
    popup/          React popup (300px wide popup UI)
    dashboard/      Full-page dashboard SPA
    background.ts   Service worker (message router, storage orchestrator)
    content/        Content script (page injection, job detection)
  
  features/
    autofill/       Form detection, field matching, filling, ATS adapters
    learning/       Self-learning engine and memory management
    referrals/      Referral queue management
    applications/   Job tracker
    digest/         Daily referral digest generation
  
  storage/          Repository layer over chrome.storage.local
  messaging/        Typed message definitions (discriminated unions)
  models/           Pure TypeScript + Zod schemas
  components/ui/    Shared React components
  utils/            Pure utility functions
  styles/           Global Tailwind CSS

tests/
  unit/             Repository, detector, engine tests
  integration/      (Milestone 2+)
  fixtures/         Local HTML files simulating ATS forms
```

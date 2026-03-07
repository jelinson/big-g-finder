---
id: 001
title: Add Playwright for automated screenshots
status: open
priority: high
evidence: none
pr: ~
---

## Goal

Install Playwright and create a screenshot utility script so that future agents can capture
before/after screenshots of the app and attach them to PRs.

## Acceptance Criteria

- [ ] `npm run screenshot -- --url <url> --out <path>` captures a full-page PNG
- [ ] Script waits for the page to be fully loaded (network idle) before capturing
- [ ] Playwright is installed as a dev dependency with only the Chromium browser downloaded
- [ ] Existing tests still pass

## Context

The frontend is a single static HTML file (`sweet-cow-finder.html`) that fetches from
`/api/flavors`. Screenshots should work against any URL (local dev server, production, or
Vercel preview). The script does not need to mock the API — it should screenshot whatever
the live URL renders.

## Steps

### [AGENT]

- [ ] Install Playwright: `npm install --save-dev playwright`; configure to install Chromium only
- [ ] Create `scripts/screenshot.js` that accepts `--url` and `--out` CLI arguments,
      navigates to the URL, waits for `networkidle`, and saves a full-page PNG
- [ ] Add npm script to `package.json`: `"screenshot": "node scripts/screenshot.js"`
- [ ] Verify `npm run screenshot -- --url https://example.com --out /tmp/test.png` works
- [ ] Run `npm test` and confirm all existing tests pass

## Out of Scope

- Setting up Playwright for end-to-end testing (that is a separate task)
- Mocking API responses in the screenshot script
- Screenshots of anything other than the full page

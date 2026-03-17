---
id: 008
title: Add font preconnect hints and font-display swap to reduce render blocking
priority: low
evidence: none
pr: https://github.com/jelinson/big-g-finder/pull/35
---

## Goal

Prevent Google Fonts from blocking page render by adding preconnect hints and `font-display=swap`
to the font URL in `index.html`.

## Acceptance Criteria

- [x] `<link rel="preconnect" href="https://fonts.googleapis.com">` added before the fonts stylesheet
- [x] `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` added before the fonts stylesheet
- [x] `&display=swap` appended to the Google Fonts stylesheet URL (was already present)
- [ ] Fonts still load and render correctly visually

## Context

`index.html` loads Fredoka and DM Sans from Google Fonts via a synchronous `<link rel="stylesheet">`.
Without preconnect hints, the browser must do a full DNS + TLS handshake before it can fetch the
stylesheet. `font-display: swap` lets text render in a fallback font immediately while the custom
font loads.

## Steps

### [AGENT]

- [x] Add the two preconnect `<link>` tags to `<head>` in `index.html` before the Google Fonts `<link>`
- [x] Append `&display=swap` to the Google Fonts href (was already present)
- [ ] Visually verify fonts still render (screenshot or manual check)

## Out of Scope

- Self-hosting fonts
- Changing font choices

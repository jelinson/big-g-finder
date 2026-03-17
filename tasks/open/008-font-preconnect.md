---
id: 008
title: Add font preconnect hints and font-display swap to reduce render blocking
priority: low
evidence: none
pr: ~
---

## Goal

Prevent Google Fonts from blocking page render by adding preconnect hints and `font-display=swap`
to the font URL in `index.html`.

## Acceptance Criteria

- [ ] `<link rel="preconnect" href="https://fonts.googleapis.com">` added before the fonts stylesheet
- [ ] `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` added before the fonts stylesheet
- [ ] `&display=swap` appended to the Google Fonts stylesheet URL
- [ ] Fonts still load and render correctly visually

## Context

`index.html` loads Fredoka and DM Sans from Google Fonts via a synchronous `<link rel="stylesheet">`.
Without preconnect hints, the browser must do a full DNS + TLS handshake before it can fetch the
stylesheet. `font-display: swap` lets text render in a fallback font immediately while the custom
font loads.

## Steps

### [AGENT]

- [ ] Add the two preconnect `<link>` tags to `<head>` in `index.html` before the Google Fonts `<link>`
- [ ] Append `&display=swap` to the Google Fonts href
- [ ] Visually verify fonts still render (screenshot or manual check)

## Out of Scope

- Self-hosting fonts
- Changing font choices

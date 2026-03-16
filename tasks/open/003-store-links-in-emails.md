---
id: 003
title: Add Sweet Cow store page links to flavor alert emails
priority: low
evidence: screenshot
pr: ~
---

## Goal

When a watched flavor is found at a location, include a link to that location's Sweet Cow
store page in the alert email so users can quickly find directions or hours.

## Acceptance Criteria

- [ ] Each location in the flavor alert email has a clickable link to its Sweet Cow store page
- [ ] Link is derived from the location slug already stored in the database (no extra scraping)
- [ ] Email renders correctly in the preview script
- [ ] All tests pass and snapshots are updated

## Context

The scraper stores a `slug` per location in the `locations` table. Sweet Cow store pages
follow the pattern `https://sweetcow.com/locations/<slug>`. The email templates live in
`lib/emails.js`. Preview rendering is done via `scripts/preview-emails.js`.

The `flavors` API response (`api/flavors.js`) already returns location data including the slug.

## Steps

### [AGENT]

- [ ] Take a **before** screenshot per AGENTS.md instructions
- [ ] Update `lib/emails.js` to render each location name as an `<a>` tag linking to
      `https://sweetcow.com/locations/<slug>`
- [ ] Update `tests/emails.test.js` and regenerate snapshots: `npm test -- --update-snapshots`
- [ ] Run `npm run preview-emails` and visually verify the output HTML looks correct
- [ ] Run `npm test` and confirm all tests pass
- [ ] Take an **after** screenshot per AGENTS.md instructions

## Out of Scope

- Linking to individual flavor pages (they don't exist on sweetcow.com)
- Adding store hours or address data to the email
- Changes to the frontend (`sweet-cow-finder.html`)

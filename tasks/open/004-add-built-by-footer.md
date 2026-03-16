---
id: 004
title: Add "Built with 🍦 by jelinson" footer to site and emails
priority: low
evidence: screenshot
pr: ~
---

## Goal

Add a small, light grey "Built with 🍦 by jelinson" attribution footer to the site and all
email templates, linking to jelinson.com and the GitHub repo.

## Acceptance Criteria

- [ ] Footer appears at the bottom of the site in small, light grey font
- [ ] Footer appears at the bottom of both email templates (confirm + notify)
- [ ] "jelinson" links to `https://jelinson.com`
- [ ] A GitHub repo link is also included
- [ ] All tests pass and snapshots are updated

## Context

The frontend is a single-file app at `index.html`. Email templates are built in `lib/emails.js`
and use inline styles (no external CSS). Snapshot tests for emails live in
`tests/__snapshots__/emails.test.js.snap` and must be regenerated after any template change.

## Steps

### [AGENT]

- [ ] Add a `<footer>` element to `index.html` with the attribution text styled small and light grey
- [ ] Add an inline-styled footer block to both `buildConfirmEmail` and `buildNotifyEmail` in `lib/emails.js`
- [ ] Regenerate email snapshots: `npm test -- --update-snapshots`
- [ ] Run `npm test` and confirm all tests pass
- [ ] Take a **before** and **after** screenshot per AGENTS.md instructions

## Out of Scope

- Adding the footer to any other pages or templates not listed above
- Changing the footer style beyond small and light grey

---
id: 002
title: Rename subdomain biggfinder → biggsfinder
status: open
priority: medium
evidence: none
pr: ~
---

## Goal

Rename the subdomain from `biggfinder.jelinson.com` to `biggsfinder.jelinson.com` to match
the possessive in "Big G's Finder".

## Acceptance Criteria

- [ ] No references to `biggfinder` remain in code, docs, or test snapshots
- [ ] All tests pass with updated assertions
- [ ] Draft PR opened with human infrastructure steps clearly listed

## Context

The subdomain appears as a hardcoded fallback and in email FROM addresses. The live domain
is used in Resend (email sender), Vercel (hosting), and Cloudflare (DNS). Supabase does
not reference the domain and needs no changes.

Affected files:
- `lib/emails.js` — FROM address
- `scripts/scrape.js` — APP_URL fallback
- `api/subscribe.js` — APP_URL fallback
- `scripts/preview-emails.js` — hardcoded preview URLs
- `tests/emails.test.js` — test descriptions + assertions
- `tests/__snapshots__/emails.test.js.snap` — snapshots
- `tests/subscribe.api.test.js` — mock from address
- `CLAUDE.md`, `README.md` — docs

## Steps

### [AGENT]

- [ ] Find-and-replace all occurrences of `biggfinder` with `biggsfinder` across the codebase
- [ ] Regenerate test snapshots if needed: `npm test -- --update-snapshots`
- [ ] Run `npm test` and confirm all tests pass

### [HUMAN]

- [ ] **Cloudflare**: Add CNAME `biggsfinder` → same Vercel target as `biggfinder`; delete old `biggfinder` CNAME
- [ ] **Vercel**: Add `biggsfinder.jelinson.com` as a custom domain; remove `biggfinder.jelinson.com`
- [ ] **Resend**: Add `biggsfinder.jelinson.com` as a sending domain → copy SPF/DKIM/DMARC records → add in Cloudflare → wait for verification; remove old domain
- [ ] **GitHub Secrets**: Update `APP_URL` to `https://biggsfinder.jelinson.com`
- [ ] **Vercel env**: Update `APP_URL` to `https://biggsfinder.jelinson.com`

## Out of Scope

- Any changes to Supabase
- Redirecting the old subdomain to the new one

---
id: 005
title: Convert /api/flavors to Vercel Edge Function to eliminate cold starts
priority: high
evidence: none
pr: ~
---

## Goal

Migrate `api/flavors.js` from a Node.js serverless function to a Vercel Edge Function so it runs
on the CDN edge globally with no cold start penalty, saving 1–3s on first visits.

## Acceptance Criteria

- [ ] `api/flavors.js` exports `export const config = { runtime: 'edge' }`
- [ ] API still returns correct `{ locations: [...] }` response
- [ ] All tests pass
- [ ] Smoke test passes on preview deployment

## Context

Vercel serverless (Node.js) functions cold-start after ~5 minutes of inactivity, adding 1–3s of
latency. Edge functions have no cold start. `@supabase/supabase-js` supports the Edge runtime.
The function currently uses `res.setHeader` / `res.status` (Node-style) which may need to be
converted to returning a `Response` object (Web standard) for the Edge runtime.

## Steps

### [AGENT]

- [ ] Add `export const config = { runtime: 'edge' }` to `api/flavors.js`
- [ ] Convert handler signature from `(req, res)` to returning a `Response` object if required by Edge runtime
- [ ] Verify `@supabase/supabase-js` createClient works in Edge (no Node-only APIs used)
- [ ] Run `npm test` and confirm all tests pass
- [ ] Deploy to preview and run `/smoke-test <preview-url>`

## Out of Scope

- Migrating `api/subscribe.js` or `api/unsubscribe.js` (separate task if desired)

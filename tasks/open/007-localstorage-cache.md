---
id: 007
title: Cache /api/flavors response in localStorage for instant repeat visits
priority: medium
evidence: none
pr: ~
---

## Goal

Cache the `/api/flavors` API response in `localStorage` so repeat visits within the same day
render instantly without a network request.

## Acceptance Criteria

- [ ] On first load, data is fetched from `/api/flavors` and stored in `localStorage` with a timestamp
- [ ] On subsequent loads the same day, cached data is rendered immediately (no fetch)
- [ ] Cache is invalidated after 2 hours (to pick up mid-day scrape updates — scraper runs 3×/day)
- [ ] If the cache is stale or missing, falls back to a normal fetch
- [ ] All tests pass

## Context

The scraper runs at 6am, 12pm, and 6pm MT daily. A cache keyed only on today's date would serve
stale data for up to ~6 hours mid-day, so a 2-hour TTL is a better balance. Cache key should
include a version prefix in case the response shape changes.

Frontend fetch logic is in `public/app.js`, function `fetchAllLocations()`.

## Steps

### [AGENT]

- [ ] In `fetchAllLocations()` in `public/app.js`, check `localStorage` for a cached entry
- [ ] Use a cache key like `bigg-flavors-v1` storing `{ data, cachedAt }` as JSON
- [ ] Treat cache as valid if `Date.now() - cachedAt < 2 * 60 * 60 * 1000` (2 hours)
- [ ] On a valid cache hit, call the existing render logic with cached data instead of fetching
- [ ] On a miss or stale entry, fetch normally and write the result to `localStorage`
- [ ] Run `npm test` and confirm all tests pass

## Out of Scope

- Background revalidation (show stale + refresh in background) — keep it simple for now
- Caching subscribe form data or other API responses

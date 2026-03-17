---
id: 007
title: Cache /api/flavors response in localStorage for instant repeat visits
priority: medium
evidence: none
pr: https://github.com/jelinson/big-g-finder/pull/36
---

## Goal

Cache the `/api/flavors` API response in `localStorage` so repeat visits within the same day
render instantly without a network request.

## Acceptance Criteria

- [x] On first load, data is fetched from `/api/flavors` and stored in `localStorage` with a timestamp
- [x] On subsequent loads the same day, cached data is rendered immediately (no fetch)
- [x] Cache is invalidated after 2 hours (to pick up mid-day scrape updates — scraper runs 3×/day)
- [x] If the cache is stale or missing, falls back to a normal fetch
- [x] All tests pass

## Context

The scraper runs at 6am, 12pm, and 6pm MT daily. A cache keyed only on today's date would serve
stale data for up to ~6 hours mid-day, so a 2-hour TTL is a better balance. Cache key should
include a version prefix in case the response shape changes.

Frontend fetch logic is in `public/app.js`, function `fetchAllLocations()`.

## Steps

### [AGENT]

- [x] In `fetchAllLocations()` in `public/app.js`, check `localStorage` for a cached entry
- [x] Use a cache key like `bigg-flavors-v1` storing `{ data, cachedAt }` as JSON
- [x] Treat cache as valid if `Date.now() - cachedAt < 2 * 60 * 60 * 1000` (2 hours)
- [x] On a valid cache hit, call the existing render logic with cached data instead of fetching
- [x] On a miss or stale entry, fetch normally and write the result to `localStorage`
- [x] Run `npm test` and confirm all tests pass

## Out of Scope

- Background revalidation (show stale + refresh in background) — keep it simple for now
- Caching subscribe form data or other API responses

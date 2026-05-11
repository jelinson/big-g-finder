---
id: 006
title: Collapse sequential Supabase queries in /api/flavors into one round trip
priority: medium
evidence: none
pr: https://github.com/jelinson/big-g-finder/pull/37
---

## Goal

Reduce the number of Supabase round trips in `api/flavors.js` from 2 to 1 by eliminating the
sequential query that depends on the result of a prior query.

## Acceptance Criteria

- [x] `/api/flavors` makes at most 2 Supabase queries (locations + flavors) in a single round trip
- [x] Flavors returned are still from the most recent scrape date
- [x] All tests pass

## Context

Currently `api/flavors.js` makes 3 queries in 2 round trips:
1. (parallel) `SELECT * FROM locations WHERE active = true`
2. (parallel) `SELECT last_seen FROM flavors ORDER BY last_seen DESC LIMIT 1`
3. (sequential, depends on #2) `SELECT location, flavor_name FROM flavors WHERE last_seen = <date>`

Query #3 can be rewritten to resolve the date server-side using a subquery:
`SELECT location, flavor_name FROM flavors WHERE last_seen = (SELECT MAX(last_seen) FROM flavors)`

This lets queries #1 and #3 run in parallel, eliminating one full round trip (~100–300ms per
uncached request).

## Steps

### [AGENT]

- [x] Rewrite `api/flavors.js` to run the locations query and the subquery-based flavors query in parallel via `Promise.all`
- [x] Remove the intermediate `latestDateResult` query
- [x] Run `npm test` and confirm all tests pass

## Out of Scope

- Any other query or schema changes

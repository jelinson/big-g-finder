---
name: smoke-test
description: Smoke-test a deployed URL (production or Vercel preview) — checks page load, API, security headers, and browser hydration
user_invocable: true
arguments: URL to smoke-test (e.g. https://biggfinder.jelinson.com or a Vercel preview URL)
---

Run a smoke test against the deployed URL: $ARGUMENTS

## Phase 1: curl checks

Use the Bash tool to run these checks with curl. Print PASS or FAIL for each.

**1. Homepage loads**
- GET `$ARGUMENTS/`
- If you get HTTP 401/403, this is a Vercel preview deployment that requires auth. Use the `mcp__plugin_vercel_vercel__get_access_to_vercel_url` tool to get a shareable URL, then navigate to it in the Playwright browser to set the auth cookie. After that, re-run the curl check using the shareable URL with the `_vercel_share` parameter appended to each test URL.
- Expect HTTP 200
- Expect the response body to contain `Big G` (title text)

**2. Flavors API returns valid data**
- GET `$ARGUMENTS/api/flavors`
- Expect HTTP 200
- Expect valid JSON with a `locations` array

**3. Subscribe API rejects bad input**
- POST `$ARGUMENTS/api/subscribe` with `Content-Type: application/json` and body `{}`
- Expect HTTP 400

**4. Security headers**
Check response headers from the homepage (case-insensitive) for:
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `content-security-policy` (any value)
- `strict-transport-security` (any value)

Print a summary: `N/7 checks passed`

## Phase 2: Browser verification

Use the Playwright MCP tools to verify the page actually renders and hydrates:

1. Navigate to the URL (use the shareable URL if preview auth was needed in Phase 1)
2. Wait for text "Available" or "Not Available" to appear (cards hydrating)
3. Take a snapshot and verify:
   - Flavor select is populated (not stuck on "Loading…")
   - At least one location card shows "✓ Available" or "✗ Not Available"
   - No console errors related to app.js (ignore Vercel toolbar CSP errors)
4. Print PASS/FAIL for browser verification

## Final summary

Print the overall result:
```
SMOKE TEST PASSED (8/8)
```
or
```
SMOKE TEST FAILED (N/8) — [list failures]
```

If any check fails, show what was actually received to help diagnose the problem.

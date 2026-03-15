Run a smoke test against the deployed URL: $ARGUMENTS

Use the Bash tool to run the following checks with curl. Print a clear PASS or FAIL for each check, then a final summary.

**1. Homepage loads**
- GET `$ARGUMENTS/`
- Expect HTTP 200
- Expect the response body to contain `Big G` (title text)

**2. Flavors API returns valid data**
- GET `$ARGUMENTS/api/flavors`
- Expect HTTP 200
- Expect the response body to be valid JSON with a `locations` array

**3. Subscribe API rejects bad input**
- POST `$ARGUMENTS/api/subscribe` with `Content-Type: application/json` and body `{}`
- Expect HTTP 400 (missing required fields)

**4. Security headers are present**
Check the response headers from the homepage for:
- `x-frame-options: DENY`
- `x-content-type-options: nosniff`
- `content-security-policy` (any value)
- `strict-transport-security` (any value)

Use `curl -sI` to fetch headers only. Match header names case-insensitively.

Print results like:
```
PASS  Homepage loads (200)
PASS  Flavors API returns locations array
PASS  Subscribe API rejects empty body (400)
PASS  x-frame-options present
PASS  x-content-type-options present
PASS  content-security-policy present
PASS  strict-transport-security present

7/7 checks passed
```

If any check fails, show what was actually received to help diagnose the problem.

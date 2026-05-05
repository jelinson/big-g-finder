# Big G's Finder

Tracks Sweet Cow ice cream flavors across all Boulder/Denver locations and sends email alerts
when a watched flavor (default: Big G's Cookies & Dream) appears.

For setup, env vars, and commands, see [README.md](README.md). This file documents conventions, gotchas, and operational runbooks.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML (`sweet-cow-finder.html`), served by Vercel |
| API | Vercel serverless functions (`api/`) |
| Scraper | Node 20 script (`scripts/scrape.js`), run by GitHub Actions |
| Database | Supabase (Postgres) |
| Email | Resend |
| DNS | Cloudflare (CNAME → Vercel, proxy off) |
| Domain | `biggfinder.jelinson.com` |

## Adding or Removing a Sweet Cow Location

Locations are **auto-discovered** 3× daily from `sweetcow.com` by the scraper. No code changes needed
when Sweet Cow opens or closes a location — the scraper detects it and updates the `locations`
table automatically:

- **New location**: inserted with `active = true`; `address` will be `null` until filled in manually
- **Removed location**: marked `active = false`; flavor history is preserved

To manually fill in an address for a new location: edit the row directly in the Supabase table editor.

If a location is incorrectly excluded, check the `NON_LOCATION_SLUGS` blocklist in `scripts/scrape.js`.

## Email Domain Setup (Resend)

Emails are sent from `noreply@biggfinder.jelinson.com`. To set this up:

1. In Resend dashboard → Domains → Add Domain → enter `biggfinder.jelinson.com`
2. Resend will provide SPF, DKIM, and DMARC DNS records
3. Add those records in Cloudflare for `jelinson.com` (these are separate from the Vercel CNAME)
4. Wait for Resend to verify (usually a few minutes)

## Development Rules

### Flavor names contain apostrophes
Real flavor names include apostrophes — "Big G's Cookies & Dream", "S'mores", etc. Any input
validation, regex, or character allowlist that touches flavor names **must** permit `'`. Never
add `'` to a list of rejected characters.

### Prefer established packages over custom implementations
Use well-known npm packages rather than hand-rolling equivalents. Example: use `he` for HTML
escaping, not a custom `escapeHtml` function.

Exception: browser-side code loaded as an ES module without a bundler cannot use bare package
specifiers (`import he from 'he'`). In that case, inline the logic or load from a CDN — but
document why.

### Keep PRs minimal and scoped
Each PR must contain only commits related to its stated purpose. Before opening a PR, run
`git log <base>...HEAD` to verify every commit belongs. If unrelated commits are present
(e.g. from a reused branch), start a fresh branch from the correct base instead.

### Smoke-test every push to a PR
After **every** push to a PR branch (initial push, review fixes, rebase, etc.), run
`/smoke-test` against the Vercel preview deployment to verify the page loads,
the API responds, security headers are present, and the page hydrates in a real browser.
The smoke test will auto-discover the preview URL via the Vercel MCP — do **not** try to
construct or guess the preview URL yourself. Do not mark a PR ready for review or
request merge until the latest push's smoke test passes. This includes force-pushes after
rebasing — a rebase can introduce breakage even when tests pass.

## Database Schema

See `supabase-schema.sql`. Key tables:

- `locations` — Sweet Cow locations with `active` flag
- `flavors` — flavor inventory with `first_seen` / `last_seen` dates
- `subscriptions` — email subscriptions with confirm/unsubscribe tokens

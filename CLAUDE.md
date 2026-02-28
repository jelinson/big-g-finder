# Big G's Finder

Tracks Sweet Cow ice cream flavors across all Boulder/Denver locations and sends email alerts
when a watched flavor (default: Big G's Cookies & Dream) appears.

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

## Environment Variables

| Variable | Used by | Where to set |
|---|---|---|
| `SUPABASE_URL` | scraper, API | GitHub Secrets + Vercel env |
| `SUPABASE_SERVICE_KEY` | scraper, API | GitHub Secrets + Vercel env |
| `RESEND_API_KEY` | scraper, subscribe API | GitHub Secrets + Vercel env |
| `APP_URL` | scraper, subscribe API | GitHub Secrets + Vercel env |

## Development Commands

```bash
npm test                  # run all tests (vitest)
npm run test:watch        # vitest in watch mode
npm run scrape            # run scraper locally (requires env vars)
npm run preview-emails    # render email templates to email-previews/*.html
```

## Project Structure

```
api/
  flavors.js        GET /api/flavors — returns today's flavors from Supabase
  subscribe.js      POST /api/subscribe, GET /api/subscribe?confirm=<token>
  unsubscribe.js    GET /api/unsubscribe?token=<token>
lib/
  normalize.js      shared flavor normalization (used by scraper + subscribe API)
  emails.js         email template builders (used by scraper + subscribe API)
scripts/
  scrape.js         daily scraper with dynamic location discovery
  preview-emails.js renders email templates to email-previews/ for visual review
tests/
  normalize.test.js unit tests for normalization functions
  emails.test.js    snapshot tests for email templates
  scrape.test.js    unit tests for scraper (mock fetch)
  flavors.api.test.js  integration tests for /api/flavors
  subscribe.api.test.js integration tests for /api/subscribe
.github/workflows/
  scrape.yml        daily cron at 8am MT + manual trigger
  ci.yml            run tests on every push/PR
sweet-cow-finder.html  frontend (single file)
supabase-schema.sql    DB schema + seed data (run once in Supabase SQL editor)
```

## Adding or Removing a Sweet Cow Location

Locations are **auto-discovered** daily from `sweetcow.com` by the scraper. No code changes needed
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

## Deployment

Vercel auto-deploys on every push to `main` (once GitHub integration is connected in
Vercel dashboard → Settings → Git → Connect Git Repository).

Manual deploy: `vercel --prod`

## Database Schema

See `supabase-schema.sql`. Key tables:

- `locations` — Sweet Cow locations with `active` flag
- `flavors` — flavor inventory with `first_seen` / `last_seen` dates
- `subscriptions` — email subscriptions with confirm/unsubscribe tokens

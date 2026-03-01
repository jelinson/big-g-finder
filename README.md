# Big G's Finder

[![CI](https://github.com/jelinson/big-g-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/jelinson/big-g-finder/actions/workflows/ci.yml)

Never miss Big G's Cookies & Dream again. Tracks Sweet Cow ice cream flavors across all Boulder/Denver locations and sends email alerts when a watched flavor appears.

**Live site:** [biggfinder.jelinson.com](https://biggfinder.jelinson.com)

---

## Overview

Sweet Cow posts their daily flavors on their website, but there's no way to get notified when a specific flavor shows up. Big G's Finder scrapes all Sweet Cow locations 3x per day, stores the flavor history in a database, and emails subscribers the moment their flavor is spotted.
---

## Features

- **Flavor tracking** — scrapes all Sweet Cow locations at 6am, 12pm, and 6pm MT daily
- **Email alerts** — notifies subscribers when a watched flavor is available, including which locations have it
- **Flavor history** — stores first/last seen dates for every flavor at every location
- **Auto location discovery** — detects new/closed locations automatically
- **Double opt-in subscriptions** — confirmation email sent before any alerts
- **One-click unsubscribe** — token-based, no login required

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Static HTML/CSS/JS, served by Vercel |
| API | Vercel serverless functions (`api/`) |
| Scraper | Node 20 (`scripts/scrape.js`), run by GitHub Actions |
| Database | Supabase (Postgres) |
| Email | Resend |
| Domain | `biggfinder.jelinson.com` (Cloudflare → Vercel) |

---

## Project Structure

```
api/
  flavors.js          GET /api/flavors — today's flavors from Supabase
  subscribe.js        POST /api/subscribe, GET /api/subscribe?confirm=<token>
  unsubscribe.js      GET /api/unsubscribe?token=<token>
lib/
  normalize.js        shared flavor normalization
  emails.js           email template builders
scripts/
  scrape.js           daily scraper with dynamic location discovery
  preview-emails.js   renders email templates to email-previews/ for review
tests/
  normalize.test.js
  emails.test.js
  scrape.test.js
  flavors.api.test.js
  subscribe.api.test.js
.github/workflows/
  scrape.yml          daily cron (6am, 12pm, 6pm MT) + manual trigger
  ci.yml              tests on every push/PR
```

---

## Local Development

### Prerequisites

- Node 20
- A Supabase project (see schema in `supabase-schema.sql`)
- A Resend account with `biggfinder.jelinson.com` verified as a sending domain

### Environment Variables

Create a `.env` file (or set these in your shell):

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
RESEND_API_KEY=
APP_URL=https://biggfinder.jelinson.com
```

### Commands

```bash
npm ci                    # install dependencies
npm test                  # run all tests (vitest)
npm run test:watch        # vitest in watch mode
npm run scrape            # run scraper locally
npm run preview-emails    # render email templates to email-previews/*.html
npm run preview-emails -- --flavor "Salted Caramel"  # preview with a specific flavor
```

---

## Deployment

### Vercel (frontend + API)

1. Connect the repo in the Vercel dashboard under **Settings → Git → Connect Git Repository**
2. Add the four environment variables under **Settings → Environment Variables**
3. Push to `main` — Vercel auto-deploys on every push

Manual deploy: `vercel --prod`

### GitHub Actions (scraper)

Add the four environment variables as **Repository Secrets** under **Settings → Secrets and variables → Actions**. The scraper runs automatically at 6am, 12pm, and 6pm MT. Trigger it manually from the **Actions** tab anytime.

### Database

Run `supabase-schema.sql` once in the Supabase SQL editor to create tables and seed initial data.

### Email Domain (Resend)

1. In Resend dashboard → **Domains → Add Domain** → enter `biggfinder.jelinson.com`
2. Add the provided SPF, DKIM, and DMARC records in Cloudflare
3. Wait for Resend to verify (usually a few minutes)

Emails are sent from `noreply@biggfinder.jelinson.com`.

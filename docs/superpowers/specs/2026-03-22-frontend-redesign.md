# Frontend Redesign — Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Goal

Reduce perceived first-load latency and integrate the subscribe UI more naturally into the page flow. The color scheme, fonts, and core functionality are unchanged.

---

## 1. Static Location Cards (Immediate Render)

All 7 location names are hardcoded directly in `index.html` as fully rendered cards in a loading state. No JavaScript or network request is needed to show them.

**Initial state (0ms):**
- All 7 cards visible with location name, address, and a spinner badge ("Loading")
- Summary card shows "🔍 Checking all locations…" with a spinner
- Flavor selector row visible with default "Big G's Cookies & Dream ⭐"
- Subscribe trigger is hidden until API responds

**After API responds:**
- JS walks the static cards and updates each one in place: `found` / `not-found` class, status badge, link href
- Summary card updates to "🎉 Found at N locations!" or "😢 Not available at any location"
- Subscribe trigger appears inside the summary card
- Flavor dropdown options are populated from API response

**If API returns locations not in static HTML:**
- New cards are appended to the grid dynamically, no special visual treatment
- No user-facing alert; the backend handles drift detection separately

**Static locations to hardcode:**

| Slug | Name | Address |
|---|---|---|
| south-boulder | South Boulder | 669 South Broadway, Boulder |
| north-boulder | North Boulder | 2628 Broadway, Boulder |
| louisville | Louisville | 637 Front Street, Louisville |
| longmont | Longmont | 600 Longs Peak Ave, Longmont |
| highlands | Highlands | 3475 West 32nd Ave, Denver |
| stanley-marketplace | Stanley Marketplace | 2501 Dallas Street, Aurora |
| platt-park | Platt Park | 1882 South Pearl St, Denver |

---

## 2. Flavor Selector Row

The existing full-width `<select>` dropdown is replaced with a pill-style row:

```
[ Flavor:  Big G's Cookies & Dream ⭐           ▾ ]
```

- Label: "Flavor:" (not "Showing:")
- The pill opens the native `<select>` on click (or the select sits inside/behind the pill)
- Behavior on change is unchanged: re-runs `displayResults()` for the selected flavor

---

## 3. Summary Card

Replaces the old `.summary` div. Sits between the flavor row and the location grid.

**Loading state:**
```
🔍  Checking all locations…  ⟳
```

**Loaded — found:**
```
🎉  Found at 2 locations!
    🔔 Get notified when it changes ▾
```

**Loaded — not found:**
```
😢  Not currently available at any location
    🔔 Get notified when it changes ▾
```

The subscribe trigger ("🔔 Get notified…") only appears after the API responds.

---

## 4. Subscribe UI (Option C — Expandable Disclosure)

The existing `.subscribe-section` / `.subscribe-card` at the bottom of the page is removed entirely.

Subscribe functionality lives inside the summary card as a disclosure:

**Collapsed (default):**
```
🔔 Get notified when it changes ▾
```

**Expanded (on click):**
```
🔔 Get notified when it changes ▸
┌─────────────────────────────────────────┐
│  [ your@email.com          ] [Notify Me!]│
│  We'll email when Big G's is spotted.   │
│  ▸ Filter by location (optional)        │
└─────────────────────────────────────────┘
```

- Clicking the trigger toggles the form open/closed
- "Filter by location (optional)" is a nested disclosure that reveals the existing location checkboxes
- Form submission behavior is unchanged (POST `/api/subscribe`)
- Success/error message replaces the button area inline
- The trigger text updates to reflect the selected flavor (same as current `subscribe-flavor-display`)

---

## 5. Location Card Design

Cards are smaller and tighter than current design to accommodate 7 cards in a 2-column grid without excessive scrolling.

**States:**

| State | Visual |
|---|---|
| Loading | White card, 70% opacity, spinner badge |
| Found | Mint border + mint gradient background, cherry "✓ Available" badge |
| Not found | White card, 55% opacity, grey "✗ Not Available" badge |

Cards remain links to the Sweet Cow location page (with `#:~:text=` fragment for found flavor).

---

## 6. Files Changed

| File | Change |
|---|---|
| `index.html` | Hardcode 7 location cards in loading state; remove `#subscribe-section`; add summary card structure |
| `public/style.css` | New styles for pill flavor row, summary card, disclosure form, updated card states; remove old `.subscribe-section` / `.subscribe-card` styles |
| `public/app.js` | Update `fetchAllLocations` to hydrate static cards instead of rendering from scratch; add disclosure toggle logic; move subscribe form handling to summary card |

---

## 7. Out of Scope

- No changes to the API (`api/flavors.js`, `api/subscribe.js`)
- No changes to the scraper or email templates
- No changes to the color scheme or fonts
- No changes to the `?subscribed=1` banner or `?flavor=` URL param behavior

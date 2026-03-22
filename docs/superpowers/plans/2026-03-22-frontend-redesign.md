# Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the frontend so location names appear instantly (no API wait), and the subscribe UI is an inline disclosure inside the summary card rather than a separate bottom section.

**Architecture:** Seven Sweet Cow location cards are hardcoded in `index.html` with `data-slug` attributes and a loading state. On DOMContentLoaded, `app.js` fetches `/api/flavors` and hydrates each card in-place by matching `data-slug`. The subscribe form moves inside the summary card as a collapsible disclosure. The dual hidden+visible `<select>` pattern is replaced with a single `#flavorSelect` in the pill row.

**Tech Stack:** Plain HTML/CSS/ES module JS, Vitest + jsdom for tests. No framework. No new dependencies.

---

## File Map

| File | Change |
|---|---|
| `index.html` | Hardcode 7 location cards (`data-slug`), summary card, disclosure form, pill flavor row; remove `#subscribe-section` |
| `public/style.css` | Loading card state, pill flavor row, summary card, disclosure form; remove `.subscribe-section`/`.subscribe-card` |
| `public/app.js` | Hydration via `data-slug`, summary card updates, simplified single-select, disclosure toggle, dynamic append |
| `tests/flavor.select.test.js` | Update HTML scaffold + selectors to new structure |
| `tests/subscribe.form.test.js` | Update HTML scaffold to new structure |

---

## Task 1: Update `index.html`

**Files:**
- Modify: `index.html`

The entire body content between `<div class="container">` and `</div>` is replaced. Key structural changes:
- `#loading` spinner div → removed (summary card handles this)
- `#flavorSelect` hidden select → single visible `<select id="flavorSelect">` inside pill row
- `#results` div → removed; cards live directly in static `#loc-grid`
- `#subscribe-section` card → removed; subscribe lives inside `#loc-summary`

- [ ] **Step 1: Replace `index.html` body content**

Replace everything inside `<body>` (keeping `<script>` and `<footer>`) with:

```html
<body>
    <div class="bg-decoration decoration-1"></div>
    <div class="bg-decoration decoration-2"></div>
    <div class="bg-decoration decoration-3"></div>

    <div class="container">
        <header>
            <h1>🍦 Big G's Finder</h1>
            <p class="subtitle">Find Sweet Cow's best flavor</p>
        </header>

        <div class="flavor-pill">
            <span class="flavor-pill-label">Flavor:</span>
            <select id="flavorSelect" class="flavor-select-inline">
                <option value="" disabled>Loading…</option>
            </select>
        </div>

        <div id="results"></div>

        <div id="loc-summary" class="summary-card">
            <div id="loc-summary-text" class="summary-text">🔍 Checking all locations…</div>
            <div id="notif-section" style="display:none">
                <button type="button" id="notif-trigger" class="notif-trigger">
                    🔔 Get notified when it changes <span class="notif-arrow">▾</span>
                </button>
                <div id="notif-form" class="notif-form" style="display:none">
                    <form id="subscribe-form">
                        <div class="notif-form-row">
                            <input type="email" id="subscribe-email" class="notif-input"
                                placeholder="your@email.com" required autocomplete="email">
                            <button type="submit" class="notif-btn" id="subscribe-btn">Notify Me!</button>
                        </div>
                        <p class="notif-hint">We'll email when <span id="notif-flavor">this flavor</span> is spotted.</p>
                        <details class="location-checkboxes">
                            <summary>Filter by location (optional)</summary>
                            <div class="checkbox-grid" id="location-checkboxes"></div>
                        </details>
                    </form>
                    <div id="subscribe-message" class="subscribe-message"></div>
                </div>
            </div>
        </div>

        <div id="loc-grid" class="results-grid">
            <a href="https://sweetcow.com/south-boulder/" target="_blank" class="result-card-link" data-slug="south-boulder">
                <div class="result-card loading">
                    <div class="location-name">South Boulder</div>
                    <div class="location-address">669 South Broadway, Boulder</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/north-boulder/" target="_blank" class="result-card-link" data-slug="north-boulder">
                <div class="result-card loading">
                    <div class="location-name">North Boulder</div>
                    <div class="location-address">2628 Broadway, Boulder</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/louisville/" target="_blank" class="result-card-link" data-slug="louisville">
                <div class="result-card loading">
                    <div class="location-name">Louisville</div>
                    <div class="location-address">637 Front Street, Louisville</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/longmont/" target="_blank" class="result-card-link" data-slug="longmont">
                <div class="result-card loading">
                    <div class="location-name">Longmont</div>
                    <div class="location-address">600 Longs Peak Ave, Longmont</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/highlands/" target="_blank" class="result-card-link" data-slug="highlands">
                <div class="result-card loading">
                    <div class="location-name">Highlands</div>
                    <div class="location-address">3475 West 32nd Ave, Denver</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/stanley-marketplace/" target="_blank" class="result-card-link" data-slug="stanley-marketplace">
                <div class="result-card loading">
                    <div class="location-name">Stanley Marketplace</div>
                    <div class="location-address">2501 Dallas Street, Aurora</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
            <a href="https://sweetcow.com/denver-platt-park/" target="_blank" class="result-card-link" data-slug="platt-park">
                <div class="result-card loading">
                    <div class="location-name">Platt Park</div>
                    <div class="location-address">1882 South Pearl St, Denver</div>
                    <span class="status loading">⟳ Loading</span>
                </div>
            </a>
        </div>
    </div>

    <script src="/public/app.js" type="module"></script>
    <footer style="text-align:center;font-size:12px;color:#999;padding:24px 0">
      Built with 🍦 by <a href="https://jelinson.com" style="color:#999">jelinson</a> &middot;
      <a href="https://github.com/jelinson/big-g-finder" style="color:#999">GitHub</a>
    </footer>
</body>
```

- [ ] **Step 2: Verify HTML renders in browser**

Run `vercel dev` and open `http://localhost:3000`. Confirm:
- 7 location name cards visible immediately with "⟳ Loading" status
- No JavaScript errors in console
- Flavor pill shows "Loading…" (API hasn't responded yet in static view)

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: static location cards with loading state in HTML"
```

---

## Task 2: Update `public/style.css`

**Files:**
- Modify: `public/style.css`

Add styles for the new elements; remove the old `.subscribe-section` / `.subscribe-card` block.

- [ ] **Step 1: Add loading card state styles**

Add after the existing `.result-card.not-found` rule:

```css
.result-card.loading {
    opacity: 0.65;
}

.status.loading {
    background: rgba(184, 230, 213, 0.4);
    color: var(--chocolate);
    opacity: 0.7;
    font-size: 0.9rem;
}
```

- [ ] **Step 2: Add pill flavor row styles**

Add after the existing `.flavor-select` block:

```css
.flavor-pill {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.6);
    border: 2px solid var(--mint);
    border-radius: 50px;
    padding: 10px 20px;
    margin-bottom: 20px;
    transition: border-color 0.2s;
    position: relative;
    z-index: 1;
}

.flavor-pill:focus-within {
    border-color: var(--cherry);
    box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.15);
}

.flavor-pill-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--chocolate);
    opacity: 0.65;
    flex-shrink: 0;
}

.flavor-select-inline {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--chocolate);
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%233D2817' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 4px center;
    padding-right: 28px;
}
```

- [ ] **Step 3: Add summary card + disclosure styles**

Add after the `.summary` block:

```css
.summary-card {
    background: white;
    border-radius: 25px;
    padding: 20px 25px;
    box-shadow: 0 10px 40px rgba(61, 40, 23, 0.1);
    margin-bottom: 30px;
    animation: fadeInUp 0.6s ease;
}

.summary-text {
    font-family: 'Fredoka', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--chocolate);
}

.notif-trigger {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    background: none;
    border: none;
    padding: 0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--cherry);
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
    text-underline-offset: 2px;
}

.notif-trigger:hover { opacity: 0.8; }

.notif-arrow { font-size: 0.65rem; transition: transform 0.2s; }
.notif-trigger.open .notif-arrow { transform: rotate(180deg); }

.notif-form {
    margin-top: 12px;
    background: rgba(184, 230, 213, 0.15);
    border: 1.5px solid rgba(184, 230, 213, 0.7);
    border-radius: 16px;
    padding: 14px 16px;
}

.notif-form-row {
    display: flex;
    align-items: center;
    gap: 10px;
}

.notif-input {
    flex: 1;
    min-width: 0;
    padding: 10px 18px;
    font-size: 0.9rem;
    font-family: 'DM Sans', sans-serif;
    color: var(--chocolate);
    background: rgba(255, 255, 255, 0.8);
    border: 2px solid var(--mint);
    border-radius: 50px;
    transition: border-color 0.2s;
}

.notif-input:focus {
    outline: none;
    border-color: var(--cherry);
    box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.15);
}

.notif-btn {
    background: linear-gradient(135deg, var(--cherry) 0%, var(--caramel) 100%);
    color: white;
    border: none;
    padding: 10px 24px;
    font-size: 0.95rem;
    font-weight: 700;
    font-family: 'Fredoka', sans-serif;
    border-radius: 50px;
    cursor: pointer;
    flex-shrink: 0;
    box-shadow: 0 4px 15px rgba(255, 107, 157, 0.35);
    transition: all 0.2s ease;
}

.notif-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 107, 157, 0.5);
}

.notif-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }

.notif-hint {
    font-size: 0.8rem;
    color: var(--chocolate);
    opacity: 0.55;
    text-align: center;
    margin-top: 8px;
}
```

- [ ] **Step 4: Remove old `.subscribe-section` / `.subscribe-card` styles**

Delete the entire block from `/* ── Subscription banner & form ─────────────────────────────── */` down through `.subscribe-hint { ... }`. Keep `.subscribed-banner`, `.banner-close`, `.flavor-pill` (existing), `.subscribe-hint`, `.location-checkboxes`, `.checkbox-grid`, `.checkbox-label`, and `.subscribe-message` as they are still used.

Actually: keep `.subscribe-message`, `.location-checkboxes`, `.checkbox-grid`, `.checkbox-label`. Remove only:
- `.subscribe-section`
- `.subscribe-card`
- `.subscribe-card h2`
- `.subscribe-description`
- `.subscribe-field`
- `.subscribe-input` (replaced by `.notif-input`)
- `.subscribe-button` (replaced by `.notif-btn`)

- [ ] **Step 5: Commit**

```bash
git add public/style.css
git commit -m "feat: add pill flavor row, summary card, and disclosure styles"
```

---

## Task 3: Update test scaffolds to new HTML structure

**Files:**
- Modify: `tests/subscribe.form.test.js`
- Modify: `tests/flavor.select.test.js`

Both tests hardcode `document.body.innerHTML` to simulate the page. They must be updated to match the new HTML structure from Task 1 before `app.js` is changed — the tests will then fail, proving the old `app.js` doesn't work with the new structure. Then Task 4 makes them pass.

- [ ] **Step 1: Update `tests/subscribe.form.test.js` scaffold**

Replace the `document.body.innerHTML = \`...\`` block in `beforeAll` with:

```js
document.body.innerHTML = `
  <div class="container">
    <div class="flavor-pill">
      <select id="flavorSelect"></select>
    </div>
    <div id="results"></div>
    <div id="loc-summary">
      <div id="loc-summary-text">🔍 Checking all locations…</div>
      <div id="notif-section" style="display:none">
        <button type="button" id="notif-trigger">🔔 Get notified</button>
        <div id="notif-form" style="display:none">
          <form id="subscribe-form">
            <input type="email" id="subscribe-email">
            <span id="notif-flavor"></span>
            <div id="location-checkboxes"></div>
            <button type="submit" id="subscribe-btn">Notify Me!</button>
          </form>
          <div id="subscribe-message"></div>
        </div>
      </div>
    </div>
    <div id="loc-grid">
      <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
        <div class="result-card loading">
          <span class="status loading">⟳ Loading</span>
        </div>
      </a>
    </div>
  </div>
`;
```

- [ ] **Step 2: Update `tests/flavor.select.test.js` scaffold**

Replace the `document.body.innerHTML` block in `beforeAll` with:

```js
document.body.innerHTML = `
  <div class="container">
    <div class="flavor-pill">
      <select id="flavorSelect"></select>
    </div>
    <div id="results"></div>
    <div id="loc-summary">
      <div id="loc-summary-text">🔍 Checking all locations…</div>
      <div id="notif-section" style="display:none">
        <button type="button" id="notif-trigger">🔔 Get notified</button>
        <div id="notif-form" style="display:none">
          <form id="subscribe-form">
            <input type="email" id="subscribe-email">
            <span id="notif-flavor"></span>
            <div id="location-checkboxes"></div>
            <button type="submit" id="subscribe-btn">Notify Me!</button>
          </form>
          <div id="subscribe-message"></div>
        </div>
      </div>
    </div>
    <div id="loc-grid">
      <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
        <div class="result-card loading">
          <div class="location-name">Pearl St</div>
          <div class="location-address">1100 Pearl St</div>
          <span class="status loading">⟳ Loading</span>
        </div>
      </a>
      <a href="https://sweetcow.com/table-mesa/" target="_blank" data-slug="table-mesa">
        <div class="result-card loading">
          <div class="location-name">Table Mesa</div>
          <div class="location-address">700 Table Mesa Dr</div>
          <span class="status loading">⟳ Loading</span>
        </div>
      </a>
    </div>
  </div>
`;
```

Also update the `waitFor` assertion that checks `#results` is non-empty — replace with:

```js
await vi.waitFor(() =>
  expect(document.querySelector('[data-slug="pearl-st"] .result-card').classList.contains('loading')).toBe(false)
);
```

- [ ] **Step 3: Update `flavor.select.test.js` assertions**

Update the three test assertions to use the new selectors:

```js
// "renders initial results correctly for Big Gs"
it('renders initial results correctly for Big Gs', async () => {
  await vi.waitFor(() => {
    const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
    const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
    expect(pearl.classList.contains('found')).toBe(true);
    expect(mesa.classList.contains('not-found')).toBe(true);
  });
});

// "updates location cards when flavor is changed via the visible dropdown"
it('updates location cards when flavor is changed via the visible dropdown', async () => {
  const select = document.getElementById('flavorSelect');
  select.value = 'Chocolate Chip';
  select.dispatchEvent(new Event('change'));

  await vi.waitFor(() => {
    const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
    const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
    expect(pearl.classList.contains('found')).toBe(true);
    expect(mesa.classList.contains('found')).toBe(true);
  });
});

// "updates the subscribe flavor display when flavor changes"
it('updates the subscribe flavor display when flavor changes', async () => {
  const display = document.getElementById('notif-flavor');
  expect(display.textContent).toBe('Chocolate Chip');
});

// "updates location cards when switching back to Big Gs"
it('updates location cards when switching back to Big Gs', async () => {
  const select = document.getElementById('flavorSelect');
  const bigGsOption = Array.from(select.options).find(o => o.textContent.includes('⭐'));
  select.value = bigGsOption.value;
  select.dispatchEvent(new Event('change'));

  await vi.waitFor(() => {
    const pearl = document.querySelector('[data-slug="pearl-st"] .result-card');
    const mesa = document.querySelector('[data-slug="table-mesa"] .result-card');
    expect(pearl.classList.contains('found')).toBe(true);
    expect(mesa.classList.contains('not-found')).toBe(true);
  });
});
```

- [ ] **Step 4: Run tests — confirm they fail**

```bash
npm test -- tests/subscribe.form.test.js tests/flavor.select.test.js
```

Expected: FAIL (app.js still uses old DOM structure)

- [ ] **Step 5: Commit updated tests**

```bash
git add tests/subscribe.form.test.js tests/flavor.select.test.js
git commit -m "test: update scaffolds to new HTML structure (failing)"
```

---

## Task 4: Rewrite `public/app.js`

**Files:**
- Modify: `public/app.js`

Replace the entire file. Key changes from current version:
- `fetchAllLocations`: hydrates static `[data-slug]` cards instead of building innerHTML
- `displayResults`: updates cards in place instead of replacing `#results`
- `showSubscribeSection`: updates `#notif-flavor` and shows `#notif-section`
- Single `#flavorSelect` with a direct `change` listener — no `selectFlavorFromVisible` / `#flavorSelectVisible`
- New `initDisclosureTrigger()` for the notification form toggle
- New `appendNewCard()` for locations returned by API that have no matching static card

- [ ] **Step 1: Write new `public/app.js`**

```js
import { sortLocationResults } from '../lib/sort.js';

// Inline HTML escaper — browser modules can't resolve bare 'he' specifier
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

function safeUrl(url) {
    try {
        const u = new URL(url);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? url : '#';
    } catch { return '#'; }
}

let allLocationData = [];
let currentSearchFlavor = '';
let requestedFlavor = null;

function normalizeFlavorName(name) {
    return name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/big\s*g[''']?s?/i, 'bigg')
        .replace(/gigantic[''']?s?/i, 'gigantic')
        .replace(/cookie[s]?/i, 'cookie')
        .replace(/dream[s]?/i, 'dream');
}

function isTargetFlavor(flavorName, targetFlavor) {
    if (!targetFlavor) {
        const normalized = normalizeFlavorName(flavorName);
        const patterns = [
            'biggcookiedream',
            'biggigcookiedream',
            'giganticcookiedream',
            'biggiganticcookiedream'
        ];
        return patterns.some(pattern => normalized.includes(pattern) ||
               (normalized.includes('bigg') && normalized.includes('cookie') && normalized.includes('dream')));
    } else {
        return normalizeFlavorName(flavorName) === normalizeFlavorName(targetFlavor);
    }
}

// ── Hydration helpers ──────────────────────────────────────────

function hydrateCard(slug, result, targetFlavor) {
    const link = document.querySelector(`[data-slug="${slug}"]`);
    if (!link) return;
    const card = link.querySelector('.result-card');
    const status = link.querySelector('.status');
    if (!card || !status) return;

    card.classList.remove('loading', 'found', 'not-found');
    card.classList.add(result.found ? 'found' : 'not-found');
    status.className = `status ${result.found ? 'found' : 'not-found'}`;
    status.textContent = result.found ? '✓ Available' : '✗ Not Available';

    const fragment = result.found ? `#:~:text=${encodeURIComponent(targetFlavor)}` : '';
    link.href = safeUrl(result.url + fragment);
}

function appendNewCard(loc, targetFlavor) {
    const grid = document.getElementById('loc-grid');
    if (!grid) return;
    const found = loc.flavors.some(f => normalizeFlavorName(f) === normalizeFlavorName(targetFlavor));
    const link = document.createElement('a');
    link.href = safeUrl(loc.url + (found ? `#:~:text=${encodeURIComponent(targetFlavor)}` : ''));
    link.target = '_blank';
    link.className = 'result-card-link';
    link.dataset.slug = loc.slug;
    link.innerHTML = `
        <div class="result-card ${found ? 'found' : 'not-found'}">
            <div class="location-name">${escapeHtml(loc.name)}</div>
            <div class="location-address">${escapeHtml(loc.address ?? '')}</div>
            <span class="status ${found ? 'found' : 'not-found'}">${found ? '✓ Available' : '✗ Not Available'}</span>
        </div>
    `;
    grid.appendChild(link);
}

function reorderGrid(sorted) {
    const grid = document.getElementById('loc-grid');
    if (!grid) return;
    sorted.forEach(result => {
        const el = document.querySelector(`[data-slug="${result.slug}"]`);
        if (el) grid.appendChild(el);
    });
}

function updateSummary(foundCount, targetFlavor, isBigGs) {
    const textEl = document.getElementById('loc-summary-text');
    if (!textEl) return;
    if (foundCount > 0) {
        const label = isBigGs
            ? `Found at ${foundCount} location${foundCount > 1 ? 's' : ''}!`
            : `${escapeHtml(targetFlavor)} found at ${foundCount} location${foundCount > 1 ? 's' : ''}!`;
        textEl.innerHTML = `<span class="emoji">🎉</span> ${label}`;
    } else {
        const label = isBigGs
            ? "Big G's Cookies & Dream is not currently available at any location"
            : `${escapeHtml(targetFlavor)} is not currently available at any location`;
        textEl.innerHTML = `<span class="emoji">😢</span> ${label}`;
    }
}

function showSubscribeSection(flavor) {
    const section = document.getElementById('notif-section');
    const flavorEl = document.getElementById('notif-flavor');
    if (section) section.style.display = 'block';
    if (flavorEl) flavorEl.textContent = flavor;
}

function initDisclosureTrigger() {
    const trigger = document.getElementById('notif-trigger');
    const form = document.getElementById('notif-form');
    if (!trigger || !form) return;
    trigger.addEventListener('click', () => {
        const isOpen = form.style.display !== 'none';
        form.style.display = isOpen ? 'none' : 'block';
        trigger.classList.toggle('open', !isOpen);
    });
}

// ── Core data logic ────────────────────────────────────────────

async function fetchAllLocations() {
    try {
        const data = await fetch('/api/flavors').then(r => {
            if (!r.ok) throw new Error(`API error ${r.status}`);
            return r.json();
        });

        allLocationData = data.locations.map(loc => ({
            location: loc.name,
            address: loc.address,
            url: loc.url,
            slug: loc.slug,
            flavors: loc.flavors,
            error: false,
        }));

        // Build list of all unique flavors
        const allFlavorsSet = new Set();
        const invalidPatterns = [/^#/, /sweetcow/i, /today'?s?\s+flavor/i, /direction/i, /^$/];
        allLocationData.forEach(locationData => {
            locationData.flavors.forEach(flavor => {
                if (flavor && flavor.length > 3) {
                    const isInvalid = invalidPatterns.some(p => p.test(flavor));
                    if (!isInvalid) allFlavorsSet.add(flavor);
                }
            });
        });

        const allFlavors = Array.from(allFlavorsSet).sort();
        const bigGsFlavor = allFlavors.find(f => isTargetFlavor(f, null));

        // Populate #flavorSelect
        const select = document.getElementById('flavorSelect');
        select.innerHTML = '';

        const starFlavor = bigGsFlavor ?? "Big G's Cookies & Dream";
        const starOption = document.createElement('option');
        starOption.value = bigGsFlavor ?? starFlavor;
        starOption.textContent = `${starFlavor} ⭐`;
        starOption.selected = true;
        select.appendChild(starOption);
        currentSearchFlavor = starFlavor;

        allFlavors.forEach(flavor => {
            if (flavor !== bigGsFlavor) {
                const option = document.createElement('option');
                option.value = flavor;
                option.textContent = flavor;
                select.appendChild(option);
            }
        });

        // Build location checkboxes
        const checkboxGrid = document.getElementById('location-checkboxes');
        if (checkboxGrid) {
            allLocationData.forEach(loc => {
                const label = document.createElement('label');
                label.className = 'checkbox-label';
                label.innerHTML = `<input type="checkbox" name="location" value="${escapeHtml(loc.slug)}"> ${escapeHtml(loc.location)}`;
                checkboxGrid.appendChild(label);
            });
        }

        if (requestedFlavor) {
            const matched = allFlavors.find(f => normalizeFlavorName(f) === normalizeFlavorName(requestedFlavor));
            if (matched) {
                select.value = matched;
                currentSearchFlavor = matched;
                displayResults(matched);
                return;
            }
        }

        displayResults(bigGsFlavor ?? "Big G's Cookies & Dream");

    } catch (error) {
        console.error('Error loading flavors:', error);
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            const errorText = document.createTextNode(error.message);
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            errorDiv.innerHTML = 'Oops! Something went wrong while loading flavors. Please refresh the page.<br><br>Error: ';
            errorDiv.appendChild(errorText);
            resultsDiv.innerHTML = '';
            resultsDiv.appendChild(errorDiv);
        }
    }
}

function displayResults(targetFlavor) {
    const isBigGs = isTargetFlavor(targetFlavor, null) || targetFlavor === "Big G's Cookies & Dream";
    currentSearchFlavor = targetFlavor;

    const results = allLocationData.map(locationData => ({
        location: locationData.location,
        address: locationData.address,
        url: locationData.url,
        slug: locationData.slug,
        found: locationData.flavors.some(f => normalizeFlavorName(f) === normalizeFlavorName(targetFlavor)),
        error: locationData.error,
    }));

    const sorted = sortLocationResults(results);
    const foundCount = sorted.filter(r => r.found).length;

    // Hydrate static cards or append new ones
    sorted.forEach(result => {
        const existing = document.querySelector(`[data-slug="${result.slug}"]`);
        if (existing) {
            hydrateCard(result.slug, result, targetFlavor);
        } else {
            // Location from API not in static HTML — append it
            const loc = allLocationData.find(l => l.slug === result.slug);
            if (loc) appendNewCard(loc, targetFlavor);
        }
    });

    // Reorder grid: found first
    reorderGrid(sorted);

    updateSummary(foundCount, targetFlavor, isBigGs);
    showSubscribeSection(targetFlavor);
}

async function submitSubscription(event) {
    event.preventDefault();
    const btn = document.getElementById('subscribe-btn');
    const msgEl = document.getElementById('subscribe-message');
    const email = document.getElementById('subscribe-email').value.trim();
    const flavorPattern = currentSearchFlavor;

    const checkedBoxes = document.querySelectorAll('#location-checkboxes input[type=checkbox]:checked');
    const locations = Array.from(checkedBoxes).map(cb => cb.value);

    btn.disabled = true;
    btn.textContent = 'Sending...';
    msgEl.textContent = '';
    msgEl.className = 'subscribe-message';

    try {
        const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, flavorPattern, locations }),
        });
        const data = await res.json();
        if (res.ok) {
            msgEl.textContent = 'Check your email to confirm your subscription!';
            msgEl.className = 'subscribe-message success';
            document.getElementById('subscribe-form').reset();
        } else {
            throw new Error(data.error || 'Subscription failed');
        }
    } catch (err) {
        msgEl.textContent = `Error: ${err.message}`;
        msgEl.className = 'subscribe-message error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Notify Me!';
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(location.search);
    if (params.get('subscribed') === '1') {
        const banner = document.createElement('div');
        banner.className = 'subscribed-banner';
        banner.innerHTML = '✓ You\'re confirmed! We\'ll notify you when your flavor is spotted. <button class="banner-close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>';
        document.querySelector('.container').prepend(banner);
        history.replaceState(null, '', '/');
    }
    requestedFlavor = params.get('flavor') || null;

    initDisclosureTrigger();
    fetchAllLocations();

    const form = document.getElementById('subscribe-form');
    if (form) form.addEventListener('submit', submitSubscription);

    const select = document.getElementById('flavorSelect');
    if (select) select.addEventListener('change', () => {
        currentSearchFlavor = select.value;
        displayResults(select.value);
    });
});
```

- [ ] **Step 2: Run updated tests — confirm they pass**

```bash
npm test -- tests/subscribe.form.test.js tests/flavor.select.test.js
```

Expected: PASS

- [ ] **Step 3: Run full test suite — confirm no regressions**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add public/app.js
git commit -m "feat: hydrate static cards in-place, inline subscribe disclosure"
```

---

## Task 5: TDD — Disclosure toggle

**Files:**
- Create: `tests/disclosure.test.js`

- [ ] **Step 1: Write failing test**

Create `tests/disclosure.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

const FLAVORS_RESPONSE = {
  locations: [{
    name: 'Pearl St', address: '1100 Pearl St', url: 'https://sweetcow.com/pearl-st',
    slug: 'pearl-st', flavors: ["Big G's Cookies & Dream"],
  }],
};

beforeAll(async () => {
  document.body.innerHTML = `
    <div class="container">
      <div class="flavor-pill"><select id="flavorSelect"></select></div>
      <div id="results"></div>
      <div id="loc-summary">
        <div id="loc-summary-text">🔍 Checking all locations…</div>
        <div id="notif-section" style="display:none">
          <button type="button" id="notif-trigger">🔔 Get notified</button>
          <div id="notif-form" style="display:none">
            <form id="subscribe-form">
              <input type="email" id="subscribe-email">
              <span id="notif-flavor"></span>
              <div id="location-checkboxes"></div>
              <button type="submit" id="subscribe-btn">Notify Me!</button>
            </form>
            <div id="subscribe-message"></div>
          </div>
        </div>
      </div>
      <div id="loc-grid">
        <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
          <div class="result-card loading">
            <span class="status loading">⟳ Loading</span>
          </div>
        </a>
      </div>
    </div>
  `;

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(FLAVORS_RESPONSE),
  });

  await import('../public/app.js');
  window.dispatchEvent(new Event('DOMContentLoaded'));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/flavors'));
  // Wait for hydration
  await vi.waitFor(() =>
    expect(document.getElementById('notif-section').style.display).not.toBe('none')
  );
});

describe('notification disclosure', () => {
  it('form is hidden by default', () => {
    expect(document.getElementById('notif-form').style.display).toBe('none');
  });

  it('clicking trigger opens the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').style.display).toBe('block');
  });

  it('trigger gets .open class when open', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(true);
  });

  it('clicking trigger again closes the form', () => {
    document.getElementById('notif-trigger').click();
    expect(document.getElementById('notif-form').style.display).toBe('none');
  });

  it('trigger loses .open class when closed', () => {
    expect(document.getElementById('notif-trigger').classList.contains('open')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — confirm it passes** (disclosure logic is already in app.js from Task 4)

```bash
npm test -- tests/disclosure.test.js
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add tests/disclosure.test.js
git commit -m "test: disclosure toggle behavior"
```

---

## Task 6: TDD — Dynamic location append

**Files:**
- Create: `tests/dynamic.append.test.js`

- [ ] **Step 1: Write failing test**

Create `tests/dynamic.append.test.js`:

```js
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

// API returns "table-mesa" which is NOT in the static HTML
const FLAVORS_RESPONSE = {
  locations: [
    {
      name: 'Pearl St', address: '1100 Pearl St', url: 'https://sweetcow.com/pearl-st',
      slug: 'pearl-st', flavors: ["Big G's Cookies & Dream"],
    },
    {
      name: 'Table Mesa', address: '700 Table Mesa Dr', url: 'https://sweetcow.com/table-mesa',
      slug: 'table-mesa', flavors: [],
    },
  ],
};

beforeAll(async () => {
  // Only pearl-st is in static HTML — table-mesa is not
  document.body.innerHTML = `
    <div class="container">
      <div class="flavor-pill"><select id="flavorSelect"></select></div>
      <div id="results"></div>
      <div id="loc-summary">
        <div id="loc-summary-text">🔍 Checking all locations…</div>
        <div id="notif-section" style="display:none">
          <button type="button" id="notif-trigger">🔔 Get notified</button>
          <div id="notif-form" style="display:none">
            <form id="subscribe-form">
              <input type="email" id="subscribe-email">
              <span id="notif-flavor"></span>
              <div id="location-checkboxes"></div>
              <button type="submit" id="subscribe-btn">Notify Me!</button>
            </form>
            <div id="subscribe-message"></div>
          </div>
        </div>
      </div>
      <div id="loc-grid">
        <a href="https://sweetcow.com/pearl-st/" target="_blank" data-slug="pearl-st">
          <div class="result-card loading">
            <div class="location-name">Pearl St</div>
            <span class="status loading">⟳ Loading</span>
          </div>
        </a>
      </div>
    </div>
  `;

  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(FLAVORS_RESPONSE),
  });

  await import('../public/app.js');
  window.dispatchEvent(new Event('DOMContentLoaded'));
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith('/api/flavors'));
  await vi.waitFor(() =>
    expect(document.querySelector('[data-slug="pearl-st"] .result-card').classList.contains('loading')).toBe(false)
  );
});

describe('dynamic location append', () => {
  it('appends a card for a location not in static HTML', () => {
    const appended = document.querySelector('[data-slug="table-mesa"]');
    expect(appended).not.toBeNull();
  });

  it('appended card shows the correct location name', () => {
    const name = document.querySelector('[data-slug="table-mesa"] .location-name');
    expect(name.textContent).toBe('Table Mesa');
  });

  it('appended card reflects correct found/not-found state', () => {
    const card = document.querySelector('[data-slug="table-mesa"] .result-card');
    expect(card.classList.contains('not-found')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test — confirm it passes**

```bash
npm test -- tests/dynamic.append.test.js
```

Expected: PASS

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all tests pass

- [ ] **Step 4: Commit**

```bash
git add tests/dynamic.append.test.js
git commit -m "test: dynamic location card append for unknown slugs"
```

---

## Task 7: Final verification

- [ ] **Step 1: Run full test suite one more time**

```bash
npm test
```

Expected: all tests pass, no failures

- [ ] **Step 2: Smoke test in browser**

Run `vercel dev` and open `http://localhost:3000`. Verify:
1. All 7 location names visible immediately with "⟳ Loading" status badges
2. After ~1-2s, cards update to "✓ Available" / "✗ Not Available" with found cards first
3. Summary card appears with found count
4. "🔔 Get notified when it changes" trigger appears under summary
5. Clicking trigger opens the form; clicking again closes it
6. Flavor pill "Flavor:" shows correct selected flavor
7. Changing flavor in the dropdown updates all cards and summary
8. Hint text inside the form updates to show the selected flavor name
9. Subscribe form posts to `/api/subscribe` on submit (check Network tab)
10. `?subscribed=1` banner still appears when visiting with that param

- [ ] **Step 3: Final commit**

```bash
git add index.html public/style.css public/app.js tests/
git commit -m "feat: frontend redesign — static cards, inline subscribe disclosure"
```

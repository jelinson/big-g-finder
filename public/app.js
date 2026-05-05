import { sortLocationResults } from '../lib/sort.js';
import { normalizeFlavorName, isBigGsFlavor, isValidFlavor, BIG_GS_DISPLAY_NAME } from '../lib/normalize.js';

// Inline HTML escaper — bare specifiers can't be resolved in browser ES modules without a bundler
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// Defense-in-depth http(s) allowlist — rejects javascript:, data:, etc. URLs
function safeUrl(url) {
    try {
        const u = new URL(url);
        return (u.protocol === 'https:' || u.protocol === 'http:') ? url : '#';
    } catch { return '#'; }
}

// CSS.escape polyfill for environments that lack it (e.g. jsdom)
const cssEscape = typeof CSS !== 'undefined' && CSS.escape
    ? CSS.escape
    : s => s.replace(/([^\w-])/g, '\\$1');

const STATUS_FOUND = 'found';
const STATUS_NOT_FOUND = 'not-found';
const STATUS_LOADING = 'loading';

let allLocationData = [];

// ── Hydration helpers ──────────────────────────────────────────

function buildFragment(found, flavor) {
    const target = found ? flavor : "Today's Flavors";
    return '#:~:text=' + encodeURIComponent(target);
}

function hydrateCard(slug, result, targetFlavor) {
    const link = document.querySelector(`[data-slug="${cssEscape(slug)}"]`);
    if (!link) return;
    const card = link.querySelector('.result-card');
    const status = link.querySelector('.status');
    if (!card || !status) return;

    card.classList.remove(STATUS_LOADING, STATUS_FOUND, STATUS_NOT_FOUND);
    card.classList.add(result.found ? STATUS_FOUND : STATUS_NOT_FOUND);
    status.classList.remove(STATUS_LOADING, STATUS_FOUND, STATUS_NOT_FOUND);
    status.classList.add(result.found ? STATUS_FOUND : STATUS_NOT_FOUND);
    status.textContent = result.found ? '✓ Available' : '✗ Not Available';

    link.href = safeUrl(result.url + buildFragment(result.found, targetFlavor));
}

function appendNewCard(result, targetFlavor) {
    const grid = document.getElementById('loc-grid');
    if (!grid) return;
    if (document.querySelector(`[data-slug="${cssEscape(result.slug)}"]`)) return;
    const link = document.createElement('a');
    link.target = '_blank';
    link.className = 'result-card-link';
    link.dataset.slug = result.slug;
    const cardDiv = document.createElement('div');
    cardDiv.className = `result-card ${STATUS_LOADING}`;
    const nameDiv = document.createElement('div');
    nameDiv.className = 'location-name';
    nameDiv.textContent = result.location;
    const addrDiv = document.createElement('div');
    addrDiv.className = 'location-address';
    addrDiv.textContent = result.address ?? '';
    const statusSpan = document.createElement('span');
    statusSpan.className = `status ${STATUS_LOADING}`;
    const dots = document.createElement('span');
    dots.className = 'loading-dots';
    dots.innerHTML = '<span>🍦</span><span>🍦</span><span>🍦</span>';
    statusSpan.appendChild(dots);
    cardDiv.appendChild(nameDiv);
    cardDiv.appendChild(addrDiv);
    cardDiv.appendChild(statusSpan);
    link.appendChild(cardDiv);
    grid.appendChild(link);
    hydrateCard(result.slug, result, targetFlavor);
}

function reorderGrid(sorted) {
    const grid = document.getElementById('loc-grid');
    if (!grid) return;
    sorted.forEach(result => {
        const el = document.querySelector(`[data-slug="${cssEscape(result.slug)}"]`);
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
    // Hidden in CSS until the flavor name is known, to avoid layout shift.
    if (section) section.classList.remove('hidden');
    if (flavorEl) flavorEl.textContent = flavor;
}

// ── Disclosure / dialog wiring ─────────────────────────────────

function wireDisclosure(triggerId, panelId) {
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    if (!trigger || !panel) return;
    trigger.addEventListener('click', () => {
        const isOpen = panel.classList.contains('open');
        panel.classList.toggle('open', !isOpen);
        trigger.classList.toggle('open', !isOpen);
        trigger.classList.toggle('active', !isOpen);
    });
}

function initNotificationDialog() {
    wireDisclosure('notif-trigger', 'notif-form');
    wireDisclosure('location-filter-btn', 'location-filter-panel');
}

// ── Location checkboxes ────────────────────────────────────────

// Grid is populated with the full API location set, so newly-discovered
// locations appear automatically without any code changes here.
function initLocationCheckboxes(grid, locations) {
    if (!grid) return;

    locations.forEach(loc => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.name = 'location';
        cb.value = loc.slug;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + loc.location));
        grid.appendChild(label);
    });

    // Mutual exclusion: picking a specific location unchecks "All", checking "All" clears specifics
    grid.addEventListener('change', e => {
        const allBox = document.getElementById('loc-all-checkbox');
        if (!allBox) return;
        if (e.target === allBox) {
            if (allBox.checked) {
                grid.querySelectorAll('input[type=checkbox]:not(#loc-all-checkbox)').forEach(cb => { cb.checked = false; });
            }
        } else {
            if (e.target.checked) allBox.checked = false;
            const anyChecked = Array.from(grid.querySelectorAll('input[type=checkbox]:not(#loc-all-checkbox)')).some(cb => cb.checked);
            if (!anyChecked) allBox.checked = true;
        }
    });
}

// ── Core data logic ────────────────────────────────────────────

async function fetchAllLocations() {
    try {
        const earlyPromise = window.__flavorsPromise;
        delete window.__flavorsPromise;
        const data = await (earlyPromise || fetch('/api/flavors').then(r => {
            if (!r.ok) throw new Error(`API error ${r.status}`);
            return r.json();
        }));

        allLocationData = data.locations.map(loc => ({
            location: loc.name,
            address: loc.address,
            url: loc.url,
            slug: loc.slug,
            flavors: loc.flavors,
            error: false,
        }));

        // Build list of all unique valid flavors
        const allFlavorsSet = new Set();
        allLocationData.forEach(locationData => {
            locationData.flavors.forEach(flavor => {
                if (isValidFlavor(flavor)) allFlavorsSet.add(flavor);
            });
        });

        const allFlavors = Array.from(allFlavorsSet).sort();
        const bigGsFlavor = allFlavors.find(f => isBigGsFlavor(f));

        // Populate #flavorSelect
        const select = document.getElementById('flavorSelect');
        select.innerHTML = '';

        // Always render star option text as BIG_GS_DISPLAY_NAME to eliminate
        // static-vs-hydrated flicker; the value uses the API's exact name for matching.
        const starOption = document.createElement('option');
        starOption.value = bigGsFlavor ?? BIG_GS_DISPLAY_NAME;
        starOption.textContent = `${BIG_GS_DISPLAY_NAME} ⭐`;
        starOption.selected = true;
        select.appendChild(starOption);

        allFlavors.forEach(flavor => {
            if (flavor !== bigGsFlavor) {
                const option = document.createElement('option');
                option.value = flavor;
                option.textContent = flavor;
                select.appendChild(option);
            }
        });

        // Build location checkboxes (the "All locations" label lives in static HTML)
        const checkboxGrid = document.getElementById('location-checkboxes');
        initLocationCheckboxes(checkboxGrid, allLocationData);

        // Determine which flavor to display
        const requestedFlavor = new URLSearchParams(location.search).get('flavor');
        const matched = requestedFlavor
            ? allFlavors.find(f => normalizeFlavorName(f) === normalizeFlavorName(requestedFlavor))
            : null;
        const finalFlavor = matched ?? bigGsFlavor ?? BIG_GS_DISPLAY_NAME;

        // Show a banner when the requested flavor isn't on any menu today
        if (requestedFlavor && !matched) {
            const banner = document.createElement('div');
            banner.className = 'flavor-not-found-banner';
            const msg = document.createTextNode(`${requestedFlavor} isn't on any menu today — showing Big G's instead. `);
            const closeBtn = document.createElement('button');
            closeBtn.className = 'banner-close';
            closeBtn.setAttribute('aria-label', 'Dismiss');
            closeBtn.textContent = '×';
            closeBtn.addEventListener('click', () => banner.remove());
            banner.appendChild(msg);
            banner.appendChild(closeBtn);
            document.querySelector('.container').prepend(banner);
        }

        select.value = finalFlavor;
        displayResults(finalFlavor);

    } catch (error) {
        console.error('Error loading flavors:', error);
        const resultsDiv = document.getElementById('results');
        if (resultsDiv) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error';
            const errorMsg = document.createTextNode('Oops! Something went wrong while loading flavors. Please refresh the page.');
            const errorDetail = document.createTextNode(' Error: ' + error.message);
            errorDiv.appendChild(errorMsg);
            errorDiv.appendChild(document.createElement('br'));
            errorDiv.appendChild(document.createElement('br'));
            errorDiv.appendChild(errorDetail);
            resultsDiv.textContent = '';
            resultsDiv.appendChild(errorDiv);
        }
    }
}

function displayResults(targetFlavor) {
    const isBigGs = isBigGsFlavor(targetFlavor);

    const results = allLocationData.map(l => ({
        ...l,
        found: l.flavors.some(f => normalizeFlavorName(f) === normalizeFlavorName(targetFlavor)),
    }));

    const foundCount = results.filter(r => r.found).length;
    const sorted = sortLocationResults(results);

    // Hydrate static cards or append new ones
    sorted.forEach(result => {
        const existing = document.querySelector(`[data-slug="${cssEscape(result.slug)}"]`);
        if (existing) {
            hydrateCard(result.slug, result, targetFlavor);
        } else {
            // Location from API not in static HTML — append it
            appendNewCard(result, targetFlavor);
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
    let msgEl = document.getElementById('subscribe-message');
    if (!msgEl) {
        msgEl = document.createElement('div');
        msgEl.id = 'subscribe-message';
        document.getElementById('notif-form').appendChild(msgEl);
    }
    const email = document.getElementById('subscribe-email').value.trim();
    // Read current flavor from DOM at submit time (no global needed)
    const flavorPattern = document.getElementById('flavorSelect').value;

    const checkedBoxes = document.querySelectorAll('#location-checkboxes input[type=checkbox]:checked:not(#loc-all-checkbox)');
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
        const msg = document.createTextNode("✓ You're confirmed! We'll notify you when your flavor is spotted. ");
        const closeBtn = document.createElement('button');
        closeBtn.className = 'banner-close';
        closeBtn.setAttribute('aria-label', 'Dismiss');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', () => banner.remove());
        banner.appendChild(msg);
        banner.appendChild(closeBtn);
        document.querySelector('.container').prepend(banner);
        history.replaceState(null, '', '/');
    }

    initNotificationDialog();
    fetchAllLocations();

    const form = document.getElementById('subscribe-form');
    if (form) form.addEventListener('submit', submitSubscription);

    const select = document.getElementById('flavorSelect');
    if (select) select.addEventListener('change', () => {
        displayResults(select.value);
    });
});

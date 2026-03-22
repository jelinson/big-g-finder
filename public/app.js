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
            <div class="location-name">${escapeHtml(loc.location)}</div>
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

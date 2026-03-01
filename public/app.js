let allLocationData = [];
let currentSearchFlavor = '';

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
        // Default behavior - search for Big G's
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

async function fetchAllLocations() {
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');

    loading.style.display = 'block';
    resultsDiv.innerHTML = '';

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
            error: false
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

        // Populate dropdown
        const select = document.getElementById('flavorSelect');
        select.innerHTML = '';

        const bigGsFlavor = allFlavors.find(f => isTargetFlavor(f, null));

        if (bigGsFlavor) {
            const option = document.createElement('option');
            option.value = bigGsFlavor;
            option.textContent = `${bigGsFlavor} ⭐`;
            option.selected = true;
            select.appendChild(option);
            currentSearchFlavor = bigGsFlavor;
        } else {
            const option = document.createElement('option');
            option.value = "Big G's Cookies & Dream";
            option.textContent = "Big G's Cookies & Dream ⭐";
            option.selected = true;
            select.appendChild(option);
            currentSearchFlavor = "Big G's Cookies & Dream";
        }

        allFlavors.forEach(flavor => {
            if (flavor !== bigGsFlavor) {
                const option = document.createElement('option');
                option.value = flavor;
                option.textContent = flavor;
                select.appendChild(option);
            }
        });

        // Build location checkboxes for subscription form
        const checkboxGrid = document.getElementById('location-checkboxes');
        allLocationData.forEach(loc => {
            const label = document.createElement('label');
            label.className = 'checkbox-label';
            label.innerHTML = `<input type="checkbox" name="location" value="${loc.slug}"> ${loc.location}`;
            checkboxGrid.appendChild(label);
        });

        if (bigGsFlavor) {
            displayResults(bigGsFlavor);
        } else {
            currentSearchFlavor = "Big G's Cookies & Dream";
            const results = allLocationData.map(ld => ({
                location: ld.location, address: ld.address, url: ld.url,
                found: false, flavorName: null, error: false
            }));

            loading.style.display = 'none';

            let html = `
                <div class="summary">
                    <span class="emoji">😢</span>
                    Big G's Cookies & Dream is not currently available at any location
                    <div class="selector-container">
                        <label for="flavorSelectVisible" class="selector-label">Choose a different flavor, I guess:</label>
                        <select id="flavorSelectVisible" class="flavor-select" onchange="selectFlavorFromVisible()">
                            ${select.innerHTML}
                        </select>
                    </div>
                </div>
            `;
            html += '<div class="results-grid">';
            results.forEach(result => {
                html += `
                    <a href="${result.url}" target="_blank" class="result-card-link">
                        <div class="result-card not-found">
                            <div class="location-name">${result.location}</div>
                            <div class="location-address">${result.address}</div>
                            <span class="status not-found">✗ Not Available</span>
                        </div>
                    </a>
                `;
            });
            html += '</div>';
            resultsDiv.innerHTML = html;
            showSubscribeSection(currentSearchFlavor);
        }

    } catch (error) {
        console.error('Error loading flavors:', error);
        loading.style.display = 'none';
        const errorText = document.createTextNode(error.message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.innerHTML = 'Oops! Something went wrong while loading flavors. Please refresh the page.<br><br>Error: ';
        errorDiv.appendChild(errorText);
        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(errorDiv);
    }
}

function selectFlavorFromVisible() {
    const visibleSelect = document.getElementById('flavorSelectVisible');
    const hiddenSelect = document.getElementById('flavorSelect');
    if (visibleSelect && hiddenSelect) {
        hiddenSelect.value = visibleSelect.value;
        searchForFlavor();
    }
}

function searchForFlavor() {
    const select = document.getElementById('flavorSelect');
    const selectedFlavor = select.value;
    if (!selectedFlavor) return;
    currentSearchFlavor = selectedFlavor;
    displayResults(selectedFlavor);
}

function displayResults(targetFlavor) {
    const loading = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    const hiddenSelect = document.getElementById('flavorSelect');

    loading.style.display = 'none';

    const isBigGs = isTargetFlavor(targetFlavor, null) || targetFlavor === "Big G's Cookies & Dream";

    const results = allLocationData.map(locationData => {
        const found = locationData.flavors.some(f => normalizeFlavorName(f) === normalizeFlavorName(targetFlavor));
        return {
            location: locationData.location,
            address: locationData.address,
            url: locationData.url,
            found,
            flavorName: found ? targetFlavor : null,
            error: locationData.error
        };
    });

    const foundLocations = results.filter(r => r.found);

    let html = '';

    if (foundLocations.length > 0) {
        const summaryText = isBigGs
            ? `Found at ${foundLocations.length} location${foundLocations.length > 1 ? 's' : ''}!`
            : `${targetFlavor} found at ${foundLocations.length} location${foundLocations.length > 1 ? 's' : ''}!`;
        html += `
            <div class="summary">
                <span class="emoji">🎉</span>
                ${summaryText}
                <div class="selector-container">
                    <label for="flavorSelectVisible" class="selector-label">Choose a different flavor, I guess:</label>
                    <select id="flavorSelectVisible" class="flavor-select" onchange="selectFlavorFromVisible()">
                        ${hiddenSelect.innerHTML}
                    </select>
                    <p class="subscribe-hint">↓ Get notified for this flavor below</p>
                </div>
            </div>
        `;
    } else {
        const summaryText = isBigGs
            ? `Big G's Cookies & Dream is not currently available at any location`
            : `${targetFlavor} is not currently available at any location`;
        html += `
            <div class="summary">
                <span class="emoji">😢</span>
                ${summaryText}
                <div class="selector-container">
                    <label for="flavorSelectVisible" class="selector-label">Choose a different flavor, I guess:</label>
                    <select id="flavorSelectVisible" class="flavor-select" onchange="selectFlavorFromVisible()">
                        ${hiddenSelect.innerHTML}
                    </select>
                    <p class="subscribe-hint">↓ Get notified for this flavor below</p>
                </div>
            </div>
        `;
    }

    html += '<div class="results-grid">';
    results.forEach(result => {
        const cardClass = result.found ? 'found' : 'not-found';
        const statusText = result.found ? '✓ Available' : '✗ Not Available';
        const flavorTextFragment = result.found ? `#:~:text=${encodeURIComponent(targetFlavor)}` : '';
        const locationUrl = result.url + flavorTextFragment;

        html += `
            <a href="${locationUrl}" target="_blank" class="result-card-link">
                <div class="result-card ${cardClass}">
                    <div class="location-name">${result.location}</div>
                    <div class="location-address">${result.address}</div>
                    <span class="status ${cardClass}">${statusText}</span>
                </div>
            </a>
        `;
    });
    html += '</div>';

    resultsDiv.innerHTML = html;

    const newVisibleSelect = document.getElementById('flavorSelectVisible');
    if (newVisibleSelect) newVisibleSelect.value = targetFlavor;

    showSubscribeSection(targetFlavor);
}

function showSubscribeSection(flavor) {
    const section = document.getElementById('subscribe-section');
    const display = document.getElementById('subscribe-flavor-display');
    if (section && display) {
        display.textContent = flavor;
        section.style.display = 'block';
    }
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

// Show ?subscribed=1 banner
window.addEventListener('DOMContentLoaded', () => {
    if (new URLSearchParams(location.search).get('subscribed') === '1') {
        const banner = document.createElement('div');
        banner.className = 'subscribed-banner';
        banner.innerHTML = '✓ You\'re subscribed! Check your email to confirm. <button class="banner-close" onclick="this.parentElement.remove()" aria-label="Dismiss">×</button>';
        document.querySelector('.container').prepend(banner);
        // Clean up URL
        history.replaceState(null, '', '/');
    }
    fetchAllLocations();
});

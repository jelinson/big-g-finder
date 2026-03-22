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

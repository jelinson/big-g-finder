// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildScaffold } from './helpers/scaffold.js';

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
  document.body.innerHTML = buildScaffold();

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
